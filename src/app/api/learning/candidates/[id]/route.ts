import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { LearningCandidateService } from "@/lib/ai/learning/LearningCandidateService";

const candidateService = new LearningCandidateService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    const candidate = await candidateService.updateStatus(
      id,
      session.user.id,
      action === "approve" ? "APPROVED" : "REJECTED"
    );

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found or already processed." },
        { status: 404 }
      );
    }

    if (action === "approve") {
      await candidateService.approveAndStore(session.user.id, {
        text: candidate.text,
        summary: candidate.summary || undefined,
        source: candidate.source || "learning",
        sensitivity: candidate.sensitivity as "LOW" | "MEDIUM" | "HIGH" | "SECRET",
        confidence: candidate.confidence ?? undefined,
        tags: candidate.tags,
      });
    }

    return NextResponse.json({ candidate });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await candidateService.delete(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
