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
  const status = searchParams.get("status") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const candidates = await prisma.learningCandidate.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      conversationId: true,
      summary: true,
      sensitivity: true,
      status: true,
      confidence: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ candidates });
}
