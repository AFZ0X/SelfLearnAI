import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;

  const sources = await prisma.webSource.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      conversationId: true,
      url: true,
      title: true,
      snippet: true,
      provider: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ sources });
}
