/**
 * Simple in-memory rate limiter.
 * Uses a sliding window counter per key (typically userId or IP).
 *
 * Limitations:
 * - In-memory only: resets on server restart and is per-instance (not shared across instances)
 * - For production, use Redis or a distributed rate limiter
 * - Memory is bounded by automatic cleanup of expired entries
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume a rate limit token.
 *
 * @param key - Unique identifier (e.g., `userId`, IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Whether the request is allowed, remaining count, and reset time
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — allow and start new window
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  // Window still active
  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
  }

  // Rate limit exceeded
  return { allowed: false, remaining: 0, resetAt: entry.resetAt };
}
