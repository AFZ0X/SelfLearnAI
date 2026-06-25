import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  listConversations,
  createConversation,
  findEmptyConversation,
} from "@/lib/db/conversations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const conversations = await listConversations(session.user.id);
  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : undefined;

    if (title !== undefined && title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    if (!title) {
      const existing = await findEmptyConversation(session.user.id);
      if (existing) {
        return NextResponse.json({ conversation: existing });
      }
    }

    const conversation = await createConversation(session.user.id, title);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
