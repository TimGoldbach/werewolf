import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import createNextIntlPlugin from 'next-intl/plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// The release version lives in the root package.json (bumped by release-please).
const { version } = JSON.parse(readFileSync(path.join(dirname, '../../package.json'), 'utf8'))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { APP_VERSION: version },
  output: 'standalone',
  // Monorepo: workspace root, so the standalone build also traces @werewolf/shared.
  outputFileTracingRoot: path.join(dirname, '../../'),
  transpilePackages: ['@werewolf/shared'],
  async redirects() {
    // The rules page used to live at the German path.
    return [{ source: '/regeln', destination: '/rules', permanent: true }]
  },
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || 'http://localhost:3001'
    return [{ source: '/api/:path*', destination: `${api}/:path*` }]
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
