const VOTER_ID_KEY = 'songmash_voter_id'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readStoredId(): string | null {
  try {
    const raw = localStorage.getItem(VOTER_ID_KEY)?.trim()
    if (raw && UUID_RE.test(raw)) return raw
  } catch {
    // ignore
  }
  return null
}

function writeStoredId(id: string): void {
  try {
    localStorage.setItem(VOTER_ID_KEY, id)
  } catch {
    // ignore
  }
}

/** Anonyme Voter-ID für serverseitige Rate-Limits (ohne Login). */
export function getOrCreateVoterId(): string {
  const existing = readStoredId()
  if (existing) return existing

  const id = crypto.randomUUID()
  writeStoredId(id)
  return id
}
