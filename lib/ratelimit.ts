/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Note: state is per-process, so on multi-instance deployments (e.g. Vercel
 * serverless with multiple concurrent instances) each instance has its own
 * counter. This still meaningfully reduces abuse from a single client hitting
 * the same instance repeatedly, and is sufficient without a Redis dependency.
 */

const store = new Map<string, number[]>()
const WINDOW_MS = 60_000 // 1 minute

export interface RateLimitResult {
  ok: boolean
  retryAfter?: number // seconds until the oldest request expires
}

export function rateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now()
  const timestamps = (store.get(key) ?? []).filter(t => now - t < WINDOW_MS)

  if (timestamps.length >= limit) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000)
    store.set(key, timestamps)
    return { ok: false, retryAfter }
  }

  timestamps.push(now)
  store.set(key, timestamps)

  // Evict stale entries when the store grows large to prevent memory leaks
  if (store.size > 10_000) {
    for (const [k, ts] of store.entries()) {
      if (ts[ts.length - 1] < now - WINDOW_MS) store.delete(k)
    }
  }

  return { ok: true }
}

/** Extract the most specific IP from the request headers. */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}
