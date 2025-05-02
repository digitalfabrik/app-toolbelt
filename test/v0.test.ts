import buildCommand from '../src/core.js'
import { CommanderError } from 'commander'

const getCommandOutput = (args: readonly string[]) => {
  let output = ''
  let command = buildCommand(err => {
    throw err
  }).configureOutput({
    writeOut: (str: string) => {
      output += str
    },
    writeErr: (str: string) => {
      output += str
    },
    outputError: (str: string, write: (str: string) => void) => {
      output += str
    }
  })

  let argv = ['node', 'whitelabel', ...args]
  try {
    command.parse(argv)
  } catch (e) {
    if (!(e instanceof CommanderError)) {
      throw e
    }
  }

  return output.replace(/\s+/g, ' ').trim()
}

describe('stability test', () => {
  test('v0', () => {
    expect(getCommandOutput(['v0'])).toMatchSnapshot()
  })

  test('release', () => {
    expect(getCommandOutput(['v0', 'release'])).toMatchSnapshot()
  })

  test('release-notes', () => {
    expect(getCommandOutput(['v0', 'release-notes'])).toMatchSnapshot()
  })

  test('build-config', () => {
    expect(getCommandOutput(['v0', 'build-config'])).toMatchSnapshot()
  })

  test('version', () => {
    expect(getCommandOutput(['v0', 'version'])).toMatchSnapshot()
  })

  test('notify', () => {
    expect(getCommandOutput(['v0', 'notify'])).toMatchSnapshot()
  })
})
