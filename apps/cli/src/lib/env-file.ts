// Reading and writing instance/.env in the dialect of docker compose's .env parser:
// unquoted values may not contain spaces or `$`, single quotes are literal, and double
// quotes understand backslash escapes plus `$$` for a literal dollar sign.

export type EnvValues = Record<string, string>

const ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/
const SAFE_UNQUOTED = /^[A-Za-z0-9_./:@+,%-]*$/

/** Marks the template section that only applies to local development (stripped from instance/.env). */
const DEV_SECTION = /^#\s*──\s*Local development only/

export function parseEnv(text: string): EnvValues {
  const values: EnvValues = {}
  for (const line of text.split(/\r?\n/)) {
    const match = ASSIGNMENT.exec(line)
    if (match) values[match[1]] = parseValue(match[2])
  }
  return values
}

export function parseValue(raw: string): string {
  const value = raw.trim()
  if (value.startsWith("'")) {
    const end = value.indexOf("'", 1)
    return end === -1 ? value.slice(1) : value.slice(1, end)
  }
  if (value.startsWith('"')) {
    let result = ''
    for (let i = 1; i < value.length; i++) {
      const char = value[i]
      if (char === '"') break
      if (char === '\\' && i + 1 < value.length) {
        const next = value[++i]
        result += next === 'n' ? '\n' : next === 't' ? '\t' : next
      } else if (char === '$' && value[i + 1] === '$') {
        result += '$'
        i++
      } else {
        result += char
      }
    }
    return result
  }
  // Unquoted: an inline comment starts at " #".
  const comment = value.search(/\s#/)
  const bare = (comment === -1 ? value : value.slice(0, comment)).trim()
  return bare.replaceAll('$$', '$')
}

export function formatValue(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error('Values in .env cannot contain line breaks')
  if (SAFE_UNQUOTED.test(value)) return value
  if (!value.includes("'")) return `'${value}'`
  const escaped = value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('$', '$$$$')
  return `"${escaped}"`
}

/**
 * Sets the given keys in an .env text. Existing assignments keep their position and
 * surrounding comments; new keys are appended at the end.
 */
export function updateEnv(text: string, updates: EnvValues): string {
  const pending = new Map(Object.entries(updates))
  const lines = text.split(/\r?\n/).map((line) => {
    const match = ASSIGNMENT.exec(line)
    if (!match || !pending.has(match[1])) return line
    const key = match[1]
    const value = pending.get(key) as string
    pending.delete(key)
    return `${key}=${formatValue(value)}`
  })
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (pending.size > 0) {
    lines.push('')
    for (const [key, value] of pending) lines.push(`${key}=${formatValue(value)}`)
  }
  return lines.join('\n') + '\n'
}

/** Builds instance/.env from .env.example: drops the development-only section, then sets the values. */
export function renderInstanceEnv(template: string, values: EnvValues): string {
  const lines: string[] = []
  let skipping = false
  for (const line of template.split(/\r?\n/)) {
    if (DEV_SECTION.test(line)) skipping = true
    else if (skipping && /^#\s*──/.test(line)) skipping = false
    if (!skipping) lines.push(line)
  }
  const header = [
    '# Configuration of this werewolf instance, written by ./werewolf setup.',
    '# Change it with ./werewolf config (or edit it and run ./werewolf restart).',
    '',
  ]
  return updateEnv([...header, ...dropLeadingTemplateComment(lines)].join('\n'), values)
}

/** The template starts with a comment about itself; it makes no sense in the generated file. */
function dropLeadingTemplateComment(lines: string[]): string[] {
  let start = 0
  if (lines[0]?.startsWith('# Template for')) {
    while (start < lines.length && lines[start].startsWith('#')) start++
    while (start < lines.length && lines[start] === '') start++
  }
  return lines.slice(start)
}
