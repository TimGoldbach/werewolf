import { getTranslations } from 'next-intl/server'
import { RoleSettings } from '@/components/role-settings'
import { fetchHiddenRoleIds } from '@/lib/server-api'

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  const [t, hiddenRoleIds] = await Promise.all([
    getTranslations('roleSettings'),
    fetchHiddenRoleIds(),
  ])
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
      </div>
      <RoleSettings initialHidden={hiddenRoleIds} />
    </div>
  )
}
