import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { MAIN_BRANCH, Platform, PLATFORMS, VERSION_FILE } from './constants'

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
  if (branch !== MAIN_BRANCH) {
    throw new Error(`Version bumps are only allowed on the ${MAIN_BRANCH} branch!`)
  }

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

export const createGithubRelease = async (
  platform: Platform,
  newVersionName: string,
  newVersionCode: number,
  owner: string,
  repo: string,
  releaseNotes: string,
  downloadLinks: string,
  developmentRelease: boolean,
  dryRun: boolean,
  appOctokit: Octokit
) => {
  const releaseName = `[${platform}${
    developmentRelease ? ' development release' : ''
  }] ${newVersionName} - ${newVersionCode}`
  console.warn('Creating release with name ', releaseName)

  const developmentMessage = developmentRelease
    ? 'This release is only delivered to development and not yet visible for users.\n\n'
    : ''

  const body = `${developmentMessage}${JSON.parse(releaseNotes)}${
    downloadLinks ? `\nArtifacts:\n${downloadLinks}` : ''
  }`
  console.warn('and body ', body)

  if (dryRun) {
    return
  }

  await appOctokit.repos.createRelease({
    owner,
    repo,
    tag_name: versionTagName({ versionName: newVersionName, platform }),
    name: releaseName,
    body
  })
}
