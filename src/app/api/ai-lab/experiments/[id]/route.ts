import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const experiment = await prisma.neuralExperiment.findUnique({ where: { id } });

  if (!experiment || experiment.userId !== session.user.id) {
    return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
  }

  return NextResponse.json({ experiment });
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

  const experiment = await prisma.neuralExperiment.findUnique({ where: { id } });

  if (!experiment || experiment.userId !== session.user.id) {
    return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
  }

  await prisma.neuralExperiment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
