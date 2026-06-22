import { Command } from 'commander'
import {
  authenticate,
  commitVersion,
  createTag,
  GithubAuthenticationParams,
  withGithubAuthentication,
} from '../github.js'
import { MAIN_BRANCH } from '../release-notes/constants.js'

type GithubBumpVersionOptions = GithubAuthenticationParams & {
  branch: string
  tagOnly: boolean
  hotfix: boolean
}

const getCommitSha = async (
  tagOnly: boolean,
  newVersionName: string,
  newVersionCode: string | undefined,
  owner: string,
  repo: string,
  branch: string,
  appOctokit: Awaited<ReturnType<typeof authenticate>>,
): Promise<{ commitSha: string; versionCode: number | undefined }> => {
  const versionCode = newVersionCode !== undefined ? parseInt(newVersionCode, 10) : undefined
  if (Number.isNaN(versionCode)) {
    throw new Error(`Failed to parse version code string: ${newVersionCode}`)
  }

  if (tagOnly) {
    const commitSha = (await appOctokit.repos.getBranch({ owner, repo, branch })).data.commit.sha
    return { commitSha, versionCode }
  }
  const commitSha = await commitVersion(newVersionName, versionCode, owner, repo, branch, appOctokit)
  if (!commitSha) {
    throw new Error('Failed to commit!')
  }
  return { commitSha, versionCode }
}

export default (parent: Command) => {
  const command = parent
    .command('bump-to <new-version-name> [new-version-code]')
    .description('Bump and tag the latest version')
    .requiredOption('--branch <branch>', 'the current branch')
    .option('--tag-only', 'Only tag the latest commit instead of bumping the version.', false)
    .option('--hotfix', 'Also bump the version on the main branch.', false)
    .action(async (newVersionName, newVersionCode: string | undefined, options: GithubBumpVersionOptions) => {
      try {
        const { tagOnly, hotfix, owner, repo, branch } = options
        const appOctokit = await authenticate(options)

        if (hotfix && (tagOnly || branch === MAIN_BRANCH)) {
          throw new Error('--hotfix cannot be used on the main branch or together with the --tag-only option.')
        }

        const { commitSha, versionCode } = await getCommitSha(
          tagOnly,
          newVersionName,
          newVersionCode,
          owner,
          repo,
          branch,
          appOctokit,
        )
        const tagMessage = versionCode !== undefined ? `${newVersionName} (${versionCode})` : newVersionName
        await createTag(newVersionName, tagMessage, owner, repo, commitSha, appOctokit)

        if (hotfix) {
          await commitVersion(newVersionName, versionCode, owner, repo, MAIN_BRANCH, appOctokit)
        }
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
