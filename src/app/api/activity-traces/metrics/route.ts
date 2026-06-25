import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ActivityTraceService } from "@/lib/ai/trace/ActivityTraceService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = session.user.id;
  const traceService = new ActivityTraceService();
  const metrics = await traceService.getMetrics(userId);

  if (!metrics) {
    return NextResponse.json({ error: "Failed to compute metrics." }, { status: 500 });
  }

  return NextResponse.json({ metrics });
}
