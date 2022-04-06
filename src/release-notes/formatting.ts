import { Platform, PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB } from '../core'
import { DEFAULT_NOTES_LANGUAGE, loadStoreTranslations } from './translation'

const MAX_RELEASE_NOTES_LENGTH = 500

export type NoteType = {
  show_in_stores: boolean
  issue_key: string
  platforms: Platform
  de?: string
  en: string
}

export const isNoteRelevant = ({note, platforms}: { note: NoteType; platforms: Platform[] }) =>
  platforms.some(platform => note.platforms.includes(platform))
export const isNoteCommon = ({note, platforms}: { note: NoteType; platforms: Platform[] }) =>
  platforms.every(platform => note.platforms.includes(platform))

const prepareDefaultReleaseNote = (language: string, production: boolean, appName?: string): string => {
  if (!production) {
    return ''
  }
  if (!appName) {
    throw new Error('No app name supplied while preparing notes for production!')
  }
  const common = loadStoreTranslations(appName).common
  return common[language]?.defaultReleaseNote ?? common[DEFAULT_NOTES_LANGUAGE].defaultReleaseNote
}

export const formatNotes = (params: {
  notes: NoteType[]
  language: string
  production: boolean
  platformName?: string
  appName?: string
}) => {
  const {notes, language, production, platformName, appName} = params
  const defaultReleaseNote = prepareDefaultReleaseNote(language, production, appName)

  const formattedNotes = notes
    .map(note => {
      const localizedNote = language === 'en' || !note.de ? note.en : note.de
      // Double quotes make mattermost status alerts fail
      const escapedNote = localizedNote.replace(/"/g, '\'')
      return production ? `* ${escapedNote}` : `* [ ${note.issue_key} ] ${escapedNote}`
    })
    .reduce((text, note) => {
      // Make sure release notes don't get longer than the maximal allowed length
      if (production && text.length + note.length > MAX_RELEASE_NOTES_LENGTH) {
        return text
      }
      if (text.length === 0) {
        return note
      }
      return `${text}\n${note}`
    }, defaultReleaseNote)

  return platformName && formattedNotes ? `\n${platformName}:\n${formattedNotes}` : formattedNotes
}

// Format the release notes for development purposes with all available information
export const formatDevelopmentNotes = (params: { notes: NoteType[]; language: string; platforms: Platform[] }) => {
  const {notes, language, platforms} = params
  const emptyNotesMap = {
    common: [] as NoteType[],
    android: [] as NoteType[],
    ios: [] as NoteType[],
    web: [] as NoteType[]
  }
  // Group notes by platform
  const notesMap = notes.reduce((notesMap, note) => {
    if (isNoteCommon({note, platforms})) {
      notesMap.common.push(note)
    } else if (isNoteRelevant({note, platforms: [PLATFORM_ANDROID]})) {
      notesMap.android.push(note)
    } else if (isNoteRelevant({note, platforms: [PLATFORM_IOS]})) {
      notesMap.ios.push(note)
    } else if (isNoteRelevant({note, platforms: [PLATFORM_WEB]})) {
      notesMap.web.push(note)
    }
    return notesMap
  }, emptyNotesMap)

  const commonNotes = formatNotes({notes: notesMap.common, language, production: false})
  const androidNotes = formatNotes({
    notes: notesMap.android,
    language,
    production: false,
    platformName: PLATFORM_ANDROID
  })
  const iosNotes = formatNotes({notes: notesMap.ios, language, production: false, platformName: PLATFORM_IOS})
  const webNotes = formatNotes({notes: notesMap.web, language, production: false, platformName: PLATFORM_WEB})

  const releaseNotes = `${commonNotes}${androidNotes}${iosNotes}${webNotes}`
  return `Release Notes:\n${releaseNotes || 'No release notes found. Looks like nothing happened for a while.'}`
}
