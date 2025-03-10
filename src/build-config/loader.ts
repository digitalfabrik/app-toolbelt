import decamelize from 'decamelize'
import { flatten } from 'flat'
import { Platform, PLATFORMS } from '../constants.js'
import path from 'path'

export type BuildConfigPlatformType = Platform | 'common'
const PLATFORM_COMMON: BuildConfigPlatformType = 'common'
const BUILD_CONFIG_PLATFORMS: BuildConfigPlatformType[] = [...PLATFORMS, PLATFORM_COMMON]

const findBuildConfigDirectoryInParent = (buildConfigName: string, buildConfigDirectory: string): any | null => {
  let currentDirectory = process.cwd()

  for (let i = 0; i < 8; i++) {
    let buildConfigPath = `${currentDirectory}/${buildConfigDirectory}/${buildConfigName}`
    try {
      return require(buildConfigPath).default
    } catch (e) {
      currentDirectory = path.resolve(currentDirectory, '..')
    }
  }

  return null
}

export const loadBuildConfig = (
  buildConfigName: string | null | undefined,
  platform: BuildConfigPlatformType,
  buildConfigDirectory: string
): Record<string, unknown> => {
  if (!buildConfigName) {
    throw Error('No BUILD_CONFIG_NAME supplied!')
  }

  if (!BUILD_CONFIG_PLATFORMS.includes(platform)) {
    throw Error(`Invalid platform supplied: ${platform}`)
  }

  const buildConfig = findBuildConfigDirectoryInParent(buildConfigName, buildConfigDirectory)

  if (!buildConfig) {
    throw Error(`Invalid BUILD_CONFIG_NAME supplied: ${buildConfigName}`)
  }

  // FIXME this needs to be applied in integreat
  // buildConfig.common.featureFlags.cityNotCooperating = !!buildConfig.common.featureFlags.cityNotCooperatingTemplate && !!buildConfig.web.icons.cityNotCooperating

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
