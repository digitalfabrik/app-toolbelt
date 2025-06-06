import { exec } from 'child_process'
import { Command } from 'commander'
import * as process from 'process'
import fetch from 'node-fetch'

export default (parent: Command) => {
  parent
    .command('mattermost')
    .option('--message <message>', 'The message that should be sent')
    .option('--channel <channel>', '')
    .option('--allow-all-branches', '')
    .description('Send a message to a mattermost channel')
    .action(async (options: { [key: string]: any }) => {
      const isAlwaysAllowedBranch =
        process.env.CIRCLE_BRANCH == 'main' || process.env.CIRCLE_BRANCH?.startsWith('release')
      if (!(isAlwaysAllowedBranch || options.allowAllBranches)) {
        console.log('Not on main or releases-* branch. Skipping.')
        process.exit(0)
      }

      if (!options.message) {
        console.log('No message set. Skipping.')
        process.exit(0)
      }

      if (!process.env.MM_WEBHOOK) {
        console.log('NO MATTERMOST WEBHOOK SET')
        console.log('Please add the environment variable "MM_WEBHOOK" in the settings for this project.')
        process.exit(1)
      }

      const data = {
        channel: options.channel,
        username: 'circleci',
        text: options.message,
      }

      const response = await fetch(process.env.MM_WEBHOOK, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.status != 200) {
        console.error(
          `Notification not sent due to an error. Status: ${response.status}. ${response.statusText} Please check the webhook URL`,
        )
        process.exit(1)
      }

      console.log('Notification sent!')
      process.exit(0)
    })
}
