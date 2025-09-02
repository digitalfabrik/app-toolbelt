import { Command } from 'commander'
import { authenticate, createGithubRelease, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

export type GithubReleaseOptions = GithubAuthenticationParams & {
  productionRelease: boolean
  shouldUsePredefinedReleaseNotes: boolean
  releaseNotes?: string
}

export default (parent: Command) => {
  const command = parent
    .description('creates a new release for the specified platform')
    .command('create <platform> <new-version-name> <new-version-code>')
    .option('--production-release', 'whether this is a production release or not. If unset false', false)
    .option(
      '--should-use-predefined-release-notes',
      'whether predefined release notes should be used or not. Release notes have to be passed if set. If unset false',
      false,
    )
    .option(
      '--release-notes <release-notes>',
      'the release notes (for the selected platform) as JSON string. If not defined the release notes will be generated',
    )
    .action(async (platform, newVersionName, newVersionCode, options: GithubReleaseOptions) => {
      try {
        const versionCode = parseInt(newVersionCode, 10)
        if (Number.isNaN(versionCode)) {
          throw new Error(`Failed to parse version code string: ${newVersionCode}`)
        }

        const appOctokit = await authenticate(options)

        await createGithubRelease(platform, newVersionName, newVersionCode, appOctokit, options)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
