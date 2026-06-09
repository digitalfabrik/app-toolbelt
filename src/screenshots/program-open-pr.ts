import { Command } from 'commander'
import fs from 'node:fs/promises'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

type GithubUpdateScreenshotsOptions = GithubAuthenticationParams & {
  base: string
  head: string
  title: string
  body: string
}

const SCREENSHOTS_COMMIT_MESSAGE = 'Update store screenshots'

const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === 404

const commitScreenshotsAndOpenPullRequest = async (
  files: string[],
  options: GithubUpdateScreenshotsOptions,
): Promise<void> => {
  const { owner, repo, base, head, title, body } = options

  if (files.length === 0) {
    console.warn('No screenshots to commit. Skipping.')
    return
  }

  const appOctokit = await authenticate(options)
  const {
    data: { commit: baseCommit },
  } = await appOctokit.repos.getBranch({ owner, repo, branch: base })

  // Upload every screenshot as a git blob and reference it at its repository path
  const tree = await Promise.all(
    files.map(async file => {
      const {
        data: { sha },
      } = await appOctokit.git.createBlob({
        owner,
        repo,
        content: (await fs.readFile(file)).toString('base64'),
        encoding: 'base64',
      })
      return { path: file, mode: '100644' as const, type: 'blob' as const, sha }
    }),
  )

  // Build a new tree on top of the base branch and commit the screenshots to it
  const screenshotsTree = await appOctokit.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.commit.tree.sha,
    tree,
  })
  const screenshotsCommit = await appOctokit.git.createCommit({
    owner,
    repo,
    message: SCREENSHOTS_COMMIT_MESSAGE,
    tree: screenshotsTree.data.sha,
    parents: [baseCommit.sha],
  })

  // Reset the head branch to the new commit, creating it if it does not exist yet
  const headExists = await appOctokit.repos
    .getBranch({ owner, repo, branch: head })
    .then(() => true)
    .catch(error => {
      if (isNotFoundError(error)) {
        return false
      }
      throw error
    })
  if (headExists) {
    await appOctokit.git.updateRef({ owner, repo, ref: `heads/${head}`, sha: screenshotsCommit.data.sha, force: true })
  } else {
    await appOctokit.git.createRef({ owner, repo, ref: `refs/heads/${head}`, sha: screenshotsCommit.data.sha })
  }

  // Open a pull request unless one is already open for the head branch
  const openPullRequests = await appOctokit.pulls.list({ owner, repo, head: `${owner}:${head}`, base, state: 'open' })
  const [existingPullRequest] = openPullRequests.data
  if (existingPullRequest) {
    console.warn(`A pull request from ${head} into ${base} is already open, reusing it.`)
    console.log(existingPullRequest.html_url)
    return
  }

  const pullRequest = await appOctokit.pulls.create({ owner, repo, base, head, title, body })
  console.warn(`Opened a pull request from ${head} into ${base}.`)
  console.log(pullRequest.data.html_url)
}

export default (parent: Command): Command => {
  const command = parent
    .description('Commit the given screenshots to a branch and open a pull request to update them')
    .command('open-pr [files...]')
    .option('--base <base>', 'the branch to base the pull request on', 'main')
    .option('--head <head>', 'the branch to commit the screenshots to', 'update-screenshots')
    .option('--title <title>', 'the title of the pull request', 'Update store screenshots')
    .option('--body <body>', 'the body of the pull request', 'Automatically generated screenshots from CI.')
    .action(async (files: string[], options: GithubUpdateScreenshotsOptions) => {
      try {
        await commitScreenshotsAndOpenPullRequest(files, options)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })

  return withGithubAuthentication(command)
}
