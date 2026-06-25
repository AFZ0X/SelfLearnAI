import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { validateArchitecture, type NetworkConfig } from "@/lib/ai-lab/neural/network";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const experiments = await prisma.neuralExperiment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ experiments });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const guard = rateLimitGuard(session.user.id, request, "/api/ai-lab");
  if (guard) return guard;

  try {
    const body = await request.json();
    const { name, datasetName, architecture } = body as {
      name?: string;
      datasetName?: string;
      architecture?: unknown;
    };

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 200) {
      return NextResponse.json({ error: "Name must be between 1 and 200 characters." }, { status: 400 });
    }

    if (datasetName !== "xor" && datasetName !== "2d-classification") {
      return NextResponse.json({ error: "Dataset must be 'xor' or '2d-classification'." }, { status: 400 });
    }

    if (architecture) {
      const validationError = validateArchitecture(architecture as NetworkConfig);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const experiment = await prisma.neuralExperiment.create({
      data: {
        name: name.trim(),
        datasetName,
        architecture: architecture ?? {},
        userId: session.user.id,
      },
    });

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
