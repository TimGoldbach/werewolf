'use client'

import Link from 'next/link'
import { Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { BrandIcon, useAppName, useBranding } from '@/components/branding'
import { Icon } from '@/components/pixel/icons'
import { PixelIcon } from '@/components/pixel/pixel-icon'
import { Button } from '@/components/ui/button'
import { isNightHour } from '@/lib/day-night'
import { useAmbience } from '@/lib/use-ambience'
import { cn } from '@/lib/utils'

const SOUND_KEY = 'werewolf:home-sound'

// Fixed star positions (x %, y %, size px, delay s) — deterministic, no hydration mismatch.
const STARS: [number, number, number, number][] = [
  [6, 18, 2, 0], [14, 42, 1, 1.2], [21, 12, 2, 2.1], [29, 30, 1, 0.6], [35, 8, 1, 1.8],
  [42, 24, 2, 0.3], [49, 46, 1, 2.6], [55, 14, 1, 1.1], [61, 34, 2, 2.3], [67, 6, 1, 0.9],
  [10, 60, 1, 1.5], [24, 56, 1, 0.2], [47, 62, 1, 1.7], [58, 52, 1, 2.9], [3, 36, 1, 2.4],
  [38, 40, 1, 0.8], [52, 4, 2, 1.4], [70, 48, 1, 0.5], [17, 28, 1, 2.0], [64, 22, 1, 1.0],
]

// Pixel silhouette: forest, village with church tower, forest (height in pixels per column).
const SKYLINE = [
  3, 4, 6, 5, 7, 9, 7, 5, 4, 6, 8, 11, 8, 6, 4, 3, 5, 5, 5, 5, 3, 6, 6, 6, 6, 6, 3, 3, 8, 10, 14, 17,
  10, 8, 8, 3, 4, 7, 7, 7, 7, 4, 4, 5, 5, 5, 3, 3, 5, 7, 10, 7, 5, 6, 9, 12, 9, 6, 5, 7, 6, 4, 3, 4,
]
const SKYLINE_MAX = 18
// Lit windows (column, height above ground)
const WINDOWS: [number, number][] = [
  [18, 2], [23, 3], [24, 3], [31, 9], [38, 3], [39, 3], [44, 2],
]

// Day sky: pixel clouds (top %, width px, duration s, start offset s) and a small flock of birds.
const CLOUD = {
  grid: [
    '......WWWW..........',
    '....WWWWWWWW..WWW...',
    '...WWWWWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    'sWWWWWWWWWWWWWWWWWWs',
    '.ssssssssssssssssss.',
  ],
  palette: { W: '#f6f7ff', s: '#bfd0ec' },
}
const CLOUDS: [number, number, number, number][] = [
  [10, 120, 110, -20], [26, 80, 85, -60], [6, 64, 140, -95], [38, 100, 120, -10],
]
const BIRD = { grid: ['B.....B', '.B...B.', '..B.B..', '...B...'], palette: { B: '#1f2a3d' } }
const BIRDS: [number, number, number][] = [
  [18, 14, 0], [22, 10, 0.25], [15, 9, 0.5],
]

function Skyline({ night }: { night: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${SKYLINE.length} ${SKYLINE_MAX}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-24"
      aria-hidden="true"
    >
      {SKYLINE.map((h, x) => (
        <rect
          key={x}
          x={x}
          y={SKYLINE_MAX - h}
          width={1.02}
          height={h}
          fill={night ? 'hsl(240 12% 3%)' : 'hsl(160 28% 12%)'}
        />
      ))}
      {night &&
        WINDOWS.map(([x, h]) => (
          <rect
            key={`w${x}`}
            x={x}
            y={SKYLINE_MAX - h}
            width={1}
            height={1}
            fill="#ffcf4a"
            className="animate-flicker"
            style={{ animationDelay: `${(x % 5) * 0.7}s` }}
          />
        ))}
    </svg>
  )
}

function NightSky() {
  return (
    <>
      {STARS.map(([x, y, s, d], i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary/25 via-primary/5 to-transparent" />
      <div className="absolute -right-6 top-4 h-48 w-48 rounded-full bg-amber-200/10 blur-3xl sm:right-6" />
      <div className="absolute right-6 top-6 animate-float sm:right-14 sm:top-8">
        <Icon name="moon" size={88} className="drop-shadow-[0_0_24px_rgba(255,224,122,0.45)]" />
      </div>
    </>
  )
}

function DaySky() {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-300/20 via-amber-200/5 to-transparent" />
      <div className="absolute -right-6 top-0 h-56 w-56 animate-glow rounded-full bg-amber-300/25 blur-3xl sm:right-4" />
      {CLOUDS.map(([top, width, duration, offset], i) => (
        <PixelIcon
          key={i}
          grid={CLOUD.grid}
          palette={CLOUD.palette}
          width={width}
          height={(width * CLOUD.grid.length) / CLOUD.grid[0]!.length}
          className="absolute animate-drift opacity-90"
          style={{ top: `${top}%`, left: `${(i * 27) % 90}%`, animationDuration: `${duration}s`, animationDelay: `${offset}s` }}
        />
      ))}
      {BIRDS.map(([top, size, delay], i) => (
        <span
          key={i}
          className="absolute animate-glide"
          style={{ top: `${top}%`, left: `${30 + i * 4}%`, animationDelay: `${-8 - i * 0.6}s` }}
        >
          <PixelIcon
            grid={BIRD.grid}
            palette={BIRD.palette}
            width={size}
            height={(size * 4) / 7}
            className="block animate-flap"
            style={{ animationDelay: `${delay}s` }}
          />
        </span>
      ))}
      {/* Darkens the sky (and passing clouds/birds) behind the text column so it stays readable. */}
      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[hsl(215_60%_12%/0.75)] via-[hsl(215_60%_12%/0.5)] to-[hsl(215_60%_12%/0.3)] sm:w-3/4 sm:to-transparent" />
      <div className="absolute right-6 top-6 animate-float sm:right-14 sm:top-8">
        <Icon name="sun" size={88} className="drop-shadow-[0_0_28px_rgba(255,178,62,0.6)]" />
      </div>
    </>
  )
}

/**
 * Hero of the dashboard: night sky from 21:00 to 08:00, day sky in between, with the matching
 * soundscape. The server picks the scene from the group's time zone; the client re-checks its own clock
 * every minute so the scene (and sound) switches while the page stays open.
 */
export function HomeHero({ initialNight }: { initialNight: boolean }) {
  const t = useTranslations('home.hero')
  const appName = useAppName()
  const { tagline } = useBranding()
  const [night, setNight] = useState(initialNight)
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    const tick = () => setNight(isNightHour(new Date().getHours()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      setSoundOn(localStorage.getItem(SOUND_KEY) !== 'off')
    } catch {
      /* storage unavailable – keep the default */
    }
  }, [])

  useAmbience(night ? 'night' : 'day', soundOn)

  function toggleSound() {
    setSoundOn((on) => {
      try {
        localStorage.setItem(SOUND_KEY, on ? 'off' : 'on')
      } catch {
        /* not persisted – still toggles for this visit */
      }
      return !on
    })
  }

  return (
    <section
      className={cn(
        'relative -mx-4 overflow-hidden border-y border-border bg-gradient-to-b px-6 pb-28 pt-10 transition-colors sm:mx-0 sm:rounded-xl sm:border sm:pb-32 sm:pt-12',
        night
          ? 'from-[hsl(255_45%_10%)] via-[hsl(260_35%_7%)] to-[hsl(240_12%_4%)]'
          : 'from-[hsl(205_65%_42%)] via-[hsl(208_55%_31%)] to-[hsl(215_40%_12%)]',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {night ? <NightSky /> : <DaySky />}
      </div>

      <div
        className={cn(
          'relative flex max-w-md flex-col gap-4',
          !night && '[text-shadow:0_1px_2px_rgba(6,14,30,0.9),0_0_14px_rgba(6,14,30,0.6)]',
        )}
      >
        <span
          className={cn(
            'flex items-center gap-2 text-xs uppercase tracking-widest',
            night ? 'font-medium text-primary' : 'font-semibold text-amber-100',
          )}
        >
          {night ? <BrandIcon size={16} /> : <Icon name="sun" size={16} />} {night ? t('nightFalls') : t('dayBreaks')}
        </span>
        <h1 className="font-pixel text-2xl leading-snug text-foreground sm:text-3xl">{appName}</h1>
        <p className={cn('text-sm sm:text-base', night ? 'text-muted-foreground' : 'text-white/90')}>
          {tagline ?? t('tagline')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/games/new">
            <Button size="lg" className="shadow-[0_0_24px_-4px_hsl(var(--primary))]">
              <Icon name="lantern" size={18} className="mr-2" />
              {t('startGame')}
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button size="lg" variant="secondary">
              {t('toLeaderboard')}
            </Button>
          </Link>
        </div>
      </div>

      <Skyline night={night} />

      {/* Small sound switch on the skyline; sound starts with the first tap on the page. */}
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? t('soundOff') : t('soundOn')}
        title={t(soundOn ? 'ambienceOn' : 'ambienceOff', { scene: night ? 'night' : 'day' })}
        className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </section>
  )
}
