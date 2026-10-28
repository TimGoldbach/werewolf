import pc from 'picocolors'
import { encode, renderUnicodeCompact } from 'uqr'

// ── Colours ──────────────────────────────────────────────────────────────────

type Rgb = [number, number, number]
type Depth = 'none' | '256' | 'truecolor'

function colorDepth(): Depth {
  if (!pc.isColorSupported) return 'none'
  const colorterm = process.env.COLORTERM ?? ''
  if (/truecolor|24bit/i.test(colorterm)) return 'truecolor'
  if (/^(iTerm\.app|WezTerm|vscode|ghostty|Hyper)$/.test(process.env.TERM_PROGRAM ?? ''))
    return 'truecolor'
  return '256'
}

const depth = colorDepth()

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Nearest colour of the xterm 256 palette (6×6×6 cube or grey ramp). */
function toAnsi256([r, g, b]: Rgb): number {
  if (Math.max(r, g, b) - Math.min(r, g, b) < 12) {
    const grey = Math.round((r + g + b) / 3)
    if (grey < 8) return 16
    if (grey > 248) return 231
    return 232 + Math.round(((grey - 8) / 247) * 23)
  }
  const level = (c: number): number => Math.round((c / 255) * 5)
  return 16 + 36 * level(r) + 6 * level(g) + level(b)
}

function sgr(hex: string, layer: 'fg' | 'bg'): string {
  if (depth === 'none') return ''
  const rgb = hexToRgb(hex)
  const base = layer === 'fg' ? 38 : 48
  return depth === 'truecolor'
    ? `\x1b[${base};2;${rgb.join(';')}m`
    : `\x1b[${base};5;${toAnsi256(rgb)}m`
}

const RESET = '\x1b[0m'

/** Colours text with an arbitrary hex colour (falls back to the 256-colour palette). */
export function hex(color: string): (text: string) => string {
  return (text) => (depth === 'none' ? text : `${sgr(color, 'fg')}${text}\x1b[39m`)
}

/** A small filled block in the given colour, e.g. for accent previews. */
export function swatch(color: string, width = 2): string {
  return depth === 'none' ? '' : `${sgr(color, 'fg')}${'█'.repeat(width)}\x1b[39m`
}

export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

// ── Pixel art ────────────────────────────────────────────────────────────────

/**
 * Renders pixel rows with half blocks: every terminal line shows two pixel rows, so pixels
 * come out roughly square. '.' is transparent; other characters are looked up in the palette.
 */
export function renderPixels(rows: string[], palette: Record<string, string>): string[] {
  const lines: string[] = []
  for (let y = 0; y < rows.length; y += 2) {
    const top = rows[y]
    const bottom = rows[y + 1] ?? ''
    let line = ''
    for (let x = 0; x < top.length; x++) {
      const t = palette[top[x]]
      const b = palette[bottom[x] ?? '.']
      if (depth === 'none') line += t && b ? '█' : t ? '▀' : b ? '▄' : ' '
      else if (!t && !b) line += ' '
      else if (t && !b) line += `${sgr(t, 'fg')}▀${RESET}`
      else if (!t && b) line += `${sgr(b, 'fg')}▄${RESET}`
      else if (t === b) line += `${sgr(t as string, 'fg')}█${RESET}`
      else line += `${sgr(t as string, 'fg')}${sgr(b as string, 'bg')}▀${RESET}`
    }
    lines.push(line)
  }
  return lines
}

// prettier-ignore
const WOLF = [
  '.D............D.',
  '.DD..........DD.',
  '.DiD........DiD.',
  '.DiiD......DiiD.',
  '.DiiDDDDDDDDiiD.',
  '.DDMMMMMMMMMMDD.',
  'DMMMMMMMMMMMMMMD',
  'DMDDDMMMMMMDDDMD',
  'DMMYYDMMMMDYYMMD',
  'DMMMMMMLLMMMMMMD',
  '.DMMMMLLLLMMMMD.',
  '.DDMMLLLLLLMMDD.',
  '..DDLLLKKLLLDD..',
  '...DDLLLLLLDD...',
  '....DDLLLLDD....',
  '......DDDD......',
]

// 5-pixel-high letters for the word mark.
// prettier-ignore
const GLYPHS: Record<string, string[]> = {
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  E: ['####', '#...', '###.', '#...', '####'],
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  L: ['#...', '#...', '#...', '#...', '####'],
  F: ['####', '#...', '###.', '#...', '#...'],
}

function wordMark(word: string, from: string, to: string): string[] {
  const rows = ['', '', '', '', '']
  for (const [i, letter] of [...word].entries()) {
    const glyph = GLYPHS[letter]
    for (let r = 0; r < 5; r++) rows[r] += (i > 0 ? '.' : '') + glyph[r]
  }
  // Horizontal gradient: one palette entry per column.
  const width = rows[0].length
  const palette: Record<string, string> = {}
  const symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const coloured = rows.map((row) =>
    [...row].map((cell, x) => (cell === '#' ? symbols[x % symbols.length] : '.')).join(''),
  )
  for (let x = 0; x < width; x++)
    palette[symbols[x % symbols.length]] = mix(from, to, x / (width - 1))
  return renderPixels(coloured, palette)
}

function mix(from: string, to: string, ratio: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const channel = (i: number): string =>
    Math.round(a[i] + (b[i] - a[i]) * ratio)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** The pixel wolf next to the WEREWOLF word mark, tinted with the accent colour. */
export function banner(subtitle: string, accent = '#8b5cf6'): string {
  if (depth === 'none' || !process.stdout.isTTY) {
    return `\n  WEREWOLF · ${subtitle}\n`
  }
  const wolf = renderPixels(WOLF, {
    D: '#374151',
    M: '#9ca3af',
    L: '#e5e7eb',
    i: accent,
    Y: '#facc15',
    K: '#111827',
  })
  const mark = wordMark('WEREWOLF', mix(accent, '#ffffff', 0.45), accent)
  const right = ['', '', ...mark, '', pc.dim(subtitle), '']
  const lines = wolf.map((line, i) => `  ${line}   ${right[i] ?? ''}`)
  return `\n${lines.join('\n')}\n`
}

// ── Layout helpers ───────────────────────────────────────────────────────────

/** Two aligned columns: dim labels on the left, values on the right. */
export function keyValues(rows: [string, string][], indent = ''): string {
  const width = Math.max(...rows.map(([key]) => stripAnsi(key).length))
  return rows
    .map(([key, value]) => {
      const pad = ' '.repeat(width - stripAnsi(key).length)
      const continuation = `\n${indent}${' '.repeat(width + 3)}`
      return `${indent}${pc.dim(key)}${pad}   ${value.split('\n').join(continuation)}`
    })
    .join('\n')
}

/** Shell commands in a consistent colour. */
export function cmd(text: string): string {
  return pc.cyan(text)
}

/**
 * A QR code made of half blocks. With colours it is drawn black on white, which scanners read
 * on dark and light terminals alike.
 */
export function qrCode(text: string): string {
  if (depth === 'none') return renderUnicodeCompact(text, { border: 2, ecc: 'M' })
  const { data } = encode(text, { border: 2, ecc: 'M' })
  const rows = data.map((row) => row.map((dark) => (dark ? 'K' : 'W')).join(''))
  return renderPixels(rows, { K: '#000000', W: '#ffffff' }).join('\n')
}

export { pc }
