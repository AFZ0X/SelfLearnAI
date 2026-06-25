import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey, getClientIp } from "./rate-limiter";
import { logSafetyEvent } from "./safety-event-logger";

export function rateLimitGuard(
  userId: string | undefined,
  request: { headers: { get(name: string): string | null } },
  route: string
): NextResponse | null {
  const ip = getClientIp(request);
  const key = getRateLimitKey(userId, ip);
  const result = checkRateLimit(key, route);

  if (!result.allowed) {
    logSafetyEvent({
      type: "rate_limit_hit",
      timestamp: new Date().toISOString(),
      userId,
      ip,
      route,
      details: "Rate limit exceeded",
    });

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs! / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
