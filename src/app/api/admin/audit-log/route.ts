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
  const action = searchParams.get("action") || undefined;
  const targetUserId = searchParams.get("targetUserId") || undefined;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (targetUserId) where.targetUserId = targetUserId;

  const logs = await prisma.adminActionLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ logs });
}
