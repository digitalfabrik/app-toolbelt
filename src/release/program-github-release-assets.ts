import { Command } from 'commander'
import fs from 'node:fs'
import { authenticate } from '../github.js'

type Options = {
  deliverinoPrivateKey: string
  owner: string
  repo: string
  releaseId: number
  files: string
}

const uploadAssets = async ({ deliverinoPrivateKey, owner, repo, releaseId, files }: Options) => {
  if (!files) {
    console.log('No files to upload. Skipping.')
    return
  }

  const appOctokit = await authenticate({ deliverinoPrivateKey, owner, repo })

  await Promise.all(
    files
      .split('\n')
      .filter(file => !file.includes('e2e'))
      .map(async file => {
        console.log(`Uploading ${file}`)
        const filename = file.substring(file.lastIndexOf('/') + 1)
        const fileData = fs.readFileSync(file)
        await appOctokit.rest.repos.uploadReleaseAsset({
          owner,
          repo,
          release_id: releaseId,
          name: filename,
          data: fileData as unknown as string,
        })
      }),
  )
}

export default (parent: Command) =>
  parent
    .command('upload')
    .description('Upload a release asset to github')
    .requiredOption(
      '--deliverino-private-key <deliverino-private-key>',
      'private key of the deliverino github app in pem format with base64 encoding',
    )
    .requiredOption('--owner <owner>', 'owner of the current repository, usually "digitalfabrik"')
    .requiredOption('--repo <repo>', 'the current repository, should be integreat-app')
    .requiredOption('--releaseId <releaseId>', 'The unique identifier of the release.')
    .requiredOption('--files <files>', 'The name of the files to upload.')
    .action(async (options: Options) => {
      try {
        await uploadAssets(options)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
