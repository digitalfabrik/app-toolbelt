import buildCommand from '../src/core'
import { CommanderError } from 'commander'

const getCommandOutput = (args) => {
  let output = ''
  let command = buildCommand((err) => {
    throw err
  }).configureOutput({
    writeOut: (str: string) => {
      output += str
    }, writeErr: (str: string) => {
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
  
  return output
}

test('stability test', () => {
  expect(getCommandOutput(['v0'])).toMatchSnapshot()
  expect(getCommandOutput(['v0', 'release-notes'])).toMatchSnapshot()
  expect(getCommandOutput(['v0', 'build-config'])).toMatchSnapshot()
  expect(getCommandOutput(['v0', 'version'])).toMatchSnapshot()
})
