import { describe, it, expect } from "vitest";
import {
  SensitivityClassifier,
  isBlockedSensitivity,
  requiresApproval,
} from "@/lib/ai/learning/SensitivityClassifier";

const classifier = new SensitivityClassifier();

describe("SensitivityClassifier.classify", () => {
  it("classifies password text as SECRET", () => {
    expect(classifier.classify("my password is test123")).toBe("SECRET");
  });

  it("classifies api key text as SECRET", () => {
    expect(classifier.classify("api_key=sk-abc123def456")).toBe("SECRET");
  });

  it("classifies bearer token as SECRET", () => {
    expect(classifier.classify("Bearer eyJhbGciOiJIUzI1NiJ9")).toBe("SECRET");
  });

  it("classifies SSN text as HIGH", () => {
    expect(classifier.classify("My SSN is 123-45-6789")).toBe("HIGH");
  });

  it("classifies credit card text as HIGH", () => {
    expect(classifier.classify("My credit card is 4111111111111111")).toBe("HIGH");
  });

  it("classifies address text as MEDIUM", () => {
    expect(classifier.classify("My address is 123 Main St")).toBe("MEDIUM");
  });

  it("classifies email text as MEDIUM", () => {
    expect(classifier.classify("My email is user@example.com")).toBe("MEDIUM");
  });

  it("classifies normal text as LOW", () => {
    expect(classifier.classify("I like programming in TypeScript")).toBe("LOW");
  });

  it("classifies empty text as LOW", () => {
    expect(classifier.classify("")).toBe("LOW");
  });
});

describe("isBlockedSensitivity", () => {
  it("blocks SECRET", () => {
    expect(isBlockedSensitivity("SECRET")).toBe(true);
  });

  it("allows HIGH", () => {
    expect(isBlockedSensitivity("HIGH")).toBe(false);
  });

  it("allows MEDIUM", () => {
    expect(isBlockedSensitivity("MEDIUM")).toBe(false);
  });

  it("allows LOW", () => {
    expect(isBlockedSensitivity("LOW")).toBe(false);
  });
});

describe("requiresApproval", () => {
  it("requires approval for HIGH", () => {
    expect(requiresApproval("HIGH", false)).toBe(true);
  });

  it("requires approval for MEDIUM", () => {
    expect(requiresApproval("MEDIUM", false)).toBe(true);
  });

  it("auto-stores LOW when configured", () => {
    expect(requiresApproval("LOW", true)).toBe(false);
  });

  it("requires approval for LOW when not auto-store", () => {
    expect(requiresApproval("LOW", false)).toBe(true);
  });

  it("returns false for SECRET (blocked, not approval)", () => {
    expect(requiresApproval("SECRET", false)).toBe(false);
  });
});
