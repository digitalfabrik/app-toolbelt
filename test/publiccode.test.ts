import { updatePublicCode } from '../src/publiccode/publiccode.js'

const EXAMPLE_PUBLICCODE = `publiccodeYmlVersion: "0.4.0"
name: Entitlementcard
url: "https://github.com/digitalfabrik/entitlementcard.git"
softwareVersion: "2025.9.2"
releaseDate: "2025-09-01"
platforms:
  - web
  - ios
  - android
description:
  en:
    shortDescription: The app allows accepting stores to validate that card holders are entitled to benefits.
    longDescription: >
           Benefit card for volunteers or socially vulnerable groups in Germany.
`

describe('updatePublicCode', () => {
  it('replaces the given fields while leaving the rest of the file untouched', () => {
    const result = updatePublicCode(EXAMPLE_PUBLICCODE, { softwareVersion: '2025.10.1', releaseDate: '2025-10-15' })
    expect(result).toContain('softwareVersion: "2025.10.1"')
    expect(result).toContain('releaseDate: "2025-10-15"')
    expect(result).toContain('longDescription: >')
  })

  it('supports updating a single field', () => {
    const result = updatePublicCode(EXAMPLE_PUBLICCODE, { softwareVersion: '2025.10.1' })
    expect(result).toContain('softwareVersion: "2025.10.1"')
    expect(result).toContain('releaseDate: "2025-09-01"')
  })

  it('throws if a given field does not exist as a top-level key', () => {
    expect(() => updatePublicCode('name: Foo\n', { softwareVersion: '2025.10.1' })).toThrow(
      'Could not find a top-level "softwareVersion" field',
    )
  })

  it('does not match an indented (nested) field with the same name', () => {
    const content = 'name: Foo\nnested:\n  softwareVersion: "1.0.0"\n'
    expect(() => updatePublicCode(content, { softwareVersion: '2025.10.1' })).toThrow()
  })
})
