import { join } from 'node:path'
import * as p from '@clack/prompts'
import {
  checkHealth,
  composeUp,
  instanceUrls,
  planImages,
  prepareImages,
  requireInstance,
  setImageTag,
} from '../instance.ts'
import { readInstanceEnv } from '../lib/docker.ts'
import type { EnvValues } from '../lib/env-file.ts'
import { CancelledError, CliError } from '../lib/errors.ts'
import {
  checkout,
  checkoutVersion,
  currentRef,
  fetchTags,
  git,
  localChanges,
  localTags,
  nearestTag,
  releaseTag,
  showFile,
  tagExists,
} from '../lib/git.ts'
import { paths } from '../lib/paths.ts'
import { run, tail } from '../lib/proc.ts'
import { spinner } from '../lib/progress.ts'
import { settingsFromEnv } from '../lib/settings.ts'
import { pc } from '../lib/ui.ts'
import {
  type ChangelogEntry,
  changelogBetween,
  newestRelease,
  simplifyChangelogLine,
} from '../lib/versions.ts'
import { replaceDatabase, shownPath, takeBackup } from '../maintenance.ts'
import { confirm } from '../questions.ts'
import { type Command, type Context, booleanFlag, stringFlag, yesOption } from './types.ts'

const MAX_CHANGELOG_LINES = 40

export const update: Command = {
  name: 'update',
  group: 'maintenance',
  summary: (m) => m.commands.update,
  options: [
    { name: 'to', type: 'string', value: '<version>', description: (m) => m.flags.to },
    { name: 'build', type: 'boolean', description: (m) => m.flags.build },
    { name: 'pull', type: 'boolean', description: (m) => m.flags.pull },
    yesOption,
    { name: 'force', type: 'boolean', description: (m) => m.flags.forceDowngrade },
  ],
  examples: ['update', 'update --to v1.2.0', 'update --yes'],
  asks: true,
  async run(ctx) {
    const env = requireInstance(ctx)
    p.intro(pc.inverse(' werewolf update '))

    const changes = await localChanges()
    if (changes.length > 0) {
      throw new CliError(ctx.m.update.dirty, `${changes.join('\n')}\n\n${ctx.m.update.dirtyHint}`)
    }

    const fetching = spinner()
    fetching.start(ctx.m.update.fetching)
    const fetched = await fetchTags()
    if (fetched.code !== 0) {
      fetching.error(ctx.m.update.fetchFailed)
      throw new CliError(ctx.m.update.fetchFailed, tail(fetched.output))
    }
    fetching.stop(ctx.m.update.fetched)

    const target = await chooseTarget(ctx)
    if (!target) {
      p.outro(ctx.m.update.noReleases)
      return
    }
    const from = await releaseTag()
    const fromLabel = from ?? (await checkoutVersion()) ?? 'HEAD'
    const head = await currentRef()
    const targetSha = (await git(['rev-parse', `${target}^{commit}`])).stdout.trim()
    if (targetSha === head.sha) {
      p.outro(ctx.m.update.upToDate(target))
      return
    }
    // Migrations only go forward, so an older version cannot run on this database.
    const isOlder = (await git(['merge-base', '--is-ancestor', targetSha, head.sha])).code === 0
    if (isOlder && !booleanFlag(ctx, 'force')) {
      throw new CliError(ctx.m.update.downgrade(fromLabel, target), ctx.m.update.downgradeHint)
    }

    showChangelog(ctx, fromLabel, target, await changelogFor(from, target))
    if (ctx.interactive && !(await confirm(ctx, ctx.m.update.confirm(target)))) {
      throw new CancelledError()
    }

    const backup = await takeBackup(ctx, env, 'pre-update')
    const previous = { ref: head.branch ?? head.sha, imageTag: env.IMAGE_TAG || 'latest' }

    const switching = spinner()
    switching.start(ctx.m.update.checkingOut(target))
    const switched = await checkout(target)
    if (switched.code !== 0) {
      switching.error(ctx.m.update.checkoutFailed)
      throw new CliError(ctx.m.update.checkoutFailed, tail(switched.output))
    }
    switching.stop(ctx.m.update.checkedOut(target))

    // Getting the images does not touch the running containers, so a failure here only
    // needs the checkout and IMAGE_TAG put back.
    let imageTag: string
    try {
      const plan = await planImages(ctx)
      setImageTag(plan.tag)
      imageTag = plan.tag
      await prepareImages(ctx, plan)
      imageTag = readInstanceEnv()?.IMAGE_TAG ?? plan.tag
    } catch (error) {
      await checkout(previous.ref)
      setImageTag(previous.imageTag)
      p.log.info(ctx.m.update.nothingChanged(fromLabel))
      throw error
    }

    try {
      await composeUp(ctx, { start: ctx.m.update.starting, done: ctx.m.update.started })
      await checkHealth(ctx, settingsFromEnv(readInstanceEnv() ?? env))
    } catch (error) {
      p.log.error(ctx.m.update.failed)
      if (error instanceof CliError) p.log.message(pc.dim(error.message))
      await rollback(ctx, previous, backup.name, fromLabel)
      if (previous.imageTag !== imageTag) await removeImages(env, imageTag)
      throw new CliError(ctx.m.update.rolledBack(fromLabel), ctx.m.update.rolledBackHint(ctx.bin))
    }

    if (previous.imageTag !== imageTag) await removeImages(env, previous.imageTag)
    const { open } = instanceUrls(settingsFromEnv(readInstanceEnv() ?? env))
    p.log.success(ctx.m.update.done(fromLabel, target))
    p.outro(open ? pc.cyan(open) : undefined)
  },
}

