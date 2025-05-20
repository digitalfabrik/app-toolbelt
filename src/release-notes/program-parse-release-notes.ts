import { Command } from 'commander'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import { Platform, PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB } from '../constants.js'
import { nonNullablePredicate } from '../util.js'
import { formatDevelopmentNotes, formatNotes, isNoteRelevant, NoteType } from './formatting.js'
import { DEFAULT_NOTES_LANGUAGE } from './translation.js'
import { GITKEEP_FILE, RELEASE_NOTES_DIR, UNRELEASED_DIR } from './constants.js'

type ParseProgramOptionsType = {
  destination?: string
  source: string
  ios: boolean
  android: boolean
  web: boolean
  language: string
  production: boolean
  appName?: string
}

const parseReleaseNotes = ({
  source,
  ios,
  android,
  web,
  production,
  language,
  appName
}: ParseProgramOptionsType): string => {
  const platforms: Platform[] = [
    android ? PLATFORM_ANDROID : undefined,
    ios ? PLATFORM_IOS : undefined,
    web ? PLATFORM_WEB : undefined
  ].filter(nonNullablePredicate)

  if (platforms.length === 0) {
    throw new Error('No platforms selected! Use --ios, --android and --web flags.')
  } else if (platforms.length > 1 && production) {
    // e.g. play store release notes should not contain ios release infos
    throw new Error('Usage of multiple platforms in production mode is not supported.')
  }

  const fileNames = fs.existsSync(source) ? fs.readdirSync(source) : []
  if (fileNames.length === 0) {
    console.warn(`No release notes found in source ${source}. Using default notes.`)
  }

  const asNoteType = (as: unknown): NoteType => as as NoteType

  // Load all notes not belonging to a release
  const relevantNotes = fileNames
    .filter(fileName => fileName !== GITKEEP_FILE)
    .map(fileName => asNoteType(yaml.load(fs.readFileSync(`${source}/${fileName}`, 'utf-8'))))
    .filter(note => isNoteRelevant({ note, platforms }))

  // If the production flag is set, hide information that is irrelevant for users
  if (production) {
    const productionNotes = relevantNotes.filter(note => note.show_in_stores)
    return formatNotes({ notes: productionNotes, language, production, appName })
  }

  return formatDevelopmentNotes({ notes: relevantNotes, language, platforms })
}

export const parseNotesProgram = (options: ParseProgramOptionsType) => {
  try {
    const notes = parseReleaseNotes({ ...options })

    if (options.destination) {
      fs.mkdirSync(path.dirname(options.destination), { recursive: true })
      fs.writeFileSync(options.destination, notes)
    }

    // Log to enable bash piping
    console.log(JSON.stringify(notes))
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

export default (parent: Command) =>
  parent
    .command('parse-release-notes')
    .description(
      'parse the release notes and outputs the release notes as JSON string and writes them to the specified file'
    )
    .option('--ios', 'include release notes for ios')
    .option('--android', 'include release notes for android')
    .option('--web', 'include release notes for web.')
    .option(
      '--production',
      'whether to hide extra information, e.g. issue keys, hidden notes and platforms and prepare the notes for a store. may not be used with multiple platforms. If set to true, make sure to pass the app name as well.'
    )
    .option(
      '--app-name <app-name>',
      'the name of the app to prepare the notes for. Only used if production flag is set.'
    )
    .option('--destination <destination>', 'if specified the parsed notes are saved to the directory')
    .requiredOption(
      '--source <source>',
      'the directory of the release notes to parse',
      `../${RELEASE_NOTES_DIR}/${UNRELEASED_DIR}`
    )
    .requiredOption('--language <language>', 'the language of the release notes to parse', DEFAULT_NOTES_LANGUAGE)
    .action((options: { [key: string]: any }) => {
      // @ts-ignore
      parseNotesProgram({ ...options })
    })
