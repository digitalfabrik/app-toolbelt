import { Platform, PLATFORMS } from './constants.js'

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
