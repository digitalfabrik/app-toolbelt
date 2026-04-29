import { Command } from 'commander'
import { authenticate, createGithubRelease, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'
import { Platform } from '../constants.js'

export type GithubReleaseOptions = GithubAuthenticationParams & {
  productionRelease: boolean
  releaseNotes?: string
  hotfix: boolean
  branch?: string
}

export default (parent: Command) => {
  const command = parent
    .description('creates a new release for the specified platform')
    .command('create <platform> <new-version-name> <new-version-code>')
    .option('--production-release', 'Whether this is a production or a pre-release.', false)
    .option('--release-notes <release-notes>', 'The release notes as JSON string, will be auto-generated otherwise.')
    .option('--hotfix', 'Generate release notes only from changes since the branch was cut.', false)
    .option('--branch <branch>', 'The current branch, required when --hotfix is set.')
    .action(
      async (platform: Platform, newVersionName: string, newVersionCode: string, options: GithubReleaseOptions) => {
        try {
          const versionCode = parseInt(newVersionCode, 10)
          if (Number.isNaN(versionCode)) {
            throw new Error(`Failed to parse version code string: ${newVersionCode}`)
          }

          if (options.hotfix && !options.branch) {
            throw new Error('--branch is required when --hotfix is set.')
          }

          const appOctokit = await authenticate(options)

          await createGithubRelease(platform, newVersionName, versionCode, appOctokit, options)
        } catch (e) {
          console.error(e)
          process.exit(1)
        }
      },
    )
  return withGithubAuthentication(command)
}
