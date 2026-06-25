import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { deleteMemory } from "@/lib/db/memories";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await deleteMemory(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
