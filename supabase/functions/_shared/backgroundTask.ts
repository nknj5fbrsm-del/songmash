/** Hintergrundarbeit nach HTTP-Antwort (Supabase Edge Runtime). */
export function scheduleBackground(work: Promise<void>): void {
  try {
    // @ts-expect-error EdgeRuntime ist in Supabase Edge Functions verfügbar
    EdgeRuntime.waitUntil(work)
  } catch {
    work.catch((err) => console.error('Background task failed:', err))
  }
}
