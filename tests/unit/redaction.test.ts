import { describe, it, expect } from "vitest";
import { redactSensitive, safeTruncate } from "@/lib/safety/redaction";

describe("redactSensitive", () => {
  it("redacts password=value pairs", () => {
    const result = redactSensitive("password=supersecret123");
    expect(result).not.toContain("supersecret123");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts api_key=value pairs", () => {
    const result = redactSensitive("api_key=sk-abc123def456");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts bearer tokens", () => {
    const result = redactSensitive("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts sk- long tokens", () => {
    const result = redactSensitive("sk-abc123def456ghijklmnopqrstuvwxyz");
    expect(result).toContain("sk-");
    expect(result).not.toContain("abc123def456ghijklmnopqrstuvwxyz");
  });

  it("redacts email addresses", () => {
    const result = redactSensitive("user@example.com");
    expect(result).toBe("[REDACTED]");
  });

  it("redacts phone numbers", () => {
    const result = redactSensitive("555-123-4567");
    expect(result).toBe("[REDACTED]");
  });

  it("redacts credit card numbers", () => {
    const result = redactSensitive("4111 1111 1111 1111");
    expect(result).toBe("[REDACTED]");
  });

  it("redacts authorization headers", () => {
    const result = redactSensitive("Authorization: Bearer mytoken123");
    expect(result).toBe("Authorization: [REDACTED]");
  });

  it("redacts cookie headers", () => {
    const result = redactSensitive("Cookie: session=abc123");
    expect(result).toBe("Cookie: [REDACTED]");
  });

  it("preserves normal text", () => {
    const result = redactSensitive("The quick brown fox jumps over the lazy dog.");
    expect(result).toBe("The quick brown fox jumps over the lazy dog.");
  });

  it("handles empty string", () => {
    expect(redactSensitive("")).toBe("");
  });

  it("handles multiple sensitive patterns in one string", () => {
    const text = 'User email is user@example.com and password=secret123';
    const result = redactSensitive(text);
    expect(result).not.toContain("user@example.com");
    expect(result).not.toContain("secret123");
    expect(result).toContain("[REDACTED]");
  });
});

describe("safeTruncate", () => {
  it("does not truncate short text", () => {
    expect(safeTruncate("hello", 10)).toBe("hello");
  });

  it("truncates long text with ellipsis", () => {
    const result = safeTruncate("hello world this is long", 10);
    expect(result).toBe("hello worl...");
    expect(result.length).toBe(13);
  });

  it("handles exact length", () => {
    expect(safeTruncate("hello", 5)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(safeTruncate("", 10)).toBe("");
  });
});
