import { Command } from 'commander'
import fs from 'fs'

import { VERSION_FILE } from '../constants.js'
import { findPathInParents } from '../util.js'

const calculateNewVersion = () => {
  const versionFile = fs.readFileSync(findPathInParents(VERSION_FILE), 'utf-8')
  // versionCode is just used in the integreat-react-native-app
  const { versionName, versionCode } = JSON.parse(versionFile)
  const versionNameParts = versionName.split('.').map((it: string) => parseInt(it, 10))

  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const versionNameCounter = year === versionNameParts[0] && month === versionNameParts[1] ? versionNameParts[2] + 1 : 0
  const newVersionName = `${year}.${month}.${versionNameCounter}`

  if (versionCode && typeof versionCode !== 'number') {
    throw new Error(`Version code must be a number, but is of type ${typeof versionCode}.`)
  }
  const newVersionCode = versionCode ? versionCode + 1 : undefined

  return {
    versionName: newVersionName,
    versionCode: newVersionCode,
  }
}

export default (parent: Command) =>
  parent
    .command('calc')
    .description('calculate the next version')
    .action(() => {
      try {
        const newVersion = calculateNewVersion()

        // Log stringified version to enable bash piping
        console.log(JSON.stringify(newVersion))
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
