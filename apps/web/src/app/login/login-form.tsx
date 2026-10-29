'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandIcon, useAppName } from '@/components/branding'
import { Icon } from '@/components/pixel/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { clientFetch, useErrorText } from '@/lib/client-api'

export function LoginForm() {
  const t = useTranslations('login')
  const appName = useAppName()
  const errorText = useErrorText()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await clientFetch('/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(errorText(err))
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BrandIcon size={30} />
          <span className="font-pixel text-sm">{appName}</span>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
        <div className="mt-2 flex gap-2 opacity-80">
          <Icon name="moon" size={18} />
          <Icon name="potion-heal" size={18} />
          <Icon name="potion-poison" size={18} />
          <Icon name="heart" size={18} />
          <Icon name="eye" size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            placeholder={t('passwordPlaceholder')}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !password}>
            {loading ? t('submitting') : t('submit')}
          </Button>
        </form>
        <Link
          href="/rules"
          className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="book" size={16} /> {t('rulesLink')}
        </Link>
      </CardContent>
    </Card>
  )
}
