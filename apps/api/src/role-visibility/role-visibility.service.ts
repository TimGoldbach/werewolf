import { Injectable, NotFoundException } from '@nestjs/common'
import {
  apiError,
  CLASSIC_ROLE_IDS,
  getRole,
  ROLE_CATALOG,
  type RoleVisibility,
  type RoleVisibilityPreset,
} from '@werewolf/shared'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RoleVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hidden roles in catalog order. Rows for ids no longer in the catalog are ignored. */
  async get(): Promise<RoleVisibility> {
    const rows = await this.prisma.hiddenRole.findMany({ select: { roleId: true } })
    const hidden = new Set(rows.map((r) => r.roleId))
    return { hiddenRoleIds: ROLE_CATALOG.filter((r) => hidden.has(r.id)).map((r) => r.id) }
  }

  async setHidden(roleId: string, hidden: boolean): Promise<RoleVisibility> {
    if (!getRole(roleId)) throw new NotFoundException(apiError('ROLE_NOT_FOUND', 'Role not found.'))
    if (hidden) {
      await this.prisma.hiddenRole.upsert({ where: { roleId }, update: {}, create: { roleId } })
    } else {
      await this.prisma.hiddenRole.deleteMany({ where: { roleId } })
    }
    return this.get()
  }

  /** Replaces the whole selection: `classics` hides every non-classic role, `all` shows everything. */
  async applyPreset(preset: RoleVisibilityPreset): Promise<RoleVisibility> {
    const classics = new Set(CLASSIC_ROLE_IDS)
    const hide =
      preset === 'classics' ? ROLE_CATALOG.filter((r) => !classics.has(r.id)).map((r) => r.id) : []
    await this.prisma.$transaction([
      this.prisma.hiddenRole.deleteMany({}),
      this.prisma.hiddenRole.createMany({ data: hide.map((roleId) => ({ roleId })) }),
    ])
    return this.get()
  }
}
