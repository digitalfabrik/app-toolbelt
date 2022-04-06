import { Command } from 'commander'
import loadBuildConfig from './loader'

export default (parent: Command) => parent
  .command('to-json')
  .argument('build_config_name')
  .argument('platform')
  .description('outputs the specified build config as JSON')
  .action((buildConfigName, platform) => {
    const buildConfig = loadBuildConfig(buildConfigName, platform)
    console.log(JSON.stringify(buildConfig))
  })
