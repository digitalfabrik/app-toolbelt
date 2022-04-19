import { program, CommanderError } from 'commander'
import parseReleaseNotes from './release-notes/program-parse-release-notes'
import moveToProgram from './release-notes/program-move-to'
import prepareMetadata from './release-notes/program-prepare-metadata'
import toBash from './build-config/program-to-bash'
import toJson from './build-config/program-to-json'
import toProperties from './build-config/program-to-properties'
import writeXcConfig from './build-config/program-write-xcconfig'
import calcNextVersion from './version/program-calc-next-version'
import gitVersion from './release/program-git-version'
import githubRelease from './release/program-github-release'
import jiraRelease from './release/program-jira-release'
import sentryRelease from './release/program-sentry-release'
import triggerPipeline from './ci/program-trigger-pipeline'

const buildCommand = (exitOverride?: (err: CommanderError) => never | void) => {
  let root = program
    .version('0.1.0')
    .option('-d, --debug', 'enable extreme logging')
  
  if (exitOverride) {
    root.exitOverride(exitOverride)
  }

  const v0 = root.command('v0')

  const releaseNoteCommand = v0.command('release-notes')
  parseReleaseNotes(releaseNoteCommand)
  moveToProgram(releaseNoteCommand)
  prepareMetadata(releaseNoteCommand)

  const versionCommand = v0.command('version').description('Manage version')
  calcNextVersion(versionCommand)

  const buildConfigCommand = v0.command('build-config')
  toBash(buildConfigCommand)
  toJson(buildConfigCommand)
  toProperties(buildConfigCommand)
  writeXcConfig(buildConfigCommand)

  const releaseCommand = v0.command('release')
  gitVersion(releaseCommand)
  githubRelease(releaseCommand)
  jiraRelease(releaseCommand)
  sentryRelease(releaseCommand)

  const ciCommand = v0.command('ci')
  triggerPipeline(ciCommand)

  return root
}

export default buildCommand
