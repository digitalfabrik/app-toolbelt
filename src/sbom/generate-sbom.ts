import { Command } from 'commander'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

type CommitSbomOptions = GithubAuthenticationParams & {
  repoPath?: string
  branch?: string
  versionName: string
  sourceName: string
  releaseId?: number
}

export default (parent: Command) => {
  const command = parent
    .description('Generate an SBOM using syft and commit it to the repository or/and uploads it to a GitHub release')
    .command('sbom')
    .requiredOption('--version-name <version-name>', 'The version name for the commit message')
    .requiredOption('--source-name <source-name>', 'The source name for the SBOM (SYFT_SOURCE_NAME)')
    .option(
      '--repo-path <repo-path>',
      'Path with filename where the SBOM file will be stored in the repository. If omitted, the SBOM will not be committed.',
    )
    .option('--branch <branch>', 'The branch to commit the SBOM to. Required when --repo-path is set.')
    .option('--release-id <release-id>', 'If provided, the SBOM will also be uploaded to this GitHub release.')
    .action(async (options: CommitSbomOptions) => {
      const { repoPath, branch, versionName, sourceName, releaseId, owner, repo } = options

      if (!releaseId && !repoPath && !branch) {
        console.log('Either --release-id or --repo-path and --branch must be set.')
        return
      }

      try {
        const fileName = repoPath ? path.basename(repoPath) : 'manifest.spdx.json'
        const tmpFile = path.join(os.tmpdir(), fileName)
        const env = {
          ...process.env,
          SYFT_SOURCE_VERSION: versionName,
          SYFT_SOURCE_NAME: sourceName,
          SYFT_FORMAT_SPDX_JSON_PRETTY: 'true',
        }

        try {
          execSync('syft version', { stdio: 'ignore' })
        } catch {
          console.log('syft not found, installing...')
          execSync('curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin', { stdio: 'inherit' })
        }

        console.log(`Generating SBOM for ${sourceName}@${versionName}`)
        execSync(`syft scan . -o spdx-json=${tmpFile}`, { env, stdio: 'inherit' })

        const appOctokit = await authenticate(options)

        if (repoPath && branch) {
          const contentBase64 = fs.readFileSync(tmpFile).toString('base64')

          let sha: string | undefined
          try {
            const existing = await appOctokit.repos.getContent({ owner, repo, path: repoPath, ref: branch })
            if (!Array.isArray(existing.data)) {
              sha = existing.data.sha
            }
          } catch (e) {
            console.error(e)
          }

          await appOctokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: repoPath,
            branch,
            message: `Add SBOM for ${versionName}\n[skip ci]`,
            content: contentBase64,
            ...(sha ? { sha } : {}),
          })

          console.log(`SBOM committed to ${repoPath} on ${branch}`)
        }

        if (releaseId) {
          const fileData = fs.readFileSync(tmpFile)
          await appOctokit.rest.repos.uploadReleaseAsset({
            owner,
            repo,
            release_id: releaseId,
            name: 'manifest.spdx.json',
            data: fileData as unknown as string,
          })
          console.log('SBOM uploaded to release')
        }
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
