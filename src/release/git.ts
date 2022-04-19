import { PLATFORMS } from '../constants'

type ReleaseInformation = {
  platform: typeof PLATFORMS[number]
  versionName: string
}

export const tagName = ({ platform, versionName }: ReleaseInformation): string => `${versionName}-${platform}`
