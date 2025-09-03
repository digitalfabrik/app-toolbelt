import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { Platform, PLATFORMS, VERSION_FILE } from './constants.js'
import { GithubReleaseOptions } from './release/program-github-release.js'
import { Command } from 'commander'

export type GithubAuthenticationParams = {
  deliverinoPrivateKey: string
  owner: string
  repo: string
}

export const withGithubAuthentication = (command: Command) =>
  command
    .requiredOption(
      '--deliverino-private-key <deliverino-private-key>',
      'Private key of the github app as base64 pem format',
    )
    .requiredOption('--owner <owner>', 'Github owner (e.g. "digitalfabrik")')
    .requiredOption('--repo <repo>', 'Github repository')

export const authenticate = async ({
  deliverinoPrivateKey,
  owner,
  repo,
}: GithubAuthenticationParams): Promise<Octokit> => {
  const appId = 59249 // https://github.com/apps/deliverino
  const privateKey = Buffer.from(deliverinoPrivateKey, 'base64').toString('ascii')

  const octokit = new Octokit({ authStrategy: createAppAuth, auth: { appId, privateKey } })
  const {
    data: { id: installationId },
  } = await octokit.apps.getRepoInstallation({ owner, repo })
  const {
    data: { token },
  } = await octokit.apps.createInstallationAccessToken({ installation_id: installationId })

  return new Octokit({ auth: token })
}

type ReleaseInformation = {
  platform: (typeof PLATFORMS)[number]
  versionName: string
}

export const versionTagName = ({ platform, versionName }: ReleaseInformation): string => `${versionName}-${platform}`

const createTag = async (
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

export const createTags = async (
  versionName: string,
  versionCode: number,
  commitSha: string,
  owner: string,
  repo: string,
  appOctokit: Octokit,
  predefinedPlatforms?: Platform[],
) => {
  const platforms = predefinedPlatforms ? predefinedPlatforms : PLATFORMS
  await Promise.all(
    platforms.map(platform => {
      const tagName = versionTagName({ versionName, platform })
      const tagMessage = `[${platform}] ${versionName} - ${versionCode}`
      return createTag(tagName, tagMessage, owner, repo, commitSha!, appOctokit)
    }),
  )
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
  const { owner, repo, productionRelease, shouldUsePredefinedReleaseNotes, releaseNotes } = options
  const releaseName = `[${platform}] ${newVersionName} - ${newVersionCode}`
  const tagName = versionTagName({ versionName: newVersionName, platform })

  const release = await appOctokit.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    prerelease: !productionRelease,
    make_latest: platform === 'android' ? 'true' : 'false',
    name: releaseName,
    body:
      shouldUsePredefinedReleaseNotes && releaseNotes
        ? releaseNotes
        : await generateReleaseNotesFromGithubEndpoint(owner, repo, appOctokit, tagName),
  })
  console.log(release.data.id)
}
