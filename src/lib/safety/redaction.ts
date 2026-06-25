const SENSITIVE_PATTERNS: RegExp[] = [
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

const SECRET_PATTERNS: RegExp[] = [
  /\bpassword\s*[:=]\s*\S+/gi,
  /\bapi[_-]?key\s*[:=]\s*\S+/gi,
  /\bsecret\s*[:=]\s*\S+/gi,
  /\bprivate[_-]?key\s*[:=]\s*\S+/gi,
  /\bauth[_-]?token\s*[:=]\s*\S+/gi,
  /\btoken\s*[:=]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /sk-[a-zA-Z0-9]{20,}/g,
  /credentials?\s*[:=]\s*\S+/gi,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
];

const SENSITIVE_HEADER_PATTERNS: [RegExp, string][] = [
  [/Authorization:\s*\S+(?:\s+\S+)*/gi, "Authorization: [REDACTED]"],
  [/Bearer\s+\S+/gi, "Bearer [REDACTED]"],
  [/X-Api-Key:\s*\S+/gi, "X-Api-Key: [REDACTED]"],
  [/Cookie:\s*.+/gi, "Cookie: [REDACTED]"],
];

export function redactSensitive(text: string): string {
  let result = text;

  for (const [pattern, replacement] of SENSITIVE_HEADER_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const eqIdx = match.indexOf("=") > 0 ? match.indexOf("=") + 1 : match.indexOf(":") > 0 ? match.indexOf(":") + 1 : -1;
      if (eqIdx > 0) {
        return match.slice(0, eqIdx) + " [REDACTED]";
      }
      if (match.length > 12) {
        return match.slice(0, 8) + "..." + match.slice(-4);
      }
      return match;
    });
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }

  return result;
}

export function safeTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
