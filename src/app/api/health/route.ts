import { NextResponse } from "next/server";
import { validateEnv, getEnvSummary } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = validateEnv();
  const envSummary = getEnvSummary();

  const health = {
    ok: envCheck.valid,
    service: "selflearn-ai",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    environment: {
      valid: envCheck.valid,
      missingVars: envCheck.missing,
      warnings: envCheck.warnings,
    },
    providers: {
      ai: envSummary.AI_PROVIDER || "mock (default)",
      embedding: envSummary.EMBEDDING_PROVIDER || "mock (default)",
      search: envSummary.SEARCH_PROVIDER || "mock (default)",
    },
  };

  const status = envCheck.valid ? 200 : 503;
  return NextResponse.json(health, { status });
}
