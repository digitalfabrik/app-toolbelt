import { Command } from 'commander'
import SentryCli from '@sentry/cli'

export default (parent: Command) =>
  parent
    .command('sentry-create')
    .argument('package-name', 'package name under which to release')
    .argument('version-name', 'name of the version to release')
    .argument('sourcemap-directory', 'relative path to the directory where the sourcemap is')
    .option('--versionCode <version-code>', 'code of the version to release, this is only needed for react-native')
    .requiredOption('--auth-token <auth-token>', 'the auth token')
    .description('create a new release on sentry. This file uses the configuration from ./.sentryclirc')
    .action(async (packageName, versionName, sourcemapDirectory, options: { [key: string]: any }) => {
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
