import path from 'path'
import fs from 'fs'

export const nonNullablePredicate = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined

export const findPathInParents = (name: string, directory: string = '.'): string => {
  let currentDirectory = process.cwd()

  for (let i = 0; i < 8; i++) {
    const currentPath = path.resolve(currentDirectory, directory, name)
    if (fs.existsSync(currentPath)) {
      return currentPath
    }
    currentDirectory = path.resolve(currentDirectory, '..')
  }

  throw new Error(`${name} not found in ${path.resolve(process.cwd(), directory)} or parent directories!`)
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
