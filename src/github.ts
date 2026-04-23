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

/**
 * Walks the branch commits newest-first and finds the first commit whose parent
 * is a tagged commit. That parent is the commit the branch was cut from.
 */
const findPreviousTagForBranch = async (
  owner: string,
  repo: string,
  branch: string,
  appOctokit: Octokit,
): Promise<string> => {
  const [commits, tags] = await Promise.all([
    appOctokit.repos.listCommits({ owner, repo, sha: branch, per_page: 100 }),
    appOctokit.repos.listTags({ owner, repo, per_page: 100 }),
  ])

  const tagsBySha = new Map(tags.data.map(tag => [tag.commit.sha, tag.name]))

  const tagName = commits.data
    .flatMap(commit => commit.parents)
    .map(parent => tagsBySha.get(parent.sha))
    .find(Boolean)

  if (!tagName) {
    throw new Error(`Could not find a tag in the commit history of branch ${branch}`)
  }
  return tagName
}

const getGithubApiUrlForReleaseNotes = (owner: string, repo: string): string =>
  `POST /repos/${owner}/${repo}/releases/generate-notes`

/**
 * For hotfixes we only get a list of commits since previous tag
 * We try to group the commits via prefix/issue nr. If thats not possible we show them ungrouped.
 */

const groupReleaseNotesByIssue = async (
  releaseNotes: string,
  owner: string,
  repo: string,
  appOctokit: Octokit,
): Promise<string> => {
  const lines = releaseNotes.split('\n')
  const commitMessagePattern = /^\* (\d+):/
  const issueNumbers = [
    ...new Set(lines.map(line => line.match(commitMessagePattern)?.[1]).filter((it): it is string => it !== undefined)),
  ]

  return issueNumbers.length === 0
    ? releaseNotes
    : [
        // Issues grouped by commit message
        ...(await Promise.all(
          issueNumbers.map(async issueNumber => {
            const { data: issue } = await appOctokit.issues.get({
              owner,
              repo,
              issue_number: parseInt(issueNumber, 10),
            })
            return `* #${issueNumber}: ${issue.title}`
          }),
        )),
        // Ungrouped commits
        ...lines.filter(line => !line.match(commitMessagePattern)),
      ].join('\n')
}

const generateHotfixReleaseNotes = async (
  owner: string,
  repo: string,
  appOctokit: Octokit,
  previousTagName: string,
  branch: string,
): Promise<string> => {
  const comparison = await appOctokit.repos.compareCommits({ owner, repo, base: previousTagName, head: branch })
  const releaseNotes = comparison.data.commits
    .filter(c => c.author?.login !== 'deliverino[bot]')
    .map(c => `* ${c.commit.message.split('\n')[0]}`)
    .join('\n')
  return groupReleaseNotesByIssue(releaseNotes, owner, repo, appOctokit)
}

const generateReleaseNotesFromGithubEndpoint = async (
  owner: string,
  repo: string,
  appOctokit: Octokit,
  tagName: string,
  previousTagName?: string,
  branch?: string,
): Promise<string> => {
  try {
    if (previousTagName && branch) {
      return await generateHotfixReleaseNotes(owner, repo, appOctokit, previousTagName, branch)
    }
    const response = await appOctokit.request(getGithubApiUrlForReleaseNotes(owner, repo), {
      owner,
      repo,
      tag_name: tagName,
      previous_tag_name: previousTagName,
    })
    return (
      response.data.body
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
  const previousTagName = hotfix && branch ? await findPreviousTagForBranch(owner, repo, branch, appOctokit) : undefined
  const releaseNotes =
    suppliedReleaseNotes ??
    (await generateReleaseNotesFromGithubEndpoint(owner, repo, appOctokit, newVersionName, previousTagName, branch))

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
