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

  const feedback = await prisma.feedback.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      conversationId: true,
      messageId: true,
      type: true,
      rating: true,
      reason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ feedback });
}
