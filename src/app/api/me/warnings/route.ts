import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warnings = await prisma.adminWarning.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      note: true,
      acknowledgedAt: true,
      createdAt: true,
      admin: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ warnings });
}
