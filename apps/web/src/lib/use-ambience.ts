'use client'

import { useEffect, useRef, useState } from 'react'

export type AmbienceTrack = 'day' | 'night'

const TRACKS: Record<AmbienceTrack, string> = {
  day: '/audio/day-ambience.mp3',
  night: '/audio/night-ambience.mp3',
}
const TRACK_IDS = Object.keys(TRACKS) as AmbienceTrack[]
const FANFARE = '/audio/day-fanfare.mp3'
const HOWLS = [1, 2, 3, 4].map((n) => `/audio/night-howl-${n}.mp3`)
const VOLUME = 0.6
const ONE_SHOT_VOLUME = 0.6
const FADE_IN_S = 4
const FADE_OUT_S = 2.5
const MUTE_FADE_S = 0.6

type Channel = { audio: HTMLAudioElement; gain: GainNode }
type Engine = {
  ctx: AudioContext
  channels: Record<AmbienceTrack, Channel>
  fanfare: Channel
  howls: Channel[]
}

function createEngine(): Engine | null {
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const channel = (src: string, loop: boolean): Channel => {
    const audio = new Audio(src)
    audio.loop = loop
    audio.preload = 'auto'
    // Volume goes through a GainNode: iOS ignores HTMLMediaElement.volume, so fades would not work there.
    const gain = ctx.createGain()
    gain.gain.value = 0
    ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination)
    return { audio, gain }
  }
  return {
    ctx,
    channels: { day: channel(TRACKS.day, true), night: channel(TRACKS.night, true) },
    fanfare: channel(FANFARE, false),
    howls: HOWLS.map((src) => channel(src, false)),
  }
}

const oneShots = (engine: Engine) => [engine.fanfare, ...engine.howls]

/**
 * Looping soundscape for the current phase: village by day, night sounds by night, `null` for
 * silence. On a phase change the old track fades out while the new one fades in; night → day is
 * announced with a fanfare, day → night with a randomly picked wolf howl. Switching `enabled` off
 * fades everything out quickly. Browsers only allow audio after a user gesture, so the audio graph
 * is set up on the first tap/key press on the page; until then nothing plays.
 */
export function useAmbience(active: AmbienceTrack | null, enabled: boolean) {
  const muted = !enabled
  const [unlocked, setUnlocked] = useState(false)
  const engineRef = useRef<Engine | null>(null)
  const pauseTimers = useRef<Partial<Record<AmbienceTrack, ReturnType<typeof setTimeout>>>>({})
  const prevMuted = useRef(muted)
  const prevActive = useRef(active)
  // One-shots that were triggered for real, so the silent priming below leaves them playing.
  const requested = useRef(new Set<HTMLAudioElement>())
  const lastHowl = useRef(-1)

  useEffect(() => {
    if (unlocked) return
    const unlock = () => {
      const engine = engineRef.current ?? createEngine()
      if (!engine) return
      engineRef.current = engine
      void engine.ctx.resume()
      // Start every element once inside the gesture (silent, gain is 0) so Safari allows later
      // programmatic play() calls; the fade effect below pauses the loops that should not play.
      for (const track of TRACK_IDS) engine.channels[track].audio.play().catch(() => {})
      for (const { audio } of oneShots(engine)) {
        audio
          .play()
          .then(() => {
            if (requested.current.has(audio)) return
            audio.pause()
            audio.currentTime = 0
          })
          .catch(() => {})
      }
      setUnlocked(true)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [unlocked])

  useEffect(() => {
    const muteToggled = prevMuted.current !== muted
    prevMuted.current = muted
    const engine = engineRef.current
    if (!engine) return
    const now = engine.ctx.currentTime
    for (const track of TRACK_IDS) {
      const { audio, gain } = engine.channels[track]
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      clearTimeout(pauseTimers.current[track])
      if (unlocked && !muted && track === active) {
        void engine.ctx.resume()
        audio.play().catch(() => {})
        gain.gain.linearRampToValueAtTime(VOLUME, now + (muteToggled ? MUTE_FADE_S : FADE_IN_S))
      } else {
        const fade = muteToggled ? MUTE_FADE_S : FADE_OUT_S
        gain.gain.setTargetAtTime(0, now, fade / 4)
        pauseTimers.current[track] = setTimeout(() => audio.pause(), fade * 1000)
      }
    }
    if (muted) for (const { audio } of oneShots(engine)) audio.pause()
  }, [active, muted, unlocked])

  // Phase change: the one-shot plays over the new track fading in.
  useEffect(() => {
    const from = prevActive.current
    prevActive.current = active
    const engine = engineRef.current
    if (muted || !engine) return
    let shot: Channel | undefined
    if (from === 'night' && active === 'day') shot = engine.fanfare
    if (from === 'day' && active === 'night') {
      // Random howl, but never the same one twice in a row.
      const n = engine.howls.length
      let i = Math.floor(Math.random() * n)
      if (i === lastHowl.current) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n
      lastHowl.current = i
      shot = engine.howls[i]
    }
    if (!shot) return
    const { audio, gain } = shot
    requested.current.add(audio)
    gain.gain.cancelScheduledValues(engine.ctx.currentTime)
    gain.gain.setValueAtTime(ONE_SHOT_VOLUME, engine.ctx.currentTime)
    audio.currentTime = 0
    void engine.ctx.resume()
    audio.play().catch(() => {})
  }, [active, muted])

  useEffect(
    () => () => {
      for (const t of Object.values(pauseTimers.current)) clearTimeout(t)
      const engine = engineRef.current
      engineRef.current = null
      if (!engine) return
      for (const { audio } of [...Object.values(engine.channels), ...oneShots(engine)]) {
        audio.pause()
        audio.removeAttribute('src')
      }
      void engine.ctx.close()
    },
    [],
  )
}
