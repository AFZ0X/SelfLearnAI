import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}
