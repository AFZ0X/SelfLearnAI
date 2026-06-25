import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitKey, getClientIp } from "@/lib/safety/rate-limiter";

describe("getRateLimitKey", () => {
  it("uses user prefix when userId is provided", () => {
    expect(getRateLimitKey("user-123", "1.2.3.4")).toBe("user:user-123");
  });

  it("uses ip prefix when userId is undefined", () => {
    expect(getRateLimitKey(undefined, "1.2.3.4")).toBe("ip:1.2.3.4");
  });
});

describe("getClientIp", () => {
  it("uses x-forwarded-for first", () => {
    const req = {
      headers: { get: (name: string) => name === "x-forwarded-for" ? "10.0.0.1, 10.0.0.2" : null },
    };
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip", () => {
    const req = {
      headers: { get: (name: string) => name === "x-real-ip" ? "10.0.0.3" : null },
    };
    expect(getClientIp(req)).toBe("10.0.0.3");
  });

  it("defaults to 127.0.0.1", () => {
    const req = { headers: { get: () => null } };
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Clear the internal rate limit store between tests
    // Since _clients is module-scoped, we simulate by using unique keys
  });

  it("allows first request", () => {
    const result = checkRateLimit("test:user1", "/api/chat");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(29);
  });

  it("returns Infinity remaining for unmatched routes", () => {
    const result = checkRateLimit("test:user1", "/api/unknown");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it("blocks after exceeding limit", () => {
    const key = `test:burst-${Date.now()}`;
    // Exhaust the limit for /api/memories (60 per minute)
    for (let i = 0; i < 60; i++) {
      checkRateLimit(key, "/api/memories");
    }
    const result = checkRateLimit(key, "/api/memories");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("returns retry-after on block", () => {
    const key = `test:retry-${Date.now()}`;
    for (let i = 0; i < 60; i++) {
      checkRateLimit(key, "/api/memories");
    }
    const result = checkRateLimit(key, "/api/memories");
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });

  it("different keys are independent", () => {
    const key1 = `test:indep1-${Date.now()}`;
    const key2 = `test:indep2-${Date.now()}`;

    for (let i = 0; i < 60; i++) {
      checkRateLimit(key1, "/api/memories");
    }

    // key1 should be blocked
    expect(checkRateLimit(key1, "/api/memories").allowed).toBe(false);
    // key2 should still be allowed
    expect(checkRateLimit(key2, "/api/memories").allowed).toBe(true);
  });
});
