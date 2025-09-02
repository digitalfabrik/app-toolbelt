import { Command } from 'commander'
import SentryCli from '@sentry/cli'

type SentryReleaseOptions = {
  authToken: string
  versionCode?: number
}

export default (parent: Command) =>
  parent
    .description('create a new release on sentry. This file uses the configuration from ./.sentryclirc')
    .command('create <package-name> <version-name> <sourcemap-directory>')
    .requiredOption('--auth-token <auth-token>', 'the auth token')
    .option('--versionCode <version-code>', 'code of the version to release, this is only needed for react-native')
    .action(async (packageName, versionName, sourcemapDirectory, options: SentryReleaseOptions) => {
      try {
        const versionCode = options.versionCode
        let version = `${packageName}@${versionName}`

        if (versionCode) {
          version += `+${versionCode}`
        }

        let sentryCli = new SentryCli()

        await sentryCli.execute(['releases', 'new', version, '--finalize'], true)
        await sentryCli.execute(
          [
            'releases',
            'files',
            version,
            'upload-sourcemaps',
            sourcemapDirectory,
            ...(versionCode ? ['--dist', versionCode] : []),
          ],
          true,
        )
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
