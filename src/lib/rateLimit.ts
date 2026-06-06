/**
 * Lightweight in-memory fixed-window rate limiter.
 * Suitable for a single-instance Next.js deployment. Keys are arbitrary
 * strings (e.g. `login:<ip>:<email>`). For multi-instance deployments this
 * should be backed by Redis instead.
 */

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup to avoid unbounded growth.
function sweep(now: number) {
    if (buckets.size < 1000) return;
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key);
    }
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfterSec: number;
    remaining: number;
}

/**
 * Record an attempt against `key`. Returns whether it is allowed under the
 * given `limit` within `windowMs`.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    sweep(now);

    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
    }

    if (bucket.count >= limit) {
        return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000), remaining: 0 };
    }

    bucket.count++;
    return { allowed: true, retryAfterSec: 0, remaining: limit - bucket.count };
}

/** Clear the counter for a key (e.g. after a successful login). */
export function resetRateLimit(key: string): void {
    buckets.delete(key);
}

/** Extract a best-effort client IP from request headers. */
export function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}
