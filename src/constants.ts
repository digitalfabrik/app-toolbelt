export type Platform = 'ios' | 'android' | 'web' | 'all' | 'native'

export const PLATFORM_ANDROID: Platform = 'android'
export const PLATFORM_IOS: Platform = 'ios'
export const PLATFORM_WEB: Platform = 'web'
export const PLATFORM_NATIVE: Platform = 'native'

export const PLATFORM_ALL: Platform = 'all'
export const PLATFORMS: Platform[] = [PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB, PLATFORM_NATIVE, PLATFORM_ALL]

export const VERSION_FILE = 'version.json'

export const MAIN_BRANCH = 'main'

// We want any android release to be flagged latest in order to provide an easy way for users to download and install apks
export const PLATFORMS_FLAGGED_LATEST: Platform[] = [PLATFORM_ANDROID, PLATFORM_NATIVE, PLATFORM_ALL]
