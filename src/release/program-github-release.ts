import { Command } from 'commander'
import { authenticate, createGithubRelease } from '../github'

export default (parent: Command) => parent
  .command('create <platform> <new-version-name> <new-version-code>')
  .requiredOption(
    '--deliverino-private-key <deliverino-private-key>',
    'private key of the deliverino github app in pem format with base64 encoding'
  )
  .requiredOption('--owner <owner>', 'owner of the current repository, usually "Integreat"')
  .requiredOption('--repo <repo>', 'the current repository, should be integreat-app')
  .requiredOption('--release-notes <release-notes>', 'the release notes (for the selected platform) as JSON string')
  .option('--download-links <download-links>', 'the download links of the artifacts (for the selected platform)')
  .option('--development-release', 'whether the release is a development release which is not delivered to production')
  .option('--dry-run', 'dry run without actually creating a release on github')
  .description('creates a new release for the specified platform')
  .action(async (platform, newVersionName, newVersionCode, options: { [key: string]: any }) => {
    try {
      const versionCode = parseInt(newVersionCode, 10)
      if (Number.isNaN(versionCode)) {
        throw new Error(`Failed to parse version code string: ${newVersionCode}`)
      }

      const appOctokit = await authenticate({
        deliverinoPrivateKey: options.deliverinoPrivateKey,
        owner: options.owner,
        repo: options.repo
      })

      await createGithubRelease(platform, newVersionName, newVersionCode,
        options.owner,
        options.repo,
        options.developmentRelease,
        options.downloadLinks,
        options.releaseNotes,
        options.dryRun,
        appOctokit
      )
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  })
