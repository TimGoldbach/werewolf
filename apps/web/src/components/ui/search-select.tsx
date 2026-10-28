'use client'

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SearchOption {
  value: string
  label: string
  /** group key (e.g. role category); optional */
  group?: string
  /** additional searchable text (e.g. alias names) */
  keywords?: string
}

/** closes on a click outside or on Escape */
function useDismiss(ref: React.RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, onClose])
}

function matches(o: SearchOption, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = `${o.label} ${o.keywords ?? ''}`.toLowerCase()
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t))
}

/** filters + groups the options in the requested group order */
function useGrouped(options: SearchOption[], query: string, groupOrder?: string[]) {
  return React.useMemo(() => {
    const filtered = options.filter((o) => matches(o, query))
    const byGroup = new Map<string, SearchOption[]>()
    for (const o of filtered) {
      const key = o.group ?? ''
      const list = byGroup.get(key)
      if (list) list.push(o)
      else byGroup.set(key, [o])
    }
    const order = groupOrder ?? [...byGroup.keys()]
    const groups = [...byGroup.keys()].sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
    })
    return { filtered, groups: groups.map((g) => ({ key: g, options: byGroup.get(g)! })) }
  }, [options, query, groupOrder])
}

const triggerClass =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const panelClass =
  'absolute z-50 mt-1 flex max-h-80 w-full flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg'

const searchClass =
  'h-10 w-full border-b border-border bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground'

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 bg-card px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

interface CommonProps {
  options: SearchOption[]
  groupOrder?: string[]
  groupLabels?: Record<string, string>
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

/**
 * Searchable single select. Replaces a native `<select>` when the list (e.g.
 * 120+ roles) is too long to scroll.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  groupOrder,
  groupLabels,
  searchPlaceholder,
  emptyText,
  className,
  disabled,
}: CommonProps & {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const t = useTranslations('ui')
  const ref = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  useDismiss(ref, open, () => setOpen(false))

  const { groups, filtered } = useGrouped(options, query, groupOrder)
  const selected = options.find((o) => o.value === value)

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <span aria-hidden className="text-muted-foreground">
          ▾
        </span>
      </button>
      {open && (
        <div className={panelClass}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t('searchPlaceholder')}
            className={searchClass}
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">{emptyText ?? t('noMatch')}</p>
            )}
            {groups.map((g) => (
              <div key={g.key}>
                {g.key && <GroupLabel>{groupLabels?.[g.key] ?? g.key}</GroupLabel>}
                {g.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pick(o.value)}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      o.value === value && 'bg-accent/60',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
