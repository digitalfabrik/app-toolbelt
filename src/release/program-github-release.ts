import { Command } from 'commander'
import { authenticate, createGithubRelease } from '../github'

export default (parent: Command) =>
  parent
    .command('create <platform> <new-version-name> <new-version-code>')
    .requiredOption(
      '--deliverino-private-key <deliverino-private-key>',
      'private key of the deliverino github app in pem format with base64 encoding'
    )
    .requiredOption('--owner <owner>', 'owner of the current repository, usually "Integreat"')
    .requiredOption('--repo <repo>', 'the current repository, should be integreat-app')
    .option('--production-release', 'whether this is a production release or not. If unset false')
    .option(
      '--should-use-predefined-release-notes',
      'whether predefined release notes should be used or not. Release notes have to be passed if set. If unset false'
    )
    .option(
      '--release-notes <release-notes>',
      'the release notes (for the selected platform) as JSON string. If not defined the release notes will be generated'
    )
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

        await createGithubRelease(
          platform,
          newVersionName,
          newVersionCode,
          appOctokit,
          options.owner,
          options.repo,
          options.productionRelease,
          options.shouldUsePredefinedReleaseNotes,
          options.releaseNotes
        )
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
