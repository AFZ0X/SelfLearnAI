import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getConversation } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";

const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ROLES = ["user", "assistant"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const ownership = await getConversation(id, session.user.id);
  if (!ownership) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const role = body.role as string;
    const content = body.content as string;

    if (typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'user' or 'assistant'." },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message content exceeds ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const message = await createMessage(id, role, content);
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
