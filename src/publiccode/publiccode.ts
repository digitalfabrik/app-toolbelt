export const getUpdatedPublicCode = (content: string, updates: Record<string, string>): string =>
  Object.entries(updates).reduce((current, [field, value]) => {
    // Matches a top-level (non-indented) `<field>:` key and everything after it on the same line (m),
    // e.g. `softwareVersion: "2025.9.2"` or `releaseDate: "2025-09-01"`.
    const pattern = new RegExp(`^${field}:.*$`, 'm')
    if (!pattern.test(current)) {
      throw new Error(`Could not find a top-level "${field}" field in the publiccode file.`)
    }
    return current.replace(pattern, `${field}: "${value}"`)
  }, content)
