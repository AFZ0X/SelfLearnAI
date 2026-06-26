import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { getLogEntries } from "@/lib/safety/safety-event-logger";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || undefined;

  const safetyLogs = getLogEntries(type, 200);

  const adminLogs = await prisma.adminActionLog.findMany({
    where: type ? { action: type } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      admin: {
        select: { id: true, email: true, name: true },
      },
      targetUser: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  const combined = [
    ...safetyLogs.map((l) => ({
      id: l.id,
      type: l.type,
      timestamp: l.timestamp,
      source: "safety",
      userId: l.userId,
      route: l.route,
      details: l.details,
    })),
    ...adminLogs.map((l) => ({
      id: l.id,
      type: l.action,
      timestamp: l.createdAt.toISOString(),
      source: "admin",
      userId: l.admin?.id,
      details: JSON.stringify(l.metadata),
      adminEmail: l.admin?.email,
      targetEmail: l.targetUser?.email,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 200);

  return NextResponse.json({ logs: combined });
}
