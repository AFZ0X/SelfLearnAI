import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      settings: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (name !== undefined && name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      data.name = name || null;
    }

    if (body.settings !== undefined && typeof body.settings === "object") {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { settings: true },
      });

      const currentSettings = (currentUser?.settings && typeof currentUser.settings === "object")
        ? (currentUser.settings as Record<string, unknown>)
        : {};

      data.settings = { ...currentSettings, ...body.settings };
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        settings: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
