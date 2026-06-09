const REPORTED_SONGS_KEY = 'songmash_content_reports'
const DAILY_REPORTS_KEY = 'songmash_content_reports_daily'
const MAX_REPORTS_PER_DAY = 5

function readReportedSongIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORTED_SONGS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
  } catch {
    return new Set()
  }
}

function writeReportedSongIds(ids: Set<string>): void {
  try {
    localStorage.setItem(REPORTED_SONGS_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

function readDailyReportCount(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(DAILY_REPORTS_KEY)
    if (!raw) return { date: todayKey(), count: 0 }
    const parsed = JSON.parse(raw) as { date?: string; count?: number }
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 }
    const count = typeof parsed.count === 'number' && parsed.count >= 0 ? parsed.count : 0
    return { date: todayKey(), count }
  } catch {
    return { date: todayKey(), count: 0 }
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function incrementDailyReportCount(): void {
  try {
    const current = readDailyReportCount()
    localStorage.setItem(
      DAILY_REPORTS_KEY,
      JSON.stringify({ date: todayKey(), count: current.count + 1 }),
    )
  } catch {
    // ignore
  }
}

export function hasReportedSong(songId: string): boolean {
  return readReportedSongIds().has(songId)
}

export function canSubmitReportToday(): boolean {
  return readDailyReportCount().count < MAX_REPORTS_PER_DAY
}

export function remainingReportsToday(): number {
  return Math.max(0, MAX_REPORTS_PER_DAY - readDailyReportCount().count)
}

export function markSongReported(songId: string): void {
  const ids = readReportedSongIds()
  ids.add(songId)
  writeReportedSongIds(ids)
  incrementDailyReportCount()
}
