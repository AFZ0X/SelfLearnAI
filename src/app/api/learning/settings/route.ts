import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { LearningConfigService } from "@/lib/ai/learning/LearningConfigService";

const configService = new LearningConfigService();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const config = await configService.getConfig(session.user.id);
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { learningEnabled, autoStoreLow, requireApproval, maxCandidates } = body as {
      learningEnabled?: boolean;
      autoStoreLow?: boolean;
      requireApproval?: boolean;
      maxCandidates?: number;
    };

    const config = await configService.updateConfig(session.user.id, {
      learningEnabled: typeof learningEnabled === "boolean" ? learningEnabled : undefined,
      autoStoreLow: typeof autoStoreLow === "boolean" ? autoStoreLow : undefined,
      requireApproval: typeof requireApproval === "boolean" ? requireApproval : undefined,
      maxCandidates: typeof maxCandidates === "number" ? maxCandidates : undefined,
    });

    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
