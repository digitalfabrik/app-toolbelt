import { Platform, PLATFORMS } from './constants.js'
import path from 'path'
import fs from 'fs'

export const nonNullablePredicate = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined

export const getPlatformsFromString = (platformsString?: string): Platform[] | undefined => {
  if (!platformsString) {
    return undefined
  }
  const delimiter = '/'
  const platforms = platformsString.split(delimiter) as Platform[]
  if (!platforms.every((platform: Platform) => PLATFORMS.includes(platform))) {
    throw new Error(
      `Provided platforms are incorrect! Please check available platforms (${PLATFORMS.join(
        ','
      )}) and correct delimiter (${delimiter})`
    )
  }
  return platforms
}

export const findPathInParents= (name: string, directory: string = '.'): string => {
  let currentDirectory = process.cwd()

  for (let i = 0; i < 8; i++) {
    const currentPath = path.resolve(currentDirectory, directory, name)
    if (fs.existsSync(currentPath)) {
      return currentPath
    }
    currentDirectory = path.resolve(currentDirectory, '..')
  }

  throw new Error(`${name} not found in ${path.resolve(process.cwd(), directory)} or parent directories!`)
}
