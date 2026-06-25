import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ActivityTraceService } from "@/lib/ai/trace/ActivityTraceService";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const traceService = new ActivityTraceService();
  const result = await traceService.getTraces(userId, { limit, offset });

  if (!result) {
    return NextResponse.json({ traces: [], total: 0 });
  }

  const { traces, total } = result;

  return NextResponse.json({ traces, total });
}
