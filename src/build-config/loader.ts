import decamelize from 'decamelize'
import flat from 'flat'
import { Platform, PLATFORMS } from '../constants'

export type BuildConfigPlatformType = Platform | 'common'
const PLATFORM_COMMON: BuildConfigPlatformType = 'common'
const BUILD_CONFIG_PLATFORMS: BuildConfigPlatformType[] = [...PLATFORMS, PLATFORM_COMMON]

const loadBuildConfig = (
  buildConfigName: string | null | undefined,
  platform: BuildConfigPlatformType
): Record<string, unknown> => {
  if (!buildConfigName) {
    throw Error('No BUILD_CONFIG_NAME supplied!')
  }

  let buildConfigPath = process.cwd() + '/../build-configs/' + buildConfigName

  const buildConfig = require(buildConfigPath).default

  if (!buildConfig) {
    throw Error(`Invalid BUILD_CONFIG_NAME supplied: ${buildConfigName}`)
  }

  if (!BUILD_CONFIG_PLATFORMS.includes(platform)) {
    throw Error(`Invalid platform supplied: ${platform}`)
  }

  // FIXME this needs to be applied in integreat
  // buildConfig.common.featureFlags.cityNotCooperating = !!buildConfig.common.featureFlags.cityNotCooperatingTemplate && !!buildConfig.web.icons.cityNotCooperating

  return buildConfig[platform]
}

export default loadBuildConfig

export const loadBuildConfigAsKeyValue = (buildConfigName: string, platform: BuildConfigPlatformType, spaces = true, quotes = false) => {
  const buildConfig = loadBuildConfig(buildConfigName, platform)
  const xcconfigOptions = flat<Record<string, unknown>, Record<string, string | number | boolean>>(buildConfig, {
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
