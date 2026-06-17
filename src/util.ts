import { resolve } from 'node:path'
import fs from 'node:fs'

export const nonNullablePredicate = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined

export const findPathInParents = (...pathSegments: string[]): string | undefined => {
  let currentDirectory = process.cwd()

  for (let i = 0; i < 8; i++) {
    const currentPath = resolve(currentDirectory, ...pathSegments)
    if (fs.existsSync(currentPath)) {
      return currentPath
    }
    currentDirectory = resolve(currentDirectory, '..')
  }
}

const LINES_TO_REMOVE = ["## What's Changed", '**Full Changelog**', '<!--']

export const formatReleaseNotesForMattermost = (releaseNotes: string): string =>
  releaseNotes
    .split('\n')
    // Remove unnecessary lines
    .filter(line => !LINES_TO_REMOVE.some(pattern => line.startsWith(pattern)) && line.trim().length > 0)
    // Remove PR author
    .map(line => line.replace(/\bby @\w* /g, ''))
    // Shorten PR link
    .map(line => line.replace(/in (https:\/\/github.com\D*)(\d+)$/g, '([#$2]($1$2))'))
    // Use smaller headings
    .map(line => line.replace(/^#* /g, '###### '))
    .join('\n')
    // Remove maintenance section and PRs
    .replace(/\n#+ Maintenance[\s\S]*/g, '')
