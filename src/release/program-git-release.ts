import { Command } from 'commander'
import {
  authenticate,
  commitVersion,
  createTag,
  GithubAuthenticationParams,
  withGithubAuthentication,
} from '../github.js'

const MAIN_BRANCH = 'main'

type GithubBumpVersionOptions = GithubAuthenticationParams & {
  branch: string
  tagOnly: boolean
  hotfix: boolean
}

export default (parent: Command) => {
  const command = parent
    .description('Bump and tag the latest version')
    .command('bump-to <new-version-name> <new-version-code>')
    .requiredOption('--branch <branch>', 'the current branch')
    .option('--tag-only', 'Only tag the latest commit instead of bumping the version.', false)
    .option('--hotfix', 'Also bump the version on the main branch.', false)
    .action(async (newVersionName, newVersionCode, options: GithubBumpVersionOptions) => {
      try {
        const { tagOnly, hotfix, owner, repo, branch } = options
        const appOctokit = await authenticate(options)

        const versionCode = parseInt(newVersionCode, 10)
        if (Number.isNaN(versionCode)) {
          throw new Error(`Failed to parse version code string: ${newVersionCode}`)
        }

        if (hotfix && !tagOnly && branch === MAIN_BRANCH) {
          throw new Error('--hotfix cannot be used on the main branch.')
        }

        const commitSha = tagOnly
          ? (await appOctokit.repos.getBranch({ owner, repo, branch })).data.commit.sha
          : await commitVersion(newVersionName, versionCode, owner, repo, branch, appOctokit)

        if (!commitSha) {
          throw new Error(`Failed to commit!`)
        }
        const tagMessage = `${newVersionName} (${versionCode})`
        await createTag(newVersionName, tagMessage, owner, repo, commitSha, appOctokit)

        if (hotfix && !tagOnly) {
          await commitVersion(newVersionName, versionCode, owner, repo, MAIN_BRANCH, appOctokit)
        }
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
