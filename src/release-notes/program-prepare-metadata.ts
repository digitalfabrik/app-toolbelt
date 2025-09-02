import { Command } from 'commander'
import { languageMap, loadStoreTranslations, metadataFromTranslations } from './translation.js'
import fs from 'fs'
import { RELEASE_NOTES_DIR, UNRELEASED_DIR } from './constants.js'
import { parseNotesProgram } from './program-parse-release-notes.js'

type PrepareMetadataOptions = {
  overrideVersionName: string
}

const metadataPath = (metadataDirectory: string, languageCode: string) => `${metadataDirectory}/${languageCode}`

const writeMetadata = (appName: string, storeName: string, metadataDirectory: string, overrideVersionName?: string) => {
  if (storeName !== 'appstore' && storeName !== 'playstore') {
    throw new Error(`Invalid store name ${storeName} passed!`)
  }

  const storeTranslations = loadStoreTranslations(appName)

  Object.keys(storeTranslations[storeName]).forEach(language => {
    const metadata = metadataFromTranslations(storeName, language, storeTranslations)
    const targetLanguages = languageMap(storeName)[language] ?? [language]

    targetLanguages.forEach(targetLanguage => {
      const path = metadataPath(metadataDirectory, targetLanguage)
      fs.mkdirSync(path, {
        recursive: true,
      })

      Object.keys(metadata).forEach(metadataKey => {
        fs.writeFileSync(`${path}/${metadataKey}.txt`, metadata[metadataKey]!)
      })

      // Prepare release notes
      const platforms = { ios: storeName === 'appstore', android: storeName === 'playstore', web: false }
      const source = `../${RELEASE_NOTES_DIR}/${overrideVersionName ?? UNRELEASED_DIR}`
      const releaseNotesPath = `${path}/${storeName === 'playstore' ? '/changelogs' : ''}`
      fs.mkdirSync(releaseNotesPath, { recursive: true })

      const destination = `${releaseNotesPath}/${storeName === 'appstore' ? 'release_notes.txt' : 'default.txt'}`
      parseNotesProgram({ ...platforms, production: true, language, destination, source, appName })

      console.warn(`${storeName} metadata for ${appName} successfully written in language ${targetLanguage}.`)
    })
  })
}

export default (parent: Command) =>
  parent
    .description('prepare metadata for store')
    .command('prepare-metadata <app-name> <store-name> <metadata-directory>')
    .option(
      '--override-version-name <override-version-name>',
      'if specified the release notes will be generated from the specified version name instead of the unreleased notes',
    )
    .action((appName: string, storeName: string, metadataDirectory: string, options: PrepareMetadataOptions) => {
      try {
        writeMetadata(appName, storeName, metadataDirectory, options.overrideVersionName)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
