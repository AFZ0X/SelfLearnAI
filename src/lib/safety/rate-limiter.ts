interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const CONFIG: Record<string, RateLimitConfig> = {
  "api/chat": { windowMs: 60_000, maxRequests: 30 },
  "api/auth/register": { windowMs: 3600_000, maxRequests: 5 },
  "api/learning": { windowMs: 60_000, maxRequests: 60 },
  "api/feedback": { windowMs: 60_000, maxRequests: 60 },
  "api/memories": { windowMs: 60_000, maxRequests: 60 },
  "api/admin": { windowMs: 30_000, maxRequests: 120 },
};

const _clients: Map<string, RateLimitEntry> = new Map();

function findConfig(route: string): RateLimitConfig | null {
  const normalized = route.replace(/^\//, "").toLowerCase();
  for (const [prefix, config] of Object.entries(CONFIG)) {
    if (normalized.startsWith(prefix)) return config;
  }
  return null;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of _clients) {
    if (now > entry.resetAt) {
      _clients.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, route: string): RateLimitResult {
  const config = findConfig(route);
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  cleanup();

  const now = Date.now();
  const entry = _clients.get(key);

  if (!entry || now > entry.resetAt) {
    _clients.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitKey(userId: string | undefined, ip: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}
