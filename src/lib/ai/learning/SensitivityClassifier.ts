export type SensitivityLevel = "LOW" | "MEDIUM" | "HIGH" | "SECRET";

const SECRET_PATTERNS = [
  /password/i,
  /api.?key/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /private.?key/i,
  /auth.?token/i,
  /bearer\s+\S+/i,
  /secret/i,
  /token[:=]\s*\S+/i,
  /credentials?[:=]\s*\S+/i,
];

const HIGH_PATTERNS = [
  /\bssn\b/i,
  /\bsocial security\b/i,
  /\bcredit card\b/i,
  /\bbank account\b/i,
  /\bpassport\b/i,
  /^\s*\d{3}-\d{2}-\d{4}\s*$/,
  /^\s*\d{16}\s*$/,
];

const MEDIUM_PATTERNS = [
  /\baddress\b/i,
  /\bphone\b/i,
  /\bemail\b/i,
  /\bbirth.?date\b/i,
  /\bsalary\b/i,
  /\bincome\b/i,
  /\bsalary\b/i,
  /\bhealth\b/i,
  /\bmedical\b/i,
  /\bperformance.?review\b/i,
  /\bevaluation\b/i,
];

export class SensitivityClassifier {
  classify(text: string): SensitivityLevel {
    if (SECRET_PATTERNS.some((p) => p.test(text))) {
      return "SECRET";
    }
    if (HIGH_PATTERNS.some((p) => p.test(text))) {
      return "HIGH";
    }
    if (MEDIUM_PATTERNS.some((p) => p.test(text))) {
      return "MEDIUM";
    }
    return "LOW";
  }
}

export function isBlockedSensitivity(level: SensitivityLevel): boolean {
  return level === "SECRET";
}

export function requiresApproval(level: SensitivityLevel, autoStoreLow: boolean): boolean {
  if (level === "SECRET") return false;
  if (level === "LOW" && autoStoreLow) return false;
  return true;
}
