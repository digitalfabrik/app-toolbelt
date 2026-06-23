import { Command } from 'commander'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import nodePath from 'node:path'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

const SBOM_ASSET_NAME = 'manifest.spdx.json'

const ensureSyftInstalled = () => {
  try {
    execSync('syft version', { stdio: 'ignore' })
  } catch {
    if (!process.env['CI']) {
      throw new Error(
        'syft is not installed or not in PATH. Please install it manually, e.g. via brew install syft or mise use syft.',
      )
    }
    console.log('syft not found, installing...')
    execSync('curl -sSfL https://get.anchore.io/syft | sh -s -- -b /usr/local/bin', { stdio: 'inherit' })
  }
}

const generateSbomFile = (sourceName: string, versionName: string): string => {
  const tmpFile = nodePath.join(os.tmpdir(), SBOM_ASSET_NAME)
  console.log(`Generating SBOM for ${sourceName}@${versionName}`)
  execSync(`syft scan . -o spdx-json=${tmpFile}`, {
    env: {
      ...process.env,
      SYFT_SOURCE_VERSION: versionName,
      SYFT_SOURCE_NAME: sourceName,
      SYFT_FORMAT_SPDX_JSON_PRETTY: 'true',
    },
    stdio: 'inherit',
  })
  return tmpFile
}

type GenerateSbomOptions = GithubAuthenticationParams & {
  path?: string
  branch?: string
  versionName?: string
  releaseId?: number
}

export default (parent: Command) => {
  const command = parent
    .command('sbom')
    .description('Generate an SBOM using syft and commit it to the repository and/or upload it to a GitHub release')
    .option('--version-name <version-name>', 'The version name for the commit message')
    .option(
      '--path <path>',
      'Path with filename where the SBOM file will be stored in the repository. If omitted, the SBOM will not be committed.',
    )
    .option('--branch <branch>', 'The branch to commit the SBOM to. Required when --repo-path is set.')
    .option('--release-id <release-id>', 'If provided, the SBOM will also be uploaded to this GitHub release.')
    .action(async (options: GenerateSbomOptions) => {
      const { path, branch, versionName, releaseId, owner, repo } = options

      if (Boolean(path) !== Boolean(branch) || Boolean(path) !== Boolean(versionName)) {
        console.error('--path, --branch and --version-name must be set together.')
        process.exit(1)
      }
      if (!releaseId && !path) {
        console.error('Either --release-id or each of --path, --branch and --version-name must be provided.')
        process.exit(1)
      }

      try {
        ensureSyftInstalled()
        const tmpFile = generateSbomFile(repo, versionName!)

        const appOctokit = await authenticate(options)

        if (path && branch) {
          const contentBase64 = fs.readFileSync(tmpFile).toString('base64')

          let sha: string | undefined
          try {
            const existing = await appOctokit.repos.getContent({ owner, repo, path: path, ref: branch })
            if (!Array.isArray(existing.data)) {
              sha = existing.data.sha
            }
          } catch (e) {
            console.error(e)
          }

          await appOctokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            branch,
            message: `Add SBOM for ${versionName}\n[skip ci]`,
            content: contentBase64,
            ...(sha ? { sha } : {}),
          })

          console.log(`SBOM committed to ${path} on ${branch}`)
        }

        if (releaseId) {
          const fileData = fs.readFileSync(tmpFile)
          await appOctokit.rest.repos.uploadReleaseAsset({
            owner,
            repo,
            release_id: releaseId,
            name: 'sbom.spdx.json',
            data: fileData.toString(),
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
