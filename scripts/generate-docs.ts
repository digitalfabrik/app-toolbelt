import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import buildCommand from '../src/core.js'

const DOCS_DIR = 'docs/commands'

const formatOption = (option: { flags: string; description: string; defaultValue?: unknown }): string => {
  const defaultStr = option.defaultValue !== undefined ? ` (default: \`${option.defaultValue}\`)` : ''
  return `| \`${option.flags}\` | ${option.description}${defaultStr} |`
}

const generateCommandPage = (command: Command, breadcrumb: string[]): string => {
  const usage = `app-toolbelt ${[...breadcrumb, command.name()].join(' ')}`
  const args = command.registeredArguments.map(argument => `<${argument.name()}>`).join(' ')
  const lines: string[] = []

  lines.push(`# ${command.name()}`)
  lines.push('')

  if (command.description()) {
    lines.push(command.description())
    lines.push('')
  }

  lines.push('## Usage')
  lines.push('')
  lines.push('```')
  lines.push(`${usage}${args ? ' ' + args : ''} [options]`)
  lines.push('```')
  lines.push('')

  if (command.registeredArguments.length > 0) {
    lines.push('## Arguments')
    lines.push('')
    lines.push('| Argument | Description |')
    lines.push('| --- | --- |')
    command.registeredArguments.forEach(argument => {
      lines.push(`| \`<${argument.name()}>\` | ${argument.description} |`)
    })
    lines.push('')
  }

  const options = command.options.filter(option => option.flags !== '-h, --help')
  if (options.length > 0) {
    lines.push('## Options')
    lines.push('')
    lines.push('| Option | Description |')
    lines.push('| --- | --- |')
    options.forEach(option => {
      lines.push(formatOption(option))
    })
    lines.push('')
  }

  return lines.join('\n')
}

const walkCommands = (command: Command, breadcrumb: string[]) => {
  const subcommands = command.commands.filter(command => command.name() !== 'help')

  if (subcommands.length === 0) {
    const dir = path.join(DOCS_DIR, ...breadcrumb.slice(1))
    fs.mkdirSync(dir, { recursive: true })

    const filename = `${command.name()}.md`
    const filepath = path.join(dir, filename)
    fs.writeFileSync(filepath, generateCommandPage(command, breadcrumb))
  } else {
    subcommands.forEach(sub => walkCommands(sub, [...breadcrumb, command.name()]))
  }
}

fs.mkdirSync(DOCS_DIR, { recursive: true })

const root = buildCommand()
const v0 = root.commands.find(command => command.name() === 'v0')!
v0.commands.filter(command => command.name() !== 'help').forEach(command => walkCommands(command, ['v0']))

console.log('Docs generated in', DOCS_DIR)
