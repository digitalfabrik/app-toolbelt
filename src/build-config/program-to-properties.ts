import { Command, createCommand } from 'commander'
import { loadBuildConfigAsKeyValue } from './loader'

export default (parent: Command) => parent
  .command('to-properties')
  .argument('build_config_name')
  .argument('platform')
  .description('create and write a new properties file to the stdout')
  .action((buildConfigName, platform) => {
    try {
      const properties = loadBuildConfigAsKeyValue(buildConfigName, platform)
      console.log(properties)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  })
