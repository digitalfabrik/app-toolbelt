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
  tagOnly: boolean
}

export default (parent: Command) => {
  const command = parent
    .description('Bump and tag the latest version')
    .command('bump-to <new-version-name> <new-version-code>')
    .requiredOption('--branch <branch>', 'the current branch')
    .option(
      '--platforms <platforms>',
      'define the platforms separated by slash for the tags f.e. "native/web". If unset tags for all platforms will be created',
    )
    .option('--tag-only', 'Only tag the latest commit instead of bumping the version.', false)
    .action(async (newVersionName, newVersionCode, options: GithubBumpVersionOptions) => {
      try {
        const { tagOnly, owner, repo, branch } = options
        const appOctokit = await authenticate(options)

        const versionCode = parseInt(newVersionCode, 10)
        if (Number.isNaN(versionCode)) {
          throw new Error(`Failed to parse version code string: ${newVersionCode}`)
        }

        const commitSha = tagOnly
          ? (await appOctokit.repos.getBranch({ owner, repo, branch })).data.commit.sha
          : await commitVersion(newVersionName, versionCode, owner, repo, branch, appOctokit)

        if (!commitSha) {
          throw new Error(`Failed to commit!`)
        }

        const platforms = getPlatformsFromString(options.platforms)

        await createTags(newVersionName, versionCode, commitSha, owner, repo, appOctokit, platforms)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
