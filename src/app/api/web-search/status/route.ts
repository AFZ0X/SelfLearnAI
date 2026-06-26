import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getProviderStatus, isSearchConfigured } from "@/lib/ai/search/SearchProvider";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerStatus = getProviderStatus();

  let webSearchEnabled = true;
  let responseStyle = "SHORT";
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    if (user?.settings && typeof user.settings === "object") {
      const settings = user.settings as Record<string, unknown>;
      if (typeof settings.webSearchEnabled === "boolean") {
        webSearchEnabled = settings.webSearchEnabled;
      }
      if (typeof settings.responseStyle === "string") {
        responseStyle = settings.responseStyle;
      }
    }
  } catch {
  }

  const searchConfigured = isSearchConfigured();
  const missingVariables: string[] = [];
  if (!process.env.SEARCH_PROVIDER) {
    missingVariables.push("SEARCH_PROVIDER");
  }
  if (process.env.SEARCH_PROVIDER === "tavily" && !process.env.TAVILY_API_KEY) {
    missingVariables.push("TAVILY_API_KEY");
  }
  if (process.env.SEARCH_PROVIDER === "brave" && !process.env.BRAVE_API_KEY) {
    missingVariables.push("BRAVE_API_KEY");
  }

  return NextResponse.json({
    enabled: searchConfigured && webSearchEnabled,
    provider: providerStatus.name,
    configured: searchConfigured,
    configError: providerStatus.error || null,
    webSearchEnabled,
    responseStyle,
    usingMock: providerStatus.usingMock,
    productionSafe: providerStatus.productionSafe,
    missingVariables,
  });
}
