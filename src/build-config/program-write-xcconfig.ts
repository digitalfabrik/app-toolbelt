import fs from 'fs'
import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'
import { Platform } from '../constants.js'

type WriteXcConfigOptions = {
  buildConfigDirectory: string
  directory: string
}

export default (parent: Command) =>
  parent
    .description('create and write a new buildConfig.tmp.xcconfig to the output directory')
    .command('write-xcconfig <build_config_name> <platform>')
    .requiredOption('--directory <directory>', 'the directory to put the created xcconfig file in')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .action(async (buildConfigName: string, platform: Platform, options: WriteXcConfigOptions) => {
      try {
        const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
        const xcconfig = asKeyValues(buildConfig, buildConfigName, platform)
        fs.writeFileSync(`${options.directory}/buildConfig.tmp.xcconfig`, xcconfig)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
