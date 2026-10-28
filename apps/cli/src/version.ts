import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from './lib/paths.ts'

/** Version of the checkout; release-please bumps it in the root package.json. */
export function cliVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(paths.root, 'package.json'), 'utf8')) as {
      version?: string
    }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}
