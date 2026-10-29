import { paths } from './paths.ts'
import { run, type RunResult } from './proc.ts'
import { parseLsRemoteTags } from './versions.ts'

export const REMOTE = 'origin'

export function git(args: string[], timeoutMs?: number): Promise<RunResult> {
  return run('git', args, { cwd: paths.root, timeoutMs })
}

/** The release tag checked out at HEAD (e.g. v1.2.0), if HEAD is exactly on one. */
export async function releaseTag(ref = 'HEAD'): Promise<string | undefined> {
  const result = await git(['describe', '--tags', '--exact-match', ref])
  const tag = result.stdout.trim()
  return result.code === 0 && /^v\d+\.\d+\.\d+/.test(tag) ? tag : undefined
}

/** The nearest release tag at or before HEAD. */
export async function nearestTag(): Promise<string | undefined> {
  const result = await git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'])
  return result.code === 0 ? result.stdout.trim() : undefined
}

/** Human-readable version of the checkout, e.g. v1.2.0 or v1.2.0-3-gabc1234. */
export async function checkoutVersion(): Promise<string | undefined> {
  const result = await git(['describe', '--tags', '--always', '--dirty'])
  return result.code === 0 ? result.stdout.trim() : undefined
}

export async function shortSha(ref = 'HEAD'): Promise<string | undefined> {
  const result = await git(['rev-parse', '--short', ref])
  return result.code === 0 ? result.stdout.trim() : undefined
}

/** Where HEAD is now, to come back to it: the branch if there is one, else the commit. */
export async function currentRef(): Promise<{ sha: string; branch?: string }> {
  const sha = (await git(['rev-parse', 'HEAD'])).stdout.trim()
  const branch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'])
  return { sha, branch: branch.code === 0 ? branch.stdout.trim() : undefined }
}

/**
 * Changed tracked files, which a checkout could overwrite. instance/ is ignored by git anyway;
 * it is filtered as well in case someone force-added files there.
 */
export async function localChanges(): Promise<string[]> {
  const result = await git(['status', '--porcelain', '--untracked-files=no'])
  return result.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.slice(3).startsWith('instance/'))
}

export async function localTags(): Promise<string[]> {
  const result = await git(['tag', '--list', 'v*'])
  return result.stdout
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function fetchTags(): Promise<RunResult> {
  return git(['fetch', '--tags', '--quiet', REMOTE], 120_000)
}

/** Release tags on the remote, or undefined when it cannot be reached in time. */
export async function remoteTags(timeoutMs = 8000): Promise<string[] | undefined> {
  const result = await git(['ls-remote', '--tags', '--refs', REMOTE], timeoutMs)
  return result.code === 0 ? parseLsRemoteTags(result.stdout) : undefined
}

export async function tagExists(tag: string): Promise<boolean> {
  return (await git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])).code === 0
}

export async function showFile(ref: string, file: string): Promise<string | undefined> {
  const result = await git(['show', `${ref}:${file}`])
  return result.code === 0 ? result.stdout : undefined
}

export function checkout(ref: string): Promise<RunResult> {
  return git(['-c', 'advice.detachedHead=false', 'checkout', '--quiet', ref])
}
