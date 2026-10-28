/** Dashboard clock: night from 21:00 to 08:00, day in between. */
export function isNightHour(hour: number): boolean {
  return hour >= 21 || hour < 8
}

/** Current hour in the group's time zone — the server itself renders in UTC. */
export function hourIn(timeZone: string, date = new Date()): number {
  // formatToParts: a plain format() is locale text ("20 Uhr"), not a number.
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone })
    .formatToParts(date)
  return Number(parts.find((p) => p.type === 'hour')?.value)
}
