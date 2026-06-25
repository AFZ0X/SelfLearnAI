import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/auth/admin-log";

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

  const { id } = await params;

  if (id === adminSession.user.id) {
    return NextResponse.json(
      { error: "Cannot ban yourself." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : undefined;

    if (!reason || reason.length < 1 || reason.length > 500) {
      return NextResponse.json(
        { error: "Ban reason is required (1–500 characters)." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.status === "BANNED") {
      return NextResponse.json(
        { error: "User is already banned." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: "BANNED",
        bannedAt: new Date(),
        bannedReason: reason,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        bannedAt: true,
        bannedReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAdminAction(
      adminSession.user.id,
      "ban_user",
      id,
      { reason }
    );

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
