import fs from 'fs'
import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'

export default (parent: Command) =>
  parent
    .command('write-xcconfig <build_config_name> <platform>')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .requiredOption('--directory <directory>', 'the directory to put the created xcconfig file in')
    .description('create and write a new buildConfig.tmp.xcconfig to the output directory')
    .action(async (buildConfigName, platform, options: { [key: string]: any }) => {
      try {
        const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
        const xcconfig = asKeyValues(buildConfig, buildConfigName, platform)
        fs.writeFileSync(`${options.directory}/buildConfig.tmp.xcconfig`, xcconfig)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
