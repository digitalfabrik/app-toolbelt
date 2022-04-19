import fs from 'fs'
import { StoreName } from './constants'

export const DEFAULT_NOTES_LANGUAGE = 'de'

// Maps our translation keys to the right key used by the appstore
// Empty array means no translation in the store
// https://docs.fastlane.tools/actions/deliver/#available-language-codes
const appstoreLanguageMap: Record<string, string[]> = {
  am: [],
  ar: ['ar-SA'],
  bg: [],
  de: ['de-DE'],
  el: ['el'],
  en: ['en-US'],
  es: ['es-ES'],
  fr: ['fr-FR'],
  hr: ['hr'],
  hu: ['hu'],
  it: ['it'],
  ka: [],
  mk: [],
  pes: [],
  pl: ['pl'],
  prs: [],
  ro: ['ro'],
  ru: ['ru'],
  sq: [],
  tr: ['tr'],
  uk: ['uk'],
  ur: [],
  'zh-CN': ['zh-Hans']
}

// Maps our translation keys to the right key used by the play store
// https://support.google.com/googleplay/android-developer/answer/9844778?hl=en#zippy=%2Cview-list-of-available-languages%2Cif-you-dont-add-or-purchase-translations
const playstoreLanguageMap: Record<string, string[]> = {
  am: ['am'],
  ar: ['ar'],
  bg: ['bg'],
  de: ['de-DE'],
  el: ['el-GR'],
  en: ['en-US', 'en-GB'],
  es: ['es-ES'],
  fr: ['fr-FR'],
  hr: ['hr'],
  hu: ['hu-HU'],
  it: ['it-IT'],
  ka: ['ka-GE'],
  mk: ['mk-MK'],
  pes: ['fa'],
  prs: ['fa-AF'],
  pl: ['pl-PL'],
  ro: ['ro'],
  ru: ['ru-RU'],
  sq: ['sq'],
  tr: ['tr-TR'],
  uk: ['uk'],
  ur: ['ur'],
  'zh-CN': ['zh-CN']
}

export const languageMap = (storeName: StoreName): Record<string, string[]> =>
  storeName === 'appstore' ? appstoreLanguageMap : playstoreLanguageMap

// Record<storeName, Record<language, Record<metadataKey, metadataValue>>>
type StoreTranslationType = Record<string, Record<string, Record<string, string>>>

// Merges the metadata of the store with the common metadata in a specific language
export const metadataFromTranslations = (
  storeName: StoreName,
  language: string,
  translations: StoreTranslationType
): Record<string, string> => {
  const commonTranslation = translations.common![language]!
  const name = commonTranslation.name!
  const description = commonTranslation.description!
  const storeTranslation = translations[storeName]![language]!

  return storeName === 'appstore'
    ? {
      name,
      description,
      ...storeTranslation
    }
    : {
      title: name,
      full_description: description,
      ...storeTranslation
    }
}

export const loadStoreTranslations = (appName: string) =>
  JSON.parse(fs.readFileSync(`../translations/store-translations/${appName}.json`, 'utf-8'))

