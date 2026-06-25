import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminSession;
  try {
    adminSession = await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const guard = rateLimitGuard(adminSession.user.id, request, "/api/admin");
  if (guard) return guard;

  const { id } = await params;

  try {
    const body = await request.json();
    const { role } = body as { role?: string };

    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "Role must be ADMIN or USER." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.id === adminSession.user.id && role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote self. No other admin exists." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logSafetyEvent({
      type: "role_change",
      timestamp: new Date().toISOString(),
      userId: adminSession.user.id,
      route: "/api/admin/users/[id]/role",
      details: `Changed role of user ${targetUser.id.slice(0, 12)} from ${targetUser.role} to ${role}`,
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
