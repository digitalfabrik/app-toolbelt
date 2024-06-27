import { Command } from 'commander'
import { authenticate, commitVersion, createTags } from '../github'

export default (parent: Command) =>
  parent
    .command('bump-to <new-version-name> <new-version-code>')
    .requiredOption(
      '--deliverino-private-key <deliverino-private-key>',
      'private key of the deliverino github app in pem format with base64 encoding'
    )
    .requiredOption('--owner <owner>', 'owner of the current repository, usually "Integreat"')
    .requiredOption('--repo <repo>', 'the current repository, should be integreat-app')
    .requiredOption('--branch <branch>', 'the current branch')
    .option('--platform <platform>', 'define a particular platform for the tag. If unset tags for all platforms will be created')
    .description('commits the supplied version name and code to github and tags the commit')
    .action(async (newVersionName, newVersionCode, options: { [key: string]: any }) => {
      try {
        const appOctokit = await authenticate({
          deliverinoPrivateKey: options.deliverinoPrivateKey,
          owner: options.owner,
          repo: options.repo
        })

        const versionCode = parseInt(newVersionCode, 10)
        if (Number.isNaN(versionCode)) {
          throw new Error(`Failed to parse version code string: ${newVersionCode}`)
        }

        const commitSha = await commitVersion(
          newVersionName,
          versionCode,
          options.owner,
          options.repo,
          options.branch,
          appOctokit
        )

        if (!commitSha) {
          throw new Error(`Failed to commit!`)
        }

        await createTags(newVersionName, versionCode, commitSha, options.owner, options.repo, appOctokit, options.platform)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
