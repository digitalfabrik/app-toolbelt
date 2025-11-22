import { Command } from 'commander'
import {
  authenticate,
  createPullRequestReview,
  GithubAuthenticationParams,
  withGithubAuthentication,
} from '../github.js'

export default (parent: Command) => {
  const command = parent
    .description('Send a review comment to a pull request on github')
    .command('github-pr <pr-number> <message>')
    .action(async (prNumberString: string, message: string, options: GithubAuthenticationParams) => {
      const prNumber = parseInt(prNumberString, 10)
      const appOctokit = await authenticate(options)
      await createPullRequestReview(prNumber, message, options, appOctokit)
    })

  withGithubAuthentication(command)
}
