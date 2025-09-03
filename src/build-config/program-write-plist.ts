import fs from 'fs'
import { Command } from 'commander'
import plist from '@expo/plist'
import { loadBuildConfig, toSnakeCase } from './loader.js'
import { PLATFORM_IOS } from '../constants.js'

type Options = {
  directory: string
  buildConfigDirectory: string
  namespace?: string
}

export default (parent: Command) =>
  parent
    .description('create and write a new plist file to the output directory')
    .command('write-plist <build-config-name> <output-name>')
    .requiredOption('--directory <directory>', 'the directory to put the created plist file in')
    .option('--build-config-directory <directory>', 'the directory with the build configs', './build-configs')
    .option('--namespace <namespace>', 'the namespace with the keys to put in the plist', 'googleServices')
    .action(async (buildConfigName: string, outputName: string, options: Options) => {
      try {
        const buildConfig = await loadBuildConfig(buildConfigName, PLATFORM_IOS, options.buildConfigDirectory)
        const entries = options.namespace ? (buildConfig[options.namespace] as Record<string, unknown>) : buildConfig
        const snakeCaseEntries = Object.fromEntries(
          Object.entries(entries).map(([key, value]) => [toSnakeCase(key), value]),
        )
        // @ts-ignore the types are not correctly defined here
        fs.writeFileSync(`${options.directory}/${outputName}`, plist.build(snakeCaseEntries))
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
