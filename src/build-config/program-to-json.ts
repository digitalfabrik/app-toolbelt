import { Command } from 'commander'
import { loadBuildConfig } from './loader.js'

export default (parent: Command) =>
  parent
    .command('to-json  <build-config-name>')
    .argument('platform')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .description('outputs the specified build config as JSON')
    .action(async (buildConfigName, platform, options: { [key: string]: any }) => {
      const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
      console.log(JSON.stringify(buildConfig))
    })
