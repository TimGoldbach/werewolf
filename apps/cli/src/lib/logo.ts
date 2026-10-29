import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export type LogoKind = 'svg' | 'png'
export const LOGO_KINDS: LogoKind[] = ['svg', 'png']
export const MIN_PNG_SIZE = 512
export const MAX_LOGO_BYTES = 5 * 1024 * 1024

export type LogoProblem =
  | 'missing'
  | 'notAFile'
  | 'tooBig'
  | 'format'
  | 'svgUnsafe'
  | 'pngNotSquare'
  | 'pngTooSmall'

export type LogoCheck =
  | { ok: true; kind: LogoKind; path: string; width?: number; height?: number }
  | { ok: false; problem: LogoProblem; width?: number; height?: number }

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Resolves ~ and relative paths against the directory the CLI was started from. */
export function resolveUserPath(input: string, cwd = process.cwd()): string {
  const trimmed = input.trim().replace(/^['"]|['"]$/g, '')
  if (trimmed === '~') return homedir()
  if (trimmed.startsWith('~/')) return join(homedir(), trimmed.slice(2))
  return resolve(cwd, trimmed)
}

/** A logo is an SVG without scripts, or a square PNG of at least 512 px. */
export function checkLogo(input: string, cwd?: string): LogoCheck {
  const path = resolveUserPath(input, cwd)
  if (!existsSync(path)) return { ok: false, problem: 'missing' }
  const stat = statSync(path)
  if (!stat.isFile()) return { ok: false, problem: 'notAFile' }
  if (stat.size > MAX_LOGO_BYTES) return { ok: false, problem: 'tooBig' }
  const data = readFileSync(path)

  if (data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    // The IHDR chunk always comes first: width and height are big-endian at bytes 16 and 20.
    if (data.length < 24 || data.toString('ascii', 12, 16) !== 'IHDR')
      return { ok: false, problem: 'format' }
    const width = data.readUInt32BE(16)
    const height = data.readUInt32BE(20)
    if (width !== height) return { ok: false, problem: 'pngNotSquare', width, height }
    if (width < MIN_PNG_SIZE) return { ok: false, problem: 'pngTooSmall', width, height }
    return { ok: true, kind: 'png', path, width, height }
  }

  const text = data.toString('utf8')
  if (!isSvg(text)) return { ok: false, problem: 'format' }
  if (hasActiveContent(text)) return { ok: false, problem: 'svgUnsafe' }
  return { ok: true, kind: 'svg', path }
}

function isSvg(text: string): boolean {
  // Skip a BOM, the XML declaration, comments and a doctype before the root element.
  const head = text
    .replace(/^﻿/, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trimStart()
  return /^<svg[\s>]/i.test(head)
}

/** Scripts, event handlers and embedded HTML would run when the logo is opened directly. */
function hasActiveContent(text: string): boolean {
  return /<script[\s>]|<foreignObject[\s>]|\son[a-z]+\s*=|javascript:/i.test(text)
}

export function logoFile(brandingDir: string, kind: LogoKind): string {
  return join(brandingDir, `logo.${kind}`)
}

/** The logo currently installed in instance/branding, if any. */
export function currentLogo(brandingDir: string): { kind: LogoKind; path: string } | undefined {
  for (const kind of LOGO_KINDS) {
    const path = logoFile(brandingDir, kind)
    if (existsSync(path)) return { kind, path }
  }
  return undefined
}

/** Copies a checked logo to instance/branding/logo.<kind> and removes any other variant. */
export function installLogo(brandingDir: string, source: string, kind: LogoKind): string {
  mkdirSync(brandingDir, { recursive: true })
  removeLogo(brandingDir)
  const target = logoFile(brandingDir, kind)
  copyFileSync(source, target)
  return target
}

export function removeLogo(brandingDir: string): void {
  for (const kind of LOGO_KINDS) rmSync(logoFile(brandingDir, kind), { force: true })
}
