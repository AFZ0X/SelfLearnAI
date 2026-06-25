import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { listMemories, createMemory } from "@/lib/db/memories";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { validateMemoryText } from "@/lib/safety/safety-validator";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";
import { requireNotBanned } from "@/lib/auth/ban-check";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const memories = await listMemories(session.user.id);
  return NextResponse.json({ memories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const guard = rateLimitGuard(session.user.id, request, "/api/memories");
  if (guard) return guard;

  try {
    await requireNotBanned(session.user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Access denied.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { text, type, summary, source, tags } = body as {
      text?: string;
      type?: string;
      summary?: string;
      source?: string;
      tags?: string[];
    };

    const textValidation = validateMemoryText(text || "", 5000);
    if (!textValidation.valid) {
      if (textValidation.reason.includes("sensitive")) {
        logSafetyEvent({
          type: "blocked_secret_storage",
          timestamp: new Date().toISOString(),
          userId: session.user.id,
          route: "/api/memories",
          details: "Blocked memory creation with sensitive content",
        });
      }
      return NextResponse.json({ error: textValidation.reason }, { status: 400 });
    }

    const memory = await createMemory(session.user.id, {
      text: text!,
      type,
      summary,
      source,
      tags,
    });

    let embeddingModel: string | null = null;

    try {
      const embeddingProvider = getEmbeddingProvider();
      const embedding = await embeddingProvider.generateEmbedding(text!);
      embeddingModel =
        process.env.EMBEDDING_PROVIDER === "openai"
          ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
          : "mock-v1";

      await saveEmbedding(memory.id, embedding, embeddingModel);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Embedding generation failed.";
      return NextResponse.json(
        {
          memory,
          embeddingError: message,
          warning:
            "Memory was saved but embedding generation failed. The memory will not be searchable.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ memory }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
