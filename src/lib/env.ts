export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
];

const OPTIONAL_VARS: Record<string, string> = {
  AI_PROVIDER: "mock",
  EMBEDDING_PROVIDER: "mock",
  SEARCH_PROVIDER: "mock",
  OPENAI_API_KEY: "",
  BRAVE_API_KEY: "",
  OPENAI_MODEL: "gpt-4o-mini",
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
};

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  const aiProvider = process.env.AI_PROVIDER || "mock";
  const embeddingProvider = process.env.EMBEDDING_PROVIDER || "mock";
  const searchProvider = process.env.SEARCH_PROVIDER || "mock";

  if (aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
    warnings.push("AI_PROVIDER=openai but OPENAI_API_KEY is not set");
  }

  if (embeddingProvider === "openai" && !process.env.OPENAI_API_KEY) {
    warnings.push("EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set");
  }

  if (searchProvider === "brave" && !process.env.BRAVE_API_KEY) {
    warnings.push("SEARCH_PROVIDER=brave but BRAVE_API_KEY is not set");
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function getEnvSummary(): Record<string, string> {
  const summary: Record<string, string> = {};

  for (const key of REQUIRED_VARS) {
    summary[key] = process.env[key] ? "✓ set" : "✗ missing";
  }

  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    const val = process.env[key];
    if (val && val !== defaultValue) {
      summary[key] = val;
    } else {
      summary[key] = `${defaultValue} (default)`;
    }
  }

  return summary;
}
