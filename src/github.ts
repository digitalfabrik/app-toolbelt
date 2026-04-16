import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { Platform, PLATFORM_ALL, VERSION_FILE } from './constants.js'
import { GithubReleaseOptions } from './release/program-github-release.js'
import { Command } from 'commander'
import { formatReleaseNotesForMattermost } from './util.js'

// https://github.com/apps/deliverino
const DELIVERINO_APP_ID = '59249'

export type GithubAuthenticationParams = {
  privateKey: string
  owner: string
  repo: string
  githubApp: string
}

export const withGithubAuthentication = (command: Command) =>
  command
    .requiredOption('--private-key <private-key>', 'Github app private key as base64 pem format')
    .requiredOption('--owner <owner>', 'Github owner (e.g. "digitalfabrik")')
    .requiredOption('--repo <repo>', 'Github repository')
    .option('--github-app <github-app>', 'Github app id', DELIVERINO_APP_ID)

export const authenticate = async ({
  privateKey,
  owner,
  repo,
  githubApp,
}: GithubAuthenticationParams): Promise<Octokit> => {
  const decodedPrivateKey = Buffer.from(privateKey, 'base64').toString('ascii')

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: githubApp, privateKey: decodedPrivateKey },
  })
  const {
    data: { id: installationId },
  } = await octokit.apps.getRepoInstallation({ owner, repo })
  const {
    data: { token },
  } = await octokit.apps.createInstallationAccessToken({ installation_id: installationId })

  return new Octokit({ auth: token })
}

export const createTag = async (
  tagName: string,
  tagMessage: string,
  owner: string,
  repo: string,
  commitSha: string,
  appOctokit: Octokit,
) => {
  const tag = await appOctokit.git.createTag({
    owner,
    repo,
    tag: tagName,
    message: tagMessage,
    object: commitSha,
    type: 'commit',
  })
  const tagSha = tag.data.sha
  console.warn(`New tag with name ${tagName} successfully created.`)

  await appOctokit.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tagName}`,
    sha: tagSha,
  })
  console.warn(`New ref with name ${tagName} successfully created.`)
}

export const commitVersion = async (
  versionName: string,
  versionCode: number,
  owner: string,
  repo: string,
  branch: string,
  appOctokit: Octokit,
): Promise<string | undefined> => {
  const versionFileContent = await appOctokit.repos.getContent({ owner, repo, path: VERSION_FILE, ref: branch })

  const contentBase64 = Buffer.from(JSON.stringify({ versionName, versionCode })).toString('base64')

  const commitMessage = `Bump version name to ${versionName} and version code to ${versionCode}\n[skip ci]`

  const commit = await appOctokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: VERSION_FILE,
    content: contentBase64,
    branch,
    message: commitMessage,
    // @ts-expect-error Random typescript error: property sha is not available on type { ..., sha: string, ... }
    sha: versionFileContent.data.sha,
  })
  console.warn(`New version successfully commited with message "${commitMessage}".`)

  return commit.data.commit.sha
}

const findBaseTagForBranch = async (
  owner: string,
  repo: string,
  branch: string,
  appOctokit: Octokit,
): Promise<string> => {
  const comparison = await appOctokit.repos.compareCommits({ owner, repo, base: 'main', head: branch })
  const mergeBaseSha = comparison.data.merge_base_commit.sha

  const tags = await appOctokit.repos.listTags({ owner, repo, per_page: 100 })
  const baseTag = tags.data.find(tag => tag.commit.sha === mergeBaseSha)

  if (!baseTag) {
    throw new Error(`Could not find a tag matching the merge base commit ${mergeBaseSha}`)
  }
  return baseTag.name
}

const getGithubApiUrlForReleaseNotes = (owner: string, repo: string): string =>
  `POST /repos/${owner}/${repo}/releases/generate-notes`

// For hotfixes we only get a list of commits since previous tag
// We try to group the commits via prefix/issue nr. If thats not possible we show them ungrouped.
const groupLinesByIssue = async (
  lines: string[],
  owner: string,
  repo: string,
  appOctokit: Octokit,
): Promise<string[]> => {
  const issueNumbers = [...new Set(lines.map(line => line.match(/^\* (\d+):/)?.[1]).filter(Boolean))] as string[]

  if (issueNumbers.length === 0) {
    return lines
  }

  const ungrouped = lines.filter(line => !line.match(/^\* (\d+):/) && !line.includes('deliverino'))

  const result: string[] = []
  for (const issueNumber of issueNumbers) {
    const { data: issue } = await appOctokit.issues.get({ owner, repo, issue_number: parseInt(issueNumber, 10) })
    result.push(`* #${issueNumber}: ${issue.title}`)
  }
  result.push(...ungrouped)
  return result
}

const generateReleaseNotesFromGithubEndpoint = async (
  owner: string,
  repo: string,
  appOctokit: Octokit,
  tagName: string,
  previousTagName?: string,
  hotfix?: boolean,
): Promise<string> => {
  try {
    const response = await appOctokit.request(getGithubApiUrlForReleaseNotes(owner, repo), {
      owner,
      repo,
      tag_name: tagName,
      ...(previousTagName ? { previous_tag_name: previousTagName } : {}),
    })
    const generatedReleaseNotes = response.data.body
    if (hotfix) {
      return (await groupLinesByIssue(generatedReleaseNotes.split('\n'), owner, repo, appOctokit)).join('\n')
    }
    return (
      generatedReleaseNotes
        .split('\n')
        // Link github issues in PR names
        .map((line: string) => line.replace(/^\* (\d+):/g, `* [#$1](https://github.com/${owner}/${repo}/issues/$1):`))
        .join('\n')
    )
  } catch (e) {
    throw new Error("Couldn't get release notes")
  }
}

export const createGithubRelease = async (
  platform: Platform,
  newVersionName: string,
  newVersionCode: number,
  appOctokit: Octokit,
  options: GithubReleaseOptions,
) => {
  const { owner, repo, productionRelease, releaseNotes: suppliedReleaseNotes, hotfix, branch } = options
  const baseReleaseName = `${newVersionName} (${newVersionCode})`
  const releaseName = platform === PLATFORM_ALL ? baseReleaseName : `[${platform}] ${baseReleaseName}`
  const previousTagName = hotfix && branch ? await findBaseTagForBranch(owner, repo, branch, appOctokit) : undefined
  const releaseNotes =
    suppliedReleaseNotes ??
    (await generateReleaseNotesFromGithubEndpoint(owner, repo, appOctokit, newVersionName, previousTagName, hotfix))

  const release = await appOctokit.repos.createRelease({
    owner,
    repo,
    tag_name: newVersionName,
    prerelease: !productionRelease,
    make_latest: 'true',
    name: releaseName,
    body: releaseNotes,
  })

  console.log(
    JSON.stringify({
      id: release.data.id,
      releaseNotes: formatReleaseNotesForMattermost(releaseNotes).replaceAll('\n', '\\n'),
    }),
  )
}

export const createPullRequestReview = async (
  prNumber: number,
  message: string,
  authenticationParams: GithubAuthenticationParams,
  appOctokit: Octokit,
) => {
  const review = await appOctokit.pulls.createReview({
    owner: authenticationParams.owner,
    repo: authenticationParams.repo,
    pull_number: prNumber,
    event: 'COMMENT',
    body: message,
  })
  console.log(review.status)
}
