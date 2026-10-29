import { NotFoundException } from '@nestjs/common'
import { CLASSIC_ROLE_IDS, ROLE_CATALOG } from '@werewolf/shared'
import { describe, expect, it } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { RoleVisibilityService } from './role-visibility.service'

/** In-memory stand-in for the HiddenRole table. */
function serviceWith(initial: string[] = []) {
  const table = new Set(initial)
  const hiddenRole = {
    findMany: async () => [...table].map((roleId) => ({ roleId })),
    upsert: async ({ where }: { where: { roleId: string } }) => {
      table.add(where.roleId)
      return { roleId: where.roleId }
    },
    deleteMany: async ({ where }: { where?: { roleId: string } } = {}) => {
      const before = table.size
      if (where) table.delete(where.roleId)
      else table.clear()
      return { count: before - table.size }
    },
    createMany: async ({ data }: { data: { roleId: string }[] }) => {
      for (const row of data) table.add(row.roleId)
      return { count: data.length }
    },
  }
  const prisma = {
    hiddenRole,
    // The operations above apply when called, so the array runs in order like a transaction.
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  }
  return { service: new RoleVisibilityService(prisma as unknown as PrismaService), table }
}

describe('RoleVisibilityService', () => {
  it('shows every role by default', async () => {
    const { service } = serviceWith()
    expect(await service.get()).toEqual({ hiddenRoleIds: [] })
  })

  it('returns hidden roles in catalog order and ignores ids that left the catalog', async () => {
    const { service } = serviceWith(['witch', 'retired-role', 'werewolf'])
    expect((await service.get()).hiddenRoleIds).toEqual(['werewolf', 'witch'])
  })

  it('hides and shows a single role', async () => {
    const { service, table } = serviceWith()
    expect((await service.setHidden('seer', true)).hiddenRoleIds).toEqual(['seer'])
    expect((await service.setHidden('seer', true)).hiddenRoleIds).toEqual(['seer'])
    expect((await service.setHidden('seer', false)).hiddenRoleIds).toEqual([])
    expect(table.size).toBe(0)
  })

  it('treats showing a role that is already visible as a no-op', async () => {
    const { service } = serviceWith(['witch'])
    expect((await service.setHidden('seer', false)).hiddenRoleIds).toEqual(['witch'])
  })

  it('rejects unknown roles with ROLE_NOT_FOUND', async () => {
    const { service, table } = serviceWith()
    const error = await service.setHidden('no-such-role', true).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NotFoundException)
    expect((error as NotFoundException).getResponse()).toMatchObject({ code: 'ROLE_NOT_FOUND' })
    expect(table.size).toBe(0)
  })

  it('"classics" hides everything except the classic base roles', async () => {
    // A hidden classic comes back, a visible special role goes away.
    const { service } = serviceWith(['seer'])
    const { hiddenRoleIds } = await service.applyPreset('classics')
    const visible = ROLE_CATALOG.map((r) => r.id).filter((id) => !hiddenRoleIds.includes(id))
    expect([...visible].sort()).toEqual([...CLASSIC_ROLE_IDS].sort())
    expect(hiddenRoleIds).toHaveLength(ROLE_CATALOG.length - CLASSIC_ROLE_IDS.length)
  })

  it('"all" shows every role again', async () => {
    const { service } = serviceWith()
    await service.applyPreset('classics')
    expect(await service.applyPreset('all')).toEqual({ hiddenRoleIds: [] })
  })
})
