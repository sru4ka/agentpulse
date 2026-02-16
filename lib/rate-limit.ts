// Simple in-memory rate limiter for serverless functions
// Resets when the serverless function cold starts (acceptable for basic protection)

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitConfig {
  maxRequests: number  // max requests per window
  windowMs: number     // window in milliseconds
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// Pre-configured rate limiters
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,      // 5 attempts
  windowMs: 15 * 60_000, // per 15 minutes
}

export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,    // 100 requests
  windowMs: 60_000,    // per minute
}

export const EVENTS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,     // 30 batches
  windowMs: 60_000,    // per minute
}
