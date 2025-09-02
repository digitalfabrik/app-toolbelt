import { Command } from 'commander'
import { loadBuildConfig } from './loader.js'
import { Platform } from '../constants.js'

type ToJsonOptions = {
  buildConfigDirectory: string
}

export default (parent: Command) =>
  parent
    .description('outputs the specified build config as JSON')
    .command('to-json  <build-config-name> <platform>')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .action(async (buildConfigName: string, platform: Platform, options: ToJsonOptions) => {
      const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
      console.log(JSON.stringify(buildConfig))
    })
