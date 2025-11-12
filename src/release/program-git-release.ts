import { Command } from 'commander'
import {
  authenticate,
  commitVersion,
  createTag,
  GithubAuthenticationParams,
  withGithubAuthentication,
} from '../github.js'

type GithubBumpVersionOptions = GithubAuthenticationParams & {
  branch: string
  tagOnly: boolean
}

export default (parent: Command) => {
  const command = parent
    .description('Bump and tag the latest version')
    .command('bump-to <new-version-name> <new-version-code>')
    .requiredOption('--branch <branch>', 'the current branch')
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
        const tagMessage = `${newVersionName} (${versionCode})`
        await createTag(newVersionName, tagMessage, owner, repo, commitSha, appOctokit)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
