import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/auth/admin-log";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminSession;
  try {
    adminSession = await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const { id } = await params;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetUser.status !== "BANNED") {
    return NextResponse.json(
      { error: "User is not banned." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status: "ACTIVE",
      bannedAt: null,
      bannedReason: null,
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
    "unban_user",
    id
  );

  return NextResponse.json({ user: updated });
}