async function chooseTarget(ctx: Context): Promise<string | undefined> {
  const wanted = stringFlag(ctx, 'to')?.trim()
  if (wanted) {
    const tag = /^\d/.test(wanted) ? `v${wanted}` : wanted
    if (!(await tagExists(tag))) {
      const newest = newestRelease(await localTags())
      throw new CliError(
        ctx.m.update.unknownTag(tag),
        newest ? ctx.m.update.newestIs(newest) : undefined,
      )
    }
    return tag
  }
  return newestRelease(await localTags())
}

/** CHANGELOG.md as of the target, from the installed release (or the nearest one) on. */
async function changelogFor(from: string | undefined, target: string): Promise<ChangelogEntry[]> {
  const markdown = await showFile(target, 'CHANGELOG.md')
  if (!markdown) return []
  return changelogBetween(markdown, from ?? (await nearestTag()), target)
}

function showChangelog(ctx: Context, from: string, to: string, entries: ChangelogEntry[]): void {
  const title = ctx.m.update.changesTitle(from, to)
  if (entries.length === 0) {
    p.note(pc.dim(ctx.m.update.noChangelog), title)
    return
  }
  const lines: string[] = []
  for (const entry of entries) {
    if (lines.length > 0) lines.push('')
    lines.push(
      pc.bold(pc.magenta(`v${entry.version}`)) + (entry.date ? pc.dim(`  ${entry.date}`) : ''),
    )
    for (const line of entry.body.split('\n')) {
      if (!line.trim()) continue
      const text = simplifyChangelogLine(line).replace(/\*\*(.+?)\*\*/g, (_, bold: string) =>
        pc.bold(bold),
      )
      lines.push(text.startsWith('### ') ? pc.bold(text.slice(4)) : text)
    }
  }
  const shown =
    lines.length > MAX_CHANGELOG_LINES
      ? [
          ...lines.slice(0, MAX_CHANGELOG_LINES),
          pc.dim(ctx.m.update.moreChanges(lines.length - MAX_CHANGELOG_LINES)),
        ]
      : lines
  p.note(shown.join('\n'), title)
}

/** Back to the previous checkout and images, with the database from before the update. */
async function rollback(
  ctx: Context,
  previous: { ref: string; imageTag: string },
  backupName: string,
  fromLabel: string,
): Promise<void> {
  p.log.step(pc.bold(ctx.m.update.rollingBack(fromLabel)))
  try {
    const back = await checkout(previous.ref)
    if (back.code !== 0) throw new CliError(ctx.m.update.checkoutFailed, tail(back.output))
    setImageTag(previous.imageTag)
    await replaceDatabase(ctx, backupName)
  } catch (error) {
    const detail =
      error instanceof CliError ? `${error.message}\n${error.hint ?? ''}` : String(error)
    throw new CliError(
      ctx.m.update.rollbackFailed,
      `${detail.trim()}\n\n${ctx.m.update.manualRollback(previous.ref, shownPath(join(paths.backups, backupName)), ctx.bin)}`,
    )
  }
}

/** Frees the disk space of the images that ran before the update (best effort). */
async function removeImages(env: EnvValues, tag: string): Promise<void> {
  const prefix = env.IMAGE_PREFIX || 'ghcr.io/timgoldbach/werewolf'
  await run('docker', ['image', 'rm', `${prefix}-api:${tag}`, `${prefix}-web:${tag}`])
}
