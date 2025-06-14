import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'

export default (parent: Command) =>
  parent
    .command('to-properties <build-config-name>')
    .argument('platform')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .description('create and write a new properties file to the stdout')
    .action(async (buildConfigName, platform, options: { [key: string]: any }) => {
      try {
        const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
        const properties = asKeyValues(buildConfig, buildConfigName, platform)
        console.log(properties)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
