import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const warning = await prisma.adminWarning.findUnique({
    where: { id },
    select: { id: true, userId: true, acknowledgedAt: true },
  });

  if (!warning) {
    return NextResponse.json({ error: "Warning not found." }, { status: 404 });
  }

  if (warning.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (warning.acknowledgedAt) {
    return NextResponse.json({ warning: { ...warning, alreadyAcknowledged: true } });
  }

  const updated = await prisma.adminWarning.update({
    where: { id },
    data: { acknowledgedAt: new Date() },
    select: {
      id: true,
      reason: true,
      note: true,
      acknowledgedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ warning: updated });
}
