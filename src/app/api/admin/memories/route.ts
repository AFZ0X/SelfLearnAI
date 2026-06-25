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
  const type = searchParams.get("type") || undefined;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;

  const memories = await prisma.memory.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      type: true,
      summary: true,
      tags: true,
      confidence: true,
      visibility: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ memories });
}
