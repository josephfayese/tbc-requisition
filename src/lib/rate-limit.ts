/**
 * Simple in-memory rate limiter for server actions.
 * Not persistent across cold starts, but provides basic brute-force protection.
 */

interface Entry {
  count: number
  firstAttempt: number
}

const store = new Map<string, Entry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > windowMs) store.delete(key)
  }
}

/**
 * Check if a key (e.g. IP or email) has exceeded the rate limit.
 * @returns null if allowed, or an error message string if rate-limited.
 */
export function rateLimit(
  key: string,
  { maxAttempts = 5, windowMs = 15 * 60 * 1000 }: { maxAttempts?: number; windowMs?: number } = {}
): string | null {
  cleanup(windowMs)

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: now })
    return null
  }

  entry.count++

  if (entry.count > maxAttempts) {
    const remainingMs = windowMs - (now - entry.firstAttempt)
    const remainingMin = Math.ceil(remainingMs / 60000)
    return `Too many attempts. Please try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`
  }

  return null
}
