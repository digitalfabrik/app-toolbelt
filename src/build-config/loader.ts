import decamelize from 'decamelize'
import { flatten } from 'flat'
import { Platform, PLATFORMS } from '../constants.js'
import { findPathInParents } from '../util.js'

export type BuildConfigPlatformType = Platform | 'common'
const PLATFORM_COMMON: BuildConfigPlatformType = 'common'
const BUILD_CONFIG_PLATFORMS: BuildConfigPlatformType[] = [...PLATFORMS, PLATFORM_COMMON]

export const loadBuildConfig = async (
  buildConfigName: string | null | undefined,
  platform: BuildConfigPlatformType,
  buildConfigDirectory: string
): Promise<Record<string, unknown>> => {
  if (!buildConfigName) {
    throw Error('No BUILD_CONFIG_NAME supplied!')
  }

  if (!BUILD_CONFIG_PLATFORMS.includes(platform)) {
    throw Error(`Invalid platform supplied: ${platform}`)
  }

  const buildConfig = (await import(findPathInParents(buildConfigName, buildConfigDirectory))).default

  if (!buildConfig) {
    throw Error(`Invalid BUILD_CONFIG_NAME supplied: ${buildConfigName}`)
  }

  if (!buildConfig[platform]) {
    throw Error(`Build config not available for platform: ${platform}`)
  }

  return buildConfig[platform]
}

export const asKeyValues = (
  buildConfig: Record<string, unknown>,
  buildConfigName: string,
  platform: BuildConfigPlatformType,
  spaces = true,
  quotes = false
) => {
  const xcconfigOptions = flatten<Record<string, unknown>, Record<string, string | number | boolean>>(buildConfig, {
    delimiter: '_',
    // Dashes are not supported in keys in xcconfigs and android resources
    transformKey: key => decamelize(key).toUpperCase().replace('-', '_')
  })
  const assignOperator = `${spaces ? ' ' : ''}=${spaces ? ' ' : ''}`

  const quoteValue = (value: string) => (quotes ? `"${value.replace(/"/g, '\\"')}"` : value)

  const prefixed = Object.keys(xcconfigOptions).map(key => {
    const value = String(xcconfigOptions[key]).replace(/\n/g, '\\n')
    const escaped = spaces ? value : value.replace(/\s/g, '_')
    return `BUILD_CONFIG_${key}${assignOperator}${quoteValue(escaped)}`
  })
  prefixed.push(`BUILD_CONFIG_NAME${assignOperator}${quoteValue(buildConfigName)}`)
  return prefixed.join('\n')
}
