import { Command } from 'commander'
import {
  authenticate,
  commitVersion,
  createTags,
  GithubAuthenticationParams,
  withGithubAuthentication,
} from '../github.js'
import { getPlatformsFromString } from '../util.js'

type GithubBumpVersionOptions = GithubAuthenticationParams & {
  platforms?: string
  branch: string
}

export default (parent: Command) => {
  const command = parent
    .description('commits the supplied version name and code to github and tags the commit')
    .command('bump-to <new-version-name> <new-version-code>')
    .requiredOption('--branch <branch>', 'the current branch')
    .option(
      '--platforms <platforms>',
      'define the platforms separated by slash for the tags f.e. "native/web". If unset tags for all platforms will be created',
    )
    .action(async (newVersionName, newVersionCode, options: GithubBumpVersionOptions) => {
      try {
        const appOctokit = await authenticate(options)

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
          appOctokit,
        )

        if (!commitSha) {
          throw new Error(`Failed to commit!`)
        }

        const platforms = getPlatformsFromString(options.platforms)

        await createTags(newVersionName, versionCode, commitSha, options.owner, options.repo, appOctokit, platforms)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
