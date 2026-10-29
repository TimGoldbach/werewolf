import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { checkLogo, currentLogo, installLogo, removeLogo } from './logo.ts'

const dir = mkdtempSync(join(tmpdir(), 'werewolf-logo-'))

/** A PNG header (signature + IHDR) is all checkLogo reads. */
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0)
  header.writeUInt32BE(13, 8)
  header.write('IHDR', 12, 'ascii')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

function file(name: string, content: string | Buffer): string {
  const path = join(dir, name)
  writeFileSync(path, content)
  return path
}

describe('checkLogo', () => {
  it('accepts an SVG, also with XML declaration and comments', () => {
    const svg = file(
      'logo.svg',
      '<?xml version="1.0"?>\n<!-- wolf -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    )
    assert.deepEqual(checkLogo(svg), { ok: true, kind: 'svg', path: svg })
  })

  it('rejects SVGs with scripts or event handlers', () => {
    const script = file('script.svg', '<svg><script>alert(1)</script></svg>')
    const handler = file('handler.svg', '<svg onload="alert(1)"></svg>')
    assert.deepEqual(checkLogo(script), { ok: false, problem: 'svgUnsafe' })
    assert.deepEqual(checkLogo(handler), { ok: false, problem: 'svgUnsafe' })
  })

  it('accepts square PNGs of at least 512 px', () => {
    const path = file('ok.png', png(512, 512))
    assert.deepEqual(checkLogo(path), { ok: true, kind: 'png', path, width: 512, height: 512 })
  })

  it('rejects small or non-square PNGs', () => {
    assert.equal(
      (checkLogo(file('small.png', png(256, 256))) as { problem: string }).problem,
      'pngTooSmall',
    )
    assert.equal(
      (checkLogo(file('wide.png', png(1024, 512))) as { problem: string }).problem,
      'pngNotSquare',
    )
  })

  it('rejects other formats and missing files', () => {
    assert.deepEqual(checkLogo(file('logo.jpg', Buffer.from([0xff, 0xd8, 0xff]))), {
      ok: false,
      problem: 'format',
    })
    assert.deepEqual(checkLogo(join(dir, 'nope.svg')), { ok: false, problem: 'missing' })
    assert.deepEqual(checkLogo(dir), { ok: false, problem: 'notAFile' })
  })

  it('resolves paths relative to the given directory', () => {
    file('relative.svg', '<svg></svg>')
    assert.equal(checkLogo('relative.svg', dir).ok, true)
  })
})

describe('installLogo', () => {
  it('keeps exactly one logo variant in the branding directory', () => {
    const branding = join(dir, 'branding')
    installLogo(branding, file('a.svg', '<svg></svg>'), 'svg')
    assert.equal(currentLogo(branding)?.kind, 'svg')
    installLogo(branding, file('b.png', png(600, 600)), 'png')
    assert.equal(currentLogo(branding)?.kind, 'png')
    assert.equal(existsSync(join(branding, 'logo.svg')), false)
    removeLogo(branding)
    assert.equal(currentLogo(branding), undefined)
  })
})
