import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";

export async function DELETE(
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

  const existing = await prisma.learningCandidate.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Learning candidate not found." },
      { status: 404 }
    );
  }

  await prisma.learningCandidate.delete({ where: { id } });

  logSafetyEvent({
    type: "candidate_deleted_by_admin",
    timestamp: new Date().toISOString(),
    userId: adminSession.user.id,
    route: "/api/admin/learning-candidates/[id]",
    details: `Deleted candidate ${id.slice(0, 12)} (owner: ${existing.userId.slice(0, 12)})`,
  });

  return NextResponse.json({ success: true });
}
