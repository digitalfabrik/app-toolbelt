import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'
import { Platform } from '../constants.js'

type ToBashOptions = {
  buildConfigDirectory: string
}

export default (parent: Command) =>
  parent
    .description('outputs the specified build config as key-value pairs which can be executed by bash')
    .command('to-bash <build-config-name> <platform>')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .action(async (buildConfigName: string, platform: Platform, options: ToBashOptions) => {
      const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
      const bash = asKeyValues(buildConfig, buildConfigName, platform, false, true)
      console.log(bash)
    })
