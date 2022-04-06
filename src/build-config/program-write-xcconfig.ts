import fs from 'fs'
import { Command, createCommand } from 'commander'
import { loadBuildConfigAsKeyValue } from './loader'

export default (parent: Command) => parent
  .command('write-xcconfig')
  .argument('build_config_name')
  .argument('platform')
  .requiredOption('--directory <directory>', 'the directory to put the created xcconfig file in')
  .description('create and write a new buildConfig.tmp.xcconfig to the output directory')
  .action((buildConfigName, platform, cmdObj) => {
    try {
      const xcconfig = loadBuildConfigAsKeyValue(buildConfigName, platform)
      fs.writeFileSync(`${cmdObj.directory}/buildConfig.tmp.xcconfig`, xcconfig)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  })
