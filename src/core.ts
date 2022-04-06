import { program, createCommand, CommanderError } from 'commander'
import parseReleaseNotes from './release-notes/program-parse-release-notes'
import moveToProgram from './release-notes/program-move-to'
import prepareMetadata from './release-notes/program-prepare-metadata'
import toBash from './build-config/program-to-bash'
import toJson from './build-config/program-to-json'
import toProperties from './build-config/program-to-properties'
import writeXcConfig from './build-config/program-write-xcconfig'

const buildCommand = (exitOverride?: (err: CommanderError) => never | void) => {
  let root = program
    .exitOverride(exitOverride)
    .version('0.1.0')
    .option('-d, --debug', 'enable extreme logging')

  const v0 = root.command('v0')

  const releaseNoteCommand = v0.command('release-notes')
  parseReleaseNotes(releaseNoteCommand)
  moveToProgram(releaseNoteCommand)
  prepareMetadata(releaseNoteCommand)

  const versionCommand = v0.command('version').description('Manage version')

  const buildConfigCommand = v0.command('build-config')
  toBash(buildConfigCommand)
  toJson(buildConfigCommand)
  toProperties(buildConfigCommand)
  writeXcConfig(buildConfigCommand)

  return root
}

export default buildCommand
