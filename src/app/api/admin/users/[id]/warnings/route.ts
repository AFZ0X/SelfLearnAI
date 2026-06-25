import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/auth/admin-log";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const { id } = await params;

  const warnings = await prisma.adminWarning.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      note: true,
      acknowledgedAt: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ warnings });
}

export async function POST(
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

  try {
    const body = await request.json();
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : undefined;
    const note =
      typeof body.note === "string" ? body.note.trim() : undefined;

    if (!reason || reason.length < 1 || reason.length > 500) {
      return NextResponse.json(
        { error: "Warning reason is required (1–500 characters)." },
        { status: 400 }
      );
    }

    if (note && note.length > 2000) {
      return NextResponse.json(
        { error: "Note must be 2000 characters or fewer." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const warning = await prisma.adminWarning.create({
      data: {
        userId: id,
        adminId: adminSession.user.id,
        reason,
        note,
      },
      select: {
        id: true,
        reason: true,
        note: true,
        createdAt: true,
      },
    });

    await logAdminAction(
      adminSession.user.id,
      "create_warning",
      id,
      { reason }
    );

    return NextResponse.json({ warning }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
