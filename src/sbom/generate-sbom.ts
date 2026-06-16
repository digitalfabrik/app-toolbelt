import { Command } from 'commander'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

type CommitSbomOptions = GithubAuthenticationParams & {
  repoPath: string
  branch: string
  versionName: string
  sourceName: string
}

export default (parent: Command) => {
  const command = parent
    .description('Generate an SBOM using syft and commit it to the repository')
    .command('sbom')
    .requiredOption('--repo-path <repo-path>', 'Path where the SBOM file will be stored in the repository')
    .requiredOption('--branch <branch>', 'The branch to commit the SBOM to')
    .requiredOption('--version-name <version-name>', 'The version name for the commit message')
    .requiredOption('--source-name <source-name>', 'The source name for the SBOM (SYFT_SOURCE_NAME)')
    .action(async (options: CommitSbomOptions) => {
      try {
        const { repoPath, branch, versionName, sourceName, owner, repo } = options

        const tmpFile = path.join(os.tmpdir(), 'manifest.spdx.json')
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
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
