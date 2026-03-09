/**
 * src/lib/helpers/rateLimit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple in-memory rate limiter for API routes.
 *
 * Suitable for single-instance deployment (EasyPanel/Docker single container).
 * If horizontal scaling is needed in the future, replace the store with Redis.
 *
 * Usage:
 *   const limiter = rateLimiter({ windowMs: 60_000, maxRequests: 20 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return NextResponse.json({ error: result.message }, { status: 429 });
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    /** Human-readable german message for the 429 response */
    message: string;
}

interface RateLimiterOptions {
    /** Time window in milliseconds */
    windowMs: number;
    /** Max requests per window */
    maxRequests: number;
}

export function rateLimiter(options: RateLimiterOptions) {
    const store = new Map<string, RateLimitEntry>();

    // Periodic cleanup to prevent memory leak on long-running instances
    // Runs every 5 minutes to remove expired entries
    const cleanup = () => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (entry.resetAt < now) store.delete(key);
        }
    };
    if (typeof setInterval !== 'undefined') {
        setInterval(cleanup, 5 * 60 * 1000);
    }

    return {
        check(identifier: string): RateLimitResult {
            const now = Date.now();
            const entry = store.get(identifier);

            if (!entry || entry.resetAt < now) {
                // Start a new window
                store.set(identifier, { count: 1, resetAt: now + options.windowMs });
                return {
                    allowed: true,
                    remaining: options.maxRequests - 1,
                    resetAt: now + options.windowMs,
                    message: '',
                };
            }

            if (entry.count >= options.maxRequests) {
                const waitSec = Math.ceil((entry.resetAt - now) / 1000);
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt: entry.resetAt,
                    message: `Zu viele Anfragen. Bitte warten Sie ${waitSec} Sekunden.`,
                };
            }

            entry.count += 1;
            return {
                allowed: true,
                remaining: options.maxRequests - entry.count,
                resetAt: entry.resetAt,
                message: '',
            };
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-configured limiters for each risk tier
// ─────────────────────────────────────────────────────────────────────────────

/** AI chat — max 20 requests per minute per user session (OpenAI cost protection) */
export const chatLimiter = rateLimiter({ windowMs: 60_000, maxRequests: 20 });

/** Auth login — max 10 attempts per minute per IP (brute-force protection) */
export const loginLimiter = rateLimiter({ windowMs: 60_000, maxRequests: 10 });

/** File upload — max 20 uploads per minute per user session */
export const uploadLimiter = rateLimiter({ windowMs: 60_000, maxRequests: 20 });
