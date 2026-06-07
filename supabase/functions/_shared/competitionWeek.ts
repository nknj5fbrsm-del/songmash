/** Kalenderwoche Montag 00:00 – Sonntag 23:59:59.999 (Europe/Berlin). */

export const COMPETITION_TIMEZONE = 'Europe/Berlin'
export const MIN_WEEK_VOTES_FOR_MVP = 5

type BerlinParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  isoWeekday: number
}

const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

export function getBerlinParts(date: Date): BerlinParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: COMPETITION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)!.value

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    isoWeekday: WEEKDAY_MAP[get('weekday')],
  }
}

export function berlinLocalToUtc(
  local: Omit<BerlinParts, 'isoWeekday'> & { ms?: number },
): Date {
  const target = {
    year: local.year,
    month: local.month,
    day: local.day,
    hour: local.hour,
    minute: local.minute,
    second: local.second,
    ms: local.ms ?? 0,
  }

  let t = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour - 2,
    target.minute,
    target.second,
    target.ms,
  )

  for (let i = 0; i < 120; i++) {
    const p = getBerlinParts(new Date(t))
    const cmp =
      p.year !== target.year
        ? p.year - target.year
        : p.month !== target.month
          ? p.month - target.month
          : p.day !== target.day
            ? p.day - target.day
            : p.hour !== target.hour
              ? p.hour - target.hour
              : p.minute !== target.minute
                ? p.minute - target.minute
                : p.second !== target.second
                  ? p.second - target.second
                  : 0

    if (cmp === 0) return new Date(t)
    t -= cmp * 60_000
  }

  return new Date(t)
}

function berlinNoonUtc(year: number, month: number, day: number): Date {
  return berlinLocalToUtc({ year, month, day, hour: 12, minute: 0, second: 0, ms: 0 })
}

function addBerlinDays(year: number, month: number, day: number, days: number): BerlinParts {
  const base = berlinNoonUtc(year, month, day)
  return getBerlinParts(new Date(base.getTime() + days * 86_400_000))
}

export function getCurrentBerlinWeekBounds(now = new Date()): { startsAt: Date; endsAt: Date } {
  const p = getBerlinParts(now)
  const monday = addBerlinDays(p.year, p.month, p.day, -(p.isoWeekday - 1))
  const sunday = addBerlinDays(monday.year, monday.month, monday.day, 6)

  const startsAt = berlinLocalToUtc({
    year: monday.year,
    month: monday.month,
    day: monday.day,
    hour: 0,
    minute: 0,
    second: 0,
    ms: 0,
  })

  const endsAt = berlinLocalToUtc({
    year: sunday.year,
    month: sunday.month,
    day: sunday.day,
    hour: 23,
    minute: 59,
    second: 59,
    ms: 999,
  })

  return { startsAt, endsAt }
}
