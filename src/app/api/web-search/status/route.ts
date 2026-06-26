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
    }
  } catch {
  }

  return NextResponse.json({
    enabled: isSearchConfigured(),
    provider: providerStatus.name,
    configured: providerStatus.configured,
    configError: providerStatus.error || null,
    webSearchEnabled,
  });
}
