import { Command } from 'commander'
import { Octokit } from '@octokit/rest'
import fs from 'node:fs/promises'
import { authenticate, GithubAuthenticationParams, withGithubAuthentication } from '../github.js'

type GithubOpenPrOptions = GithubAuthenticationParams & {
  base: string
  head: string
  title: string
  body: string
  message: string
}

// Upload every file as a git blob and commit them on top of the base branch, returning the new commit's sha
const commitFiles = async (appOctokit: Octokit, files: string[], options: GithubOpenPrOptions): Promise<string> => {
  const { owner, repo, base, message } = options

  const {
    data: { commit: baseCommit },
  } = await appOctokit.repos.getBranch({ owner, repo, branch: base })

  // Reference every uploaded blob at its repository path to build up the new tree
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

  const newTree = await appOctokit.git.createTree({ owner, repo, base_tree: baseCommit.commit.tree.sha, tree })
  const commit = await appOctokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.data.sha,
    parents: [baseCommit.sha],
  })
  return commit.data.sha
}

// Reset the head branch to the given commit, creating the branch if it doesn't exist yet
const resetHeadBranch = async (appOctokit: Octokit, options: GithubOpenPrOptions, sha: string): Promise<void> => {
  const { owner, repo, head } = options

  const headExists = await appOctokit.repos
    .getBranch({ owner, repo, branch: head })
    .then(() => true)
    .catch(error => {
      if (error?.status === 404) {
        return false
      }
      throw error
    })

  if (headExists) {
    await appOctokit.git.updateRef({ owner, repo, ref: `heads/${head}`, sha, force: true })
  } else {
    await appOctokit.git.createRef({ owner, repo, ref: `refs/heads/${head}`, sha })
  }
}

// Open a pull request from the head branch into the base branch, reusing an already open one if it exists
const openPullRequest = async (appOctokit: Octokit, options: GithubOpenPrOptions): Promise<void> => {
  const { owner, repo, base, head, title, body } = options

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

const commitFilesAndOpenPullRequest = async (files: string[], options: GithubOpenPrOptions): Promise<void> => {
  if (files.length === 0) {
    console.warn('No files to commit. Skipping.')
    return
  }

  const appOctokit = await authenticate(options)
  const sha = await commitFiles(appOctokit, files, options)
  await resetHeadBranch(appOctokit, options, sha)
  await openPullRequest(appOctokit, options)
}

export default (parent: Command): Command => {
  const command = parent
    .command('open-pr [files...]')
    .description('Commit the given files to a branch and open a pull request')
    .option('--base <base>', 'the branch to base the pull request on', 'main')
    .requiredOption('--head <head>', 'the branch to commit the files to')
    .requiredOption('--message <message>', 'the commit message')
    .requiredOption('--title <title>', 'the title of the pull request')
    .option('--body <body>', 'the body of the pull request', '')
    .action(async (files: string[], options: GithubOpenPrOptions) => {
      try {
        await commitFilesAndOpenPullRequest(files, options)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })

  return withGithubAuthentication(command)
}
