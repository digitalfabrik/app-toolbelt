import { Command } from 'commander'
import { StoreName } from './constants.js'
import { languageMap, loadStoreTranslations, metadataFromTranslations } from './translation.js'
import fs from 'fs'
import { RELEASE_NOTES_DIR, UNRELEASED_DIR } from './constants.js'

const metadataPath = (appName: string, storeName: StoreName, languageCode: string) =>
  `../native/${storeName === 'appstore' ? 'ios' : 'android'}/fastlane/${appName}/metadata/${languageCode}`

const writeMetadata = (appName: string, storeName: string, overrideVersionName?: string) => {
  if (storeName !== 'appstore' && storeName !== 'playstore') {
    throw new Error(`Invalid store name ${storeName} passed!`)
  }

  const storeTranslations = loadStoreTranslations(appName)

  Object.keys(storeTranslations[storeName]).forEach(language => {
    const metadata = metadataFromTranslations(storeName, language, storeTranslations)
    const targetLanguages = languageMap(storeName)[language] ?? [language]

    targetLanguages.forEach(targetLanguage => {
      const path = metadataPath(appName, storeName, targetLanguage)
      fs.mkdirSync(path, {
        recursive: true
      })

      Object.keys(metadata).forEach(metadataKey => {
        fs.writeFileSync(`${path}/${metadataKey}.txt`, metadata[metadataKey]!)
      })

      // Prepare release notes
      const platforms = { ios: storeName === 'appstore', android: storeName === 'playstore', web: false }
      const source = `../${RELEASE_NOTES_DIR}/${overrideVersionName ?? UNRELEASED_DIR}`
      const releaseNotesPath = `${metadataPath(appName, storeName, targetLanguage)}${
        storeName === 'playstore' ? '/changelogs' : ''
      }`
      fs.mkdirSync(releaseNotesPath, { recursive: true })

      const destination = `${releaseNotesPath}/${storeName === 'appstore' ? 'release_notes.txt' : 'default.txt'}`
      //parseNotesProgram({ ...platforms, production: true, language, destination, source, appName })

      console.warn(`${storeName} metadata for ${appName} successfully written in language ${targetLanguage}.`)
    })
  })
}

export default (parent: Command) =>
  parent
    .command('prepare-metadata')
    .argument('appName')
    .argument('storeName')
    .option(
      '--override-version-name <override-version-name>',
      'if specified the release notes will be generated from the specified version name instead of the unreleased notes'
    )
    .description('prepare metadata for store')
    .action((appName: string, storeName: string, options: { [key: string]: any }) => {
      try {
        writeMetadata(appName, storeName, options.overrideVersionName)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
