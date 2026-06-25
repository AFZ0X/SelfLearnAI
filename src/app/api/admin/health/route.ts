import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  try {
    const [users, conversations, memories, candidates, feedback, sources] =
      await Promise.all([
        prisma.user.count(),
        prisma.conversation.count(),
        prisma.memory.count(),
        prisma.learningCandidate.count(),
        prisma.feedback.count(),
        prisma.webSource.count(),
      ]);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      counts: {
        users,
        conversations,
        memories,
        learningCandidates: candidates,
        feedback,
        webSources: sources,
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        counts: null,
        error: "Database query failed.",
      },
      { status: 503 }
    );
  }
}
