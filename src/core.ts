import { CommanderError, Command } from 'commander'
import parseReleaseNotes from './release-notes/program-parse-release-notes.js'
import moveToProgram from './release-notes/program-move-to.js'
import prepareMetadata from './release-notes/program-prepare-metadata.js'
import toBash from './build-config/program-to-bash.js'
import toJson from './build-config/program-to-json.js'
import toProperties from './build-config/program-to-properties.js'
import writePlist from './build-config/program-write-plist.js'
import writeXcConfig from './build-config/program-write-xcconfig.js'
import calcNextVersion from './version/program-calc-next-version.js'
import gitRelease from './release/program-git-release.js'
import githubRelease from './release/program-github-release.js'
import githubReleaseAssets from './release/program-github-release-assets.js'
import githubPromoteRelease from './release/program-github-promote-release.js'
import sentryRelease from './sentry/program-sentry-release.js'
import notify from './notify/notify.js'
import packageJson from '../package.json' with { type: 'json' }

const buildCommand = (exitOverride?: (err: CommanderError) => never | void) => {
  let root = new Command().version(packageJson.version).option('-d, --debug', 'enable extreme logging')

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
  writePlist(buildConfigCommand)

  const releaseCommand = v0.command('release')
  gitRelease(releaseCommand)
  githubRelease(releaseCommand)
  githubReleaseAssets(releaseCommand)
  githubPromoteRelease(releaseCommand)

  const sentryCommand = v0.command('sentry')
  sentryRelease(sentryCommand)

  const notifyCommand = v0.command('notify')
  notify(notifyCommand)

  return root
}

export default buildCommand
