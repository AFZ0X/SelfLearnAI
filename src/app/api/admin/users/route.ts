import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return adminErrorResponse(e);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ users });
}
