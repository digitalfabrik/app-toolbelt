import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { Platform, PLATFORM_ALL, PLATFORMS_FLAGGED_LATEST, VERSION_FILE } from './constants.js'
import { GithubReleaseOptions } from './release/program-github-release.js'
import { Command } from 'commander'

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

const getGithubApiUrlForReleaseNotes = (owner: string, repo: string): string =>
  `POST /repos/${owner}/${repo}/releases/generate-notes`

const generateReleaseNotesFromGithubEndpoint = async (
  owner: string,
  repo: string,
  appOctokit: Octokit,
  tagName: string,
): Promise<string> => {
  try {
    const response = await appOctokit.request(getGithubApiUrlForReleaseNotes(owner, repo), {
      owner,
      repo,
      tag_name: tagName,
    })
    return response.data.body
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
  const { owner, repo, productionRelease, releaseNotes } = options
  const baseReleaseName = `${newVersionName} (${newVersionCode})`
  const releaseName = platform === PLATFORM_ALL ? baseReleaseName : `[${platform}] ${baseReleaseName}`

  const release = await appOctokit.repos.createRelease({
    owner,
    repo,
    tag_name: newVersionName,
    prerelease: !productionRelease,
    make_latest: productionRelease && PLATFORMS_FLAGGED_LATEST.includes(platform) ? 'true' : 'false',
    name: releaseName,
    body: releaseNotes ?? (await generateReleaseNotesFromGithubEndpoint(owner, repo, appOctokit, newVersionName)),
  })
  console.log(release.data.id)
}
