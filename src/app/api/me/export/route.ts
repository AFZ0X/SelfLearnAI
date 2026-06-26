import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const memories = await prisma.memory.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      text: true,
      summary: true,
      source: true,
      tags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const learningCandidates = await prisma.learningCandidate.findMany({
    where: { userId },
    select: {
      id: true,
      summary: true,
      sensitivity: true,
      status: true,
      tags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const feedback = await prisma.feedback.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      rating: true,
      reason: true,
      correction: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const warnings = await prisma.adminWarning.findMany({
    where: { userId },
    select: {
      id: true,
      reason: true,
      note: true,
      acknowledgedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    conversations,
    memories,
    learningCandidates,
    feedback,
    warnings,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="selflearn-export-${userId.slice(0, 8)}.json"`,
    },
  });
}
