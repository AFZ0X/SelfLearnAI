import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";

export async function POST(request: NextRequest) {
  const guard = rateLimitGuard(undefined, request, "/api/auth/register");
  if (guard) return guard;

  try {
    const { email, name, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password must be 128 characters or fewer." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      logSafetyEvent({
        type: "failed_auth_attempt",
        timestamp: new Date().toISOString(),
        route: "/api/auth/register",
        details: "Duplicate registration attempt",
      });
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    void error;
    logSafetyEvent({
      type: "failed_auth_attempt",
      timestamp: new Date().toISOString(),
      route: "/api/auth/register",
      details: "Registration error",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
