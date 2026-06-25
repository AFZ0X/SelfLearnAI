import { describe, it, expect, vi, beforeEach } from "vitest";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";

describe("logSafetyEvent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function getLastLog(): string {
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][0] as string;
  }

  it("logs with SAFETY prefix", () => {
    logSafetyEvent({
      type: "rate_limit_hit",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(getLastLog()).toContain("[SAFETY:rate_limit_hit]");
  });

  it("includes user, route, and details", () => {
    logSafetyEvent({
      type: "blocked_secret_storage",
      timestamp: "2026-01-01T00:00:00.000Z",
      userId: "user-123",
      route: "/api/memories",
      details: "Blocked memory with sensitive content",
    });
    const log = getLastLog();
    expect(log).toContain("user=user-123");
    expect(log).toContain("route=/api/memories");
    expect(log).toContain("details=Blocked memory with sensitive content");
  });

  it("redacts sensitive data from details", () => {
    logSafetyEvent({
      type: "blocked_secret_storage",
      timestamp: "2026-01-01T00:00:00.000Z",
      details: "password=supersecret",
    });
    const log = getLastLog();
    expect(log).not.toContain("supersecret");
    expect(log).toContain("[REDACTED]");
  });

  it("handles minimal event (type + timestamp only)", () => {
    logSafetyEvent({
      type: "role_change",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(getLastLog()).toContain("[SAFETY:role_change]");
  });

  it("handles events with ip address", () => {
    logSafetyEvent({
      type: "rate_limit_hit",
      timestamp: "2026-01-01T00:00:00.000Z",
      ip: "10.0.0.1",
      userId: "user-123",
      route: "/api/chat",
      details: "Rate limit exceeded",
    });
    const log = getLastLog();
    expect(log).toContain("ip=10.0.0.1");
    expect(log).toContain("user=user-123");
    expect(log).toContain("route=/api/chat");
    expect(log).toContain("details=Rate limit exceeded");
  });

  it("handles admin audit event types", () => {
    logSafetyEvent({
      type: "memory_deleted_by_admin",
      timestamp: "2026-01-01T00:00:00.000Z",
      userId: "admin-1",
      details: "Deleted memory abc123 (owner: def456)",
    });
    const log = getLastLog();
    expect(log).toContain("[SAFETY:memory_deleted_by_admin]");
    expect(log).toContain("details=Deleted memory abc123");
  });
});
