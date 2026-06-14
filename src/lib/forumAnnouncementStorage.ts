const VISIT_KEY = 'songmash_site_visit_count'
const DISMISSED_KEY = 'songmash_forum_announcement_dismissed'

const SHOW_ON_VISITS = new Set([1, 3, 5])

function readDismissed(): number[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is number => typeof n === 'number' && SHOW_ON_VISITS.has(n))
  } catch {
    return []
  }
}

function writeDismissed(milestones: number[]): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(milestones))
}

export function incrementSiteVisitCount(): number {
  try {
    const current = Number.parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10)
    const next = Number.isFinite(current) ? current + 1 : 1
    localStorage.setItem(VISIT_KEY, String(next))
    return next
  } catch {
    return 1
  }
}

export function shouldShowForumAnnouncement(visitCount: number): boolean {
  if (!SHOW_ON_VISITS.has(visitCount)) return false
  return !readDismissed().includes(visitCount)
}

export function dismissForumAnnouncementForVisit(visitCount: number): void {
  if (!SHOW_ON_VISITS.has(visitCount)) return
  const dismissed = readDismissed()
  if (dismissed.includes(visitCount)) return
  writeDismissed([...dismissed, visitCount])
}
