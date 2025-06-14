import { Octokit } from '@octokit/rest'
import { GetResponseTypeFromEndpointMethod } from '@octokit/types'
import { Command } from 'commander'
import { authenticate } from '../github.js'

const octokit = new Octokit()
type Releases = GetResponseTypeFromEndpointMethod<typeof octokit.repos.listReleases>

type Options = {
  deliverinoPrivateKey: string
  owner: string
  repo: string
  platform: 'web' | 'android' | 'ios' | 'all'
}

const getReleases = async ({ deliverinoPrivateKey, owner, repo, platform }: Options) => {
  const appOctokit = await authenticate({ deliverinoPrivateKey, owner, repo })

  const releases: Releases = await appOctokit.rest.repos.listReleases({
    owner,
    repo,
  })
  return releases.data.filter(release => release.tag_name.includes(platform))
}

const promoteReleases = async ({ deliverinoPrivateKey, owner, repo, platform }: Options) => {
  const releases = await getReleases({ deliverinoPrivateKey, owner, repo, platform })
  const preReleases = releases.filter(release => release.prerelease)
  // For integreat we always want platform android to be the latest release, so a link to the latest github release will go to the apk
  // For entitlementcard we always want platform all to be the lastest release
  const platformsFlaggedLatest = ['android', 'native', 'all']
  const appOctokit = await authenticate({ deliverinoPrivateKey, owner, repo })
  await Promise.all(
    preReleases.map(async preRelease => {
      const result = await appOctokit.rest.repos.updateRelease({
        owner,
        repo,
        release_id: preRelease.id,
        prerelease: false,
        make_latest: platformsFlaggedLatest.includes(platform) ? 'true' : 'false',
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

export default (parent: Command) =>
  parent
    .command('promote')
    .description('Remove pre-release flag from the latest release')
    .requiredOption(
      '--deliverino-private-key <deliverino-private-key>',
      'private key of the deliverino github app in pem format with base64 encoding',
    )
    .requiredOption('--owner <owner>', 'owner of the current repository, usually "digitalfabrik"')
    .requiredOption('--repo <repo>', 'the current repository, should be integreat-app')
    .requiredOption('--platform <platform>')
    .action(async (options: Options) => {
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
