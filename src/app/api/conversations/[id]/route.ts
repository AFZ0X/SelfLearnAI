import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getConversation,
  updateConversation,
  deleteConversation,
} from "@/lib/db/conversations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const result = await getConversation(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}

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
    const title = typeof body.title === "string" ? body.title.trim() : undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    const updated = await updateConversation(id, session.user.id, { title });
    if (!updated) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: updated });
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

  const deleted = await deleteConversation(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
