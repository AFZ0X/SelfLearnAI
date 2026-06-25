import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { updateFeedback, deleteFeedback } from "@/lib/db/feedback";

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
    const { type, reason, correction } = body as {
      type?: string;
      reason?: string;
      correction?: string;
    };

    if (type !== undefined) {
      const validTypes = ["THUMBS_UP", "THUMBS_DOWN", "CORRECTION", "WRONG_ANSWER"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid feedback type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    try {
      const feedback = await updateFeedback(id, session.user.id, {
        type: type as "THUMBS_UP" | "THUMBS_DOWN" | "CORRECTION" | "WRONG_ANSWER" | undefined,
        reason,
        correction,
      });

      if (!feedback) {
        return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
      }

      return NextResponse.json({ feedback });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid update.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
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

  const deleted = await deleteFeedback(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
