import {createCommand} from "commander";
import loadBuildConfig from "./loader";

const program = createCommand('to-json');

export default program
    .argument("build_config_name")
    .argument("platform")
    .description('outputs the specified build config as JSON')
    .action((buildConfigName, platform) => {
        const buildConfig = loadBuildConfig(buildConfigName, platform)
        console.log(JSON.stringify(buildConfig))
    })
