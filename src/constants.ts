export type Platform = 'ios' | 'android' | 'web'

export const PLATFORM_ANDROID: Platform = 'android'
export const PLATFORM_IOS: Platform = 'ios'
export const PLATFORM_WEB: Platform = 'web'
export const PLATFORMS: Platform[] = [PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WEB]

export type StoreName = 'appstore' | 'playstore'

export const VERSION_FILE = 'version.json'
