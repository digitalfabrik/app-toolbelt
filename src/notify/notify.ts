import { exec } from 'child_process'
import { Command } from 'commander'

export default (parent: Command) => {
  parent
    .command('mattermost')
    .requiredOption('--message <message>', 'The message that should be sent')
    .requiredOption('--channel <channel>', '')
    .option('--allow-all-branches', '')
    .description('Send a message to a mattermost channel')
    .action((options: { [key: string]: any }) => {
      exec(
        `./src/notify/notify-mattermost ${options.channel} ${options.message} ${
          options.allowAllBranches ? '--allow-all-branches' : ''
        }`,
        (error, stdout, stderr) => {
          if (error) console.log('Error: ', error?.message)
          if (stderr) console.log('Stderr: ', stderr)
          console.log(stdout)
        }
      )
    })
}
