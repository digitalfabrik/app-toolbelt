export type Platform = 'ios' | 'android' | 'web' | 'all' | 'native'

export const PLATFORM_ANDROID: Platform = 'android'
export const PLATFORM_IOS: Platform = 'ios'
export const PLATFORM_WEB: Platform = 'web'
export const PLATFORM_NATIVE: Platform = 'native'

export const PLATFORM_ALL: Platform = 'all'
export const PLATFORMS: Platform[] = [PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB, PLATFORM_NATIVE, PLATFORM_ALL]

export const VERSION_FILE = 'version.json'
