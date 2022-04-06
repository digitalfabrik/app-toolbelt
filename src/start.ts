import {program, createCommand} from 'commander'
import parseReleaseNotes from './release-notes/program-parse-release-notes'
import moveToProgram from './release-notes/program-move-to'
import prepareMetadata from './release-notes/program-prepare-metadata'
import toBash from './build-config/program-to-bash'
import toJson from './build-config/program-to-json'
import toProperties from './build-config/program-to-properties'
import writeXcConfig from './build-config/program-write-xcconfig'


const releaseNoteCommand = createCommand("release-notes")
    .addCommand(parseReleaseNotes)
    .addCommand(moveToProgram)
    .addCommand(prepareMetadata)

const versionCommand = createCommand("version").description("Manage version")

const buildConfigCommand = createCommand("build-config")
    .addCommand(toBash)
    .addCommand(toJson)
    .addCommand(toProperties)
    .addCommand(writeXcConfig)


program.version('0.1.0').option('-d, --debug', 'enable extreme logging')
    .addCommand(releaseNoteCommand)
    .addCommand(versionCommand)
    .addCommand(buildConfigCommand)
    .parse(process.argv)
