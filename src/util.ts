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
