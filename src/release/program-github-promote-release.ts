import { Command } from 'commander'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'
import { Platform } from '../constants.js'

type GithubPromoteReleaseOptions = GithubAuthenticationParams & {
  platform?: Platform
}

const getReleases = async (options: GithubPromoteReleaseOptions) => {
  const appOctokit = await authenticate(options)
  const { owner, repo, platform } = options

  const releases = await appOctokit.rest.repos.listReleases({
    owner,
    repo,
  })

  if (!platform) {
    return releases.data
  }
  return releases.data.filter(release => release.name?.includes(platform))
}

const promoteReleases = async (options: GithubAuthenticationParams) => {
  const { owner, repo } = options
  const releases = await getReleases(options)
  const preReleases = releases.filter(release => release.prerelease)
  const appOctokit = await authenticate(options)
  await Promise.all(
    preReleases.map(async preRelease => {
      const result = await appOctokit.rest.repos.updateRelease({
        owner,
        repo,
        release_id: preRelease.id,
        prerelease: false,
        make_latest: 'true',
      })
      console.warn(`Release ${preRelease.tag_name} promoted with status:`, result.status)
    }),
  )

  if (preReleases[0]?.prerelease) {
    return preReleases[0]
  }
  console.warn('Nothing to promote')
  return null
}

export default (parent: Command) => {
  const command = parent
    .description('Remove pre-release flag from the latest release')
    .command('promote')
    .option('--platform <platform>')
    .action(async (options: GithubPromoteReleaseOptions) => {
      try {
        const promotedRelease = await promoteReleases(options)
        if (promotedRelease) {
          console.log(
            `The most recent beta version was promoted to production:\n[${promotedRelease.name}](${promotedRelease.html_url})`,
          )
        }
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
