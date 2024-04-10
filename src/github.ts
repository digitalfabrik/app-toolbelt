import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { Platform, PLATFORMS, VERSION_FILE } from './constants'

export const authenticate = async ({
  deliverinoPrivateKey,
  owner,
  repo
}: {
  deliverinoPrivateKey: string
  owner: string
  repo: string
}): Promise<Octokit> => {
  const appId = 59249 // https://github.com/apps/deliverino
  const privateKey = Buffer.from(deliverinoPrivateKey, 'base64').toString('ascii')

  const octokit = new Octokit({ authStrategy: createAppAuth, auth: { appId, privateKey } })
  const {
    data: { id: installationId }
  } = await octokit.apps.getRepoInstallation({ owner, repo })
  const {
    data: { token }
  } = await octokit.apps.createInstallationAccessToken({ installation_id: installationId })

  return new Octokit({ auth: token })
}

type ReleaseInformation = {
  platform: typeof PLATFORMS[number]
  versionName: string
}

export const versionTagName = ({ platform, versionName }: ReleaseInformation): string => `${versionName}-${platform}`

const createTag = async (
  tagName: string,
  tagMessage: string,
  owner: string,
  repo: string,
  commitSha: string,
  appOctokit: Octokit
) => {
  const tag = await appOctokit.git.createTag({
    owner,
    repo,
    tag: tagName,
    message: tagMessage,
    object: commitSha,
    type: 'commit'
  })
  const tagSha = tag.data.sha
  console.warn(`New tag with name ${tagName} successfully created.`)

  await appOctokit.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tagName}`,
    sha: tagSha
  })
  console.warn(`New ref with name ${tagName} successfully created.`)
}

export const commitVersion = async (
  versionName: string,
  versionCode: number,
  owner: string,
  repo: string,
  branch: string,
  appOctokit: Octokit
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
    sha: versionFileContent.data.sha
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
  appOctokit: Octokit
) => {
  await Promise.all(
    PLATFORMS.map(platform => {
      const tagName = versionTagName({ versionName, platform })
      const tagMessage = `[${platform}] ${versionName} - ${versionCode}`
      return createTag(tagName, tagMessage, owner, repo, commitSha!, appOctokit)
    })
  )
}

const generateReleaseNotes = async (
  owner: string,
  repo: string,
  appOctokit: Octokit,
  tagName: string
): Promise<string> => {
  try {
    const response = await appOctokit.request(`POST /repos/${owner}/${repo}/releases/generate-notes`, {
      owner,
      repo,
      tag_name: tagName,
      target_commitish: 'main',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
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
  owner: string,
  repo: string,
  prerelease: string,
  appOctokit: Octokit,
  predefinedReleaseNotes?: string
) => {
  const releaseName = `[${platform}] ${newVersionName} - ${newVersionCode}`
  const tagName = versionTagName({ versionName: newVersionName, platform })

  await appOctokit.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    prerelease: prerelease === 'true',
    make_latest: platform === 'android' ? 'true' : 'false',
    name: releaseName,
    body: predefinedReleaseNotes ?? (await generateReleaseNotes(owner, repo, appOctokit, tagName))
  })
}
