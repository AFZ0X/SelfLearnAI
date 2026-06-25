import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getConversation } from "@/lib/db/conversations";
import { createFeedback, listFeedback } from "@/lib/db/feedback";
import { rateLimitGuard } from "@/lib/safety/route-guard";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const userId = session.user.id;

  const guard = rateLimitGuard(userId, request, "/api/feedback");
  if (guard) return guard;

  try {
    const body = await request.json();
    const { conversationId, messageId, type, reason, correction } = body as {
      conversationId?: string;
      messageId?: string;
      type?: string;
      reason?: string;
      correction?: string;
    };

    if (typeof conversationId !== "string" || typeof messageId !== "string") {
      return NextResponse.json(
        { error: "conversationId and messageId are required." },
        { status: 400 }
      );
    }

    if (typeof type !== "string") {
      return NextResponse.json(
        { error: "Feedback type is required." },
        { status: 400 }
      );
    }

    const validTypes = ["THUMBS_UP", "THUMBS_DOWN", "CORRECTION", "WRONG_ANSWER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid feedback type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message) {
      return NextResponse.json(
        { error: "Message not found in this conversation." },
        { status: 404 }
      );
    }

    if (correction && correction.length > 2000) {
      return NextResponse.json(
        { error: "Correction must be 2000 characters or fewer." },
        { status: 400 }
      );
    }

    try {
      const feedback = await createFeedback(userId, {
        type: type as "THUMBS_UP" | "THUMBS_DOWN" | "CORRECTION" | "WRONG_ANSWER",
        conversationId,
        messageId,
        reason: reason?.trim(),
        correction: correction?.trim(),
      });
      return NextResponse.json({ feedback }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid feedback.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId") || undefined;

  if (conversationId) {
    const conversation = await getConversation(conversationId, session.user.id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
  }

  const feedback = await listFeedback(session.user.id, conversationId);
  return NextResponse.json({ feedback });
}
