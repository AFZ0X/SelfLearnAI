import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { LearningCandidateService } from "@/lib/ai/learning/LearningCandidateService";
import { LearningConfigService } from "@/lib/ai/learning/LearningConfigService";
import { SensitivityClassifier, isBlockedSensitivity } from "@/lib/ai/learning/SensitivityClassifier";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";
import { requireNotBanned } from "@/lib/auth/ban-check";

const candidateService = new LearningCandidateService();
const configService = new LearningConfigService();
const classifier = new SensitivityClassifier();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;

  const candidates = await candidateService.list(session.user.id, status);
  return NextResponse.json({ candidates });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const guard = rateLimitGuard(session.user.id, request, "/api/learning");
  if (guard) return guard;

  try {
    await requireNotBanned(session.user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Access denied.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  try {
    const config = await configService.getConfig(session.user.id);
    if (!config.learningEnabled) {
      return NextResponse.json(
        { error: "Learning is disabled. Enable learning in settings to create candidates." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { text, summary, source, sensitivity, confidence, tags } = body as {
      text?: string;
      summary?: string;
      source?: string;
      sensitivity?: string;
      confidence?: number;
      tags?: string[];
    };

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Candidate text is required." }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "Candidate text must be 5000 characters or fewer." }, { status: 400 });
    }

    const textSensitivity = classifier.classify(text);
    if (isBlockedSensitivity(textSensitivity)) {
      logSafetyEvent({
        type: "blocked_secret_storage",
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        route: "/api/learning/candidates",
        details: "Blocked candidate with sensitive content",
      });
      return NextResponse.json(
        { error: "Candidate contains sensitive content (API keys, passwords, tokens) and cannot be stored." },
        { status: 400 }
      );
    }

    if (summary) {
      const summarySensitivity = classifier.classify(summary);
      if (isBlockedSensitivity(summarySensitivity)) {
        logSafetyEvent({
          type: "blocked_secret_storage",
          timestamp: new Date().toISOString(),
          userId: session.user.id,
          route: "/api/learning/candidates",
          details: "Blocked candidate summary with sensitive content",
        });
        return NextResponse.json(
          { error: "Candidate summary contains sensitive content and cannot be stored." },
          { status: 400 }
        );
      }
    }

    if (source) {
      const sourceSensitivity = classifier.classify(source);
      if (isBlockedSensitivity(sourceSensitivity)) {
        return NextResponse.json(
          { error: "Candidate source contains sensitive content and cannot be stored." },
          { status: 400 }
        );
      }
    }

    const validSensitivities = ["LOW", "MEDIUM", "HIGH"];
    const sensitivityLevel = sensitivity && validSensitivities.includes(sensitivity) ? sensitivity : "LOW";

    const candidate = await candidateService.create({
      userId: session.user.id,
      text: text.trim(),
      summary: summary?.trim(),
      source: source?.trim(),
      sensitivity: sensitivityLevel as "LOW" | "MEDIUM" | "HIGH",
      confidence: typeof confidence === "number" ? confidence : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
