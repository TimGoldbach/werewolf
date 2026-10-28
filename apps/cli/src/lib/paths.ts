import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Root of the git checkout (this file lives in apps/cli/src/lib). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

export interface InstancePaths {
  root: string
  instance: string
  env: string
  envLink: string
  template: string
  branding: string
  backups: string
  launcher: string
}

export function instancePaths(root: string = REPO_ROOT): InstancePaths {
  const instance = join(root, 'instance')
  return {
    root,
    instance,
    env: join(instance, '.env'),
    envLink: join(root, '.env'),
    template: join(root, '.env.example'),
    branding: join(instance, 'branding'),
    backups: join(instance, 'backups'),
    launcher: join(root, 'werewolf'),
  }
}

export const paths = instancePaths()
