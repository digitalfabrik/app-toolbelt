import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'

export default (parent: Command) =>
  parent
    .command('to-bash <build-config-name>')
    .argument('platform')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .description('outputs the specified build config as key-value pairs which can be executed by bash')
    .action(async (buildConfigName, platform, options: { [key: string]: any }) => {
      const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
      const bash = asKeyValues(buildConfig, buildConfigName, platform, false, true)
      console.log(bash)
    })
