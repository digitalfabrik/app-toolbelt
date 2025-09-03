import { Command } from 'commander'
import { asKeyValues, loadBuildConfig } from './loader.js'
import { Platform } from '../constants.js'

type ToPropertiesOptions = {
  buildConfigDirectory: string
}

export default (parent: Command) =>
  parent
    .description('create and write a new properties file to the stdout')
    .command('to-properties <build-config-name> <platform>')
    .option(
      '--build-config-directory <directory>',
      'Change build config directory from the default ./build-configs',
      './build-configs',
    )
    .action(async (buildConfigName: string, platform: Platform, options: ToPropertiesOptions) => {
      try {
        const buildConfig = await loadBuildConfig(buildConfigName, platform, options.buildConfigDirectory)
        const properties = asKeyValues(buildConfig, buildConfigName, platform)
        console.log(properties)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
