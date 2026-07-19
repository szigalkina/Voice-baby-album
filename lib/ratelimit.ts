// Minimal in-memory rate limiter. Resets on deploy/restart — good enough to
// stop brute force at family-app scale; swap for Upstash if traffic grows.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
