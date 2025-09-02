import { Command } from 'commander'
import { authenticate, createGithubRelease, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'
import { Platform } from '../constants.js'

export type GithubReleaseOptions = GithubAuthenticationParams & {
  productionRelease: boolean
  releaseNotes?: string
}

export default (parent: Command) => {
  const command = parent
    .description('creates a new release for the specified platform')
    .command('create <platform> <new-version-name> <new-version-code>')
    .option('--production-release', 'whether this is a production release or not. If unset false', false)
    .option(
      '--release-notes <release-notes>',
      'the release notes (for the selected platform) as JSON string. If not defined the release notes will be generated',
    )
    .action(
      async (platform: Platform, newVersionName: string, newVersionCode: string, options: GithubReleaseOptions) => {
        try {
          const versionCode = parseInt(newVersionCode, 10)
          if (Number.isNaN(versionCode)) {
            throw new Error(`Failed to parse version code string: ${newVersionCode}`)
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
