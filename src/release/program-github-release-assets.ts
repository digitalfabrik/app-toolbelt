import { Command } from 'commander'
import fs from 'node:fs'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

type GithubUploadAssetsOptions = GithubAuthenticationParams & {
  releaseId: number
  files: string
}

const uploadAssets = async ({ deliverinoPrivateKey, owner, repo, releaseId, files }: GithubUploadAssetsOptions) => {
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

export default (parent: Command) => {
  const command = parent
    .description('Upload a release asset to github')
    .command('upload')
    .requiredOption('--releaseId <releaseId>', 'The unique identifier of the release.')
    .requiredOption('--files <files>', 'The name of the files to upload.')
    .action(async (options: GithubUploadAssetsOptions) => {
      try {
        await uploadAssets(options)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
  return withGithubAuthentication(command)
}
