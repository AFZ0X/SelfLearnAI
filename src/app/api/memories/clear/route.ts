import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await prisma.memoryEmbedding.deleteMany({
      where: { memory: { userId: session.user.id } },
    });

    const result = await prisma.memory.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear memories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
