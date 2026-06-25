import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ActivityTraceService } from "@/lib/ai/trace/ActivityTraceService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const traceService = new ActivityTraceService();
  const trace = await traceService.getTrace(id, userId);

  if (!trace) {
    return NextResponse.json({ error: "Trace not found." }, { status: 404 });
  }

  return NextResponse.json({ trace });
}
