import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getProvider } from "@/lib/ai/providers/AIProvider";
import type { ChatMessage } from "@/lib/ai/providers/AIProvider";
import { getConversation } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";
import { MemoryRetrievalService } from "@/lib/ai/retrieval/MemoryRetrievalService";
import { PromptContextBuilder } from "@/lib/ai/retrieval/PromptContextBuilder";
import { WebSearchService } from "@/lib/ai/web/WebSearchService";
import { WebFetchService, type FetchedPage } from "@/lib/ai/web/WebFetchService";
import { SourceSummarizer, type SourceSummary } from "@/lib/ai/web/SourceSummarizer";
import { WebContextBuilder } from "@/lib/ai/web/WebContextBuilder";
import { prisma } from "@/lib/db/prisma";
import { LearningExtractionService } from "@/lib/ai/learning/LearningExtractionService";
import { LearningCandidateService } from "@/lib/ai/learning/LearningCandidateService";
import { LearningConfigService } from "@/lib/ai/learning/LearningConfigService";
import { SensitivityClassifier, isBlockedSensitivity } from "@/lib/ai/learning/SensitivityClassifier";
import { createMemory } from "@/lib/db/memories";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";
import { rateLimitGuard } from "@/lib/safety/route-guard";
import { validateChatMessage } from "@/lib/safety/safety-validator";
import { ActivityTraceService } from "@/lib/ai/trace/ActivityTraceService";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES = 50;

function detectIntent(text: string): { type: string; confidence: number } {
  if (!text?.trim()) return { type: "unknown", confidence: 0 };
  const lower = text.toLowerCase();
  if (/^(who|what|when|where|why|how)\b/i.test(lower)) return { type: "question", confidence: 0.9 };
  if (/^(can|could|will|would|please)\b/i.test(lower)) return { type: "request", confidence: 0.8 };
  if (/^(tell|show|list|find|search|give)\b/i.test(lower)) return { type: "command", confidence: 0.7 };
  if (/^(hi|hello|hey)\b/i.test(lower)) return { type: "greeting", confidence: 0.9 };
  if (/\b(yes|no|maybe|sure|okay|ok)\b/i.test(lower)) return { type: "affirmation", confidence: 0.6 };
  return { type: "statement", confidence: 0.5 };
}

function detectExplicitSaveCommand(text: string): boolean {
  if (!text?.trim()) return false;
  const patterns = [
    /احفظ[\s\S]{0,100}ذاكرت/im,
    /تذكر[\s\S]{0,100}ذاكرت/im,
    /اذكر[\s\S]{0,100}ذاكرت/im,
    /خزن[\s\S]{0,100}ذاكرت/im,
    /\bsave\b[\s\S]{0,50}\bmemory\b/im,
    /\bremember\b[\s\S]{0,20}\b(this|that|it)\b/im,
    /\bstore\b[\s\S]{0,50}\bmemory\b/im,
    /\bmemorize\b[\s\S]{0,20}\b(this|that|it)\b/im,
    /\bkeep\b[\s\S]{0,5}\b(this|that)\b[\s\S]{0,25}\bmemory\b/im,
  ];
  return patterns.some((p) => p.test(text));
}

type SaveActionResult =
  | { handled: true; action: "saved"; memory: { id: string; text: string } }
  | { handled: true; action: "needs_approval" }
  | { handled: true; action: "rejected" }
  | { handled: false };

async function handleExplicitSaveCommand(
  userId: string,
  userContent: string
): Promise<SaveActionResult> {
  if (!userContent?.trim()) return { handled: false };
  if (!detectExplicitSaveCommand(userContent)) return { handled: false };

  const classifier = new SensitivityClassifier();
  const sensitivity = classifier.classify(userContent);

  if (sensitivity === "SECRET" || isBlockedSensitivity(sensitivity)) {
    return { handled: true, action: "rejected" };
  }

  if (sensitivity === "HIGH") {
    const candidateService = new LearningCandidateService();
    await candidateService.create({
      userId,
      text: userContent,
      summary: userContent.slice(0, 100),
      source: "chat",
      sensitivity: "HIGH",
      status: "PENDING",
      tags: ["save_command"],
    });
    return { handled: true, action: "needs_approval" };
  }

  const memory = await createMemory(userId, {
    text: userContent,
    summary: userContent.slice(0, 150),
    source: "chat",
    confidence: 1.0,
    tags: ["saved"],
  });

  try {
    const embeddingProvider = getEmbeddingProvider();
    const embedding = await embeddingProvider.generateEmbedding(userContent);
    const model =
      process.env.EMBEDDING_PROVIDER === "openai"
        ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
        : "mock-v1";
    await saveEmbedding(memory.id, embedding, model);
  } catch {
    // Embedding failure is non-fatal
  }

  return { handled: true, action: "saved", memory: { id: memory.id, text: memory.text } };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const guard = rateLimitGuard(session.user.id, request, "/api/chat");
  if (guard) return guard;

  const userId = session.user.id;
  const traceService = new ActivityTraceService();
  let traceId: string | null = null;
  let stepId: string | null = null;

  try {
    const body = await request.json();
    const { messages, conversationId } = body as {
      messages?: unknown;
      conversationId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty." },
        { status: 400 }
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Too many messages. Maximum is ${MAX_MESSAGES}.` },
        { status: 400 }
      );
    }

    if (conversationId !== undefined && typeof conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId must be a string." },
        { status: 400 }
      );
    }

    if (conversationId) {
      const ownership = await getConversation(conversationId, userId);
      if (!ownership) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 }
        );
      }
    }

    const typedMessages: ChatMessage[] = [];
    const lastUserMessage = messages[messages.length - 1];

    for (const msg of messages) {
      if (
        typeof msg !== "object" ||
        msg === null ||
        typeof msg.role !== "string" ||
        typeof msg.content !== "string"
      ) {
        return NextResponse.json(
          { error: "Each message must have a 'role' (string) and 'content' (string)." },
          { status: 400 }
        );
      }

      if (!["user", "assistant"].includes(msg.role)) {
        return NextResponse.json(
          { error: "Message role must be 'user' or 'assistant'." },
          { status: 400 }
        );
      }

      const validation = validateChatMessage(msg.content, MAX_MESSAGE_LENGTH);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }

      typedMessages.push({ role: msg.role, content: msg.content });
    }

    const userContent = lastUserMessage?.content as string | undefined;

    // Start trace
    const trace = await traceService.startTrace(userId, conversationId);
    traceId = trace?.id ?? null;

    // Input step
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Input"))?.id ?? null;
      if (stepId) {
        await traceService.completeStep(stepId, {
          messageLength: userContent?.length ?? 0,
          hasConversationId: !!conversationId,
        });
      }
    }

    let savedUserMessage = null;
    if (conversationId && userContent) {
      savedUserMessage = await createMessage(conversationId, "user", userContent);
    }

    // Intent Detection
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Intent_Detection"))?.id ?? null;
    }
    const intent = detectIntent(userContent || "");
    if (stepId) {
      await traceService.completeStep(stepId, {
        intentType: intent.type,
        intentConfidence: intent.confidence,
      });
      stepId = null;
    }

    // Memory Retrieval
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Memory_Retrieval"))?.id ?? null;
    }
    const retrievalService = new MemoryRetrievalService();
    const retrievalResult = await retrievalService.retrieveRelevantMemories(
      userId,
      userContent || ""
    );
    if (stepId) {
      await traceService.completeStep(stepId, {
        memoriesFound: retrievalResult.memories.length,
        memoryUsed: retrievalResult.memoryUsed,
      });
      stepId = null;
    }

    // Explicit Save Command
    let saveActionResult: SaveActionResult = { handled: false };
    if (userContent) {
      saveActionResult = await handleExplicitSaveCommand(userId, userContent);
    }

    // Vector Search
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Vector_Search"))?.id ?? null;
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        queryLength: userContent?.length ?? 0,
        resultsCount: retrievalResult.memories.length,
      });
      stepId = null;
    }

    // Web Search Decision
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Web_Search_Decision"))?.id ?? null;
    }
    const webSearchService = new WebSearchService();
    const searchOutcome = await webSearchService.search(userContent || "");
    if (stepId) {
      await traceService.completeStep(stepId, {
        searchTriggered: searchOutcome.webSearchUsed,
        searchReason: searchOutcome.webSearchUsed ? "keyword_match" : "not_needed",
        resultsCount: searchOutcome.results.length,
      });
      stepId = null;
    }

    let webContextStr = "";
    let citations: Array<{ title: string; url: string; snippet: string }> = [];

    if (searchOutcome.webSearchUsed && searchOutcome.results.length > 0) {
      // Web Source Fetch
      if (traceId) {
        stepId = (await traceService.startStep(traceId, "Web_Source_Fetch"))?.id ?? null;
      }
      const fetchService = new WebFetchService();
      const summarizer = new SourceSummarizer();
      const contextBuilder = new WebContextBuilder();

      const fetchedPages: FetchedPage[] = [];
      const summaries: SourceSummary[] = [];

      for (const result of searchOutcome.results) {
        let page: FetchedPage;
        try {
          page = await fetchService.fetchPage(result.url);
        } catch {
          page = { url: result.url, title: result.title, text: result.snippet, fetchedAt: result.fetchedAt };
        }
        fetchedPages.push(page);
        summaries.push(summarizer.summarize(page.text));
      }

      const totalChars = fetchedPages.reduce((sum, p) => sum + (p.text?.length || 0), 0);
      if (stepId) {
        await traceService.completeStep(stepId, {
          pagesFetched: fetchedPages.length,
          totalChars,
        });
        stepId = null;
      }

      // Source Summarization
      if (traceId) {
        stepId = (await traceService.startStep(traceId, "Source_Summarization"))?.id ?? null;
      }
      const built = contextBuilder.buildContext(searchOutcome.results, fetchedPages, summaries);
      webContextStr = built.webContext;
      citations = built.citations;
      if (stepId) {
        await traceService.completeStep(stepId, {
          summariesCount: summaries.length,
        });
        stepId = null;
      }

      if (conversationId) {
        const now = new Date();
        await prisma.webSource.createMany({
          data: searchOutcome.results.map((r, i) => ({
            userId,
            conversationId,
            url: r.url,
            title: fetchedPages[i]?.title || r.title,
            snippet: summaries[i]?.snippet.slice(0, 500) || r.snippet,
            summary: summaries[i]?.snippet.slice(0, 1000) || null,
            fetchedAt: now,
            provider: process.env.SEARCH_PROVIDER || "mock",
          })),
        });
      }
    }

    // Prompt Builder
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Prompt_Builder"))?.id ?? null;
    }
    const promptBuilder = new PromptContextBuilder();
    let systemPrompt = promptBuilder.buildSystemPrompt({
      memoryContext: retrievalResult.memories,
      webContext: webContextStr || undefined,
    });

    if (saveActionResult.handled) {
      if (saveActionResult.action === "saved") {
        systemPrompt += `\n\n[SYSTEM NOTE: A new memory was saved with your message. The saved content is: "${saveActionResult.memory.text}" You may refer to this when responding.]`;
      } else if (saveActionResult.action === "needs_approval") {
        systemPrompt += `\n\n[SYSTEM NOTE: The user asked to save something to memory but it requires approval. Explain that it needs to be approved from the Learning page first.]`;
      } else if (saveActionResult.action === "rejected") {
        systemPrompt += `\n\n[SYSTEM NOTE: The user asked to save something to memory but it was rejected because it contained sensitive data. Explain that sensitive information cannot be saved.]`;
      }
    }

    if (stepId) {
      await traceService.completeStep(stepId, {
        memoryContextChars: systemPrompt.length,
        webContextChars: webContextStr.length,
      });
      stepId = null;
    }

    // LLM Provider
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "LLM_Provider"))?.id ?? null;
    }
    let provider;
    try {
      provider = getProvider();
    } catch (err) {
      if (stepId) {
        await traceService.failStep(stepId, "Provider configuration error");
      }
      if (traceId) {
        await traceService.failTrace(traceId);
      }
      const message = err instanceof Error ? err.message : "Provider configuration error.";
      return NextResponse.json(
        { error: message },
        { status: 503 }
      );
    }

    let result;
    try {
      result = await provider.generateChatResponse(typedMessages, {
        system: systemPrompt,
      });
    } catch (err) {
      if (stepId) {
        await traceService.failStep(stepId, "AI provider error");
      }
      if (traceId) {
        await traceService.failTrace(traceId);
      }
      const message = err instanceof Error ? err.message : "AI provider error.";
      return NextResponse.json(
        { error: message },
        { status: 502 }
      );
    }

    const providerType = (process.env.AI_PROVIDER || "mock").toLowerCase();
    if (stepId) {
      await traceService.completeStep(stepId, {
        provider: providerType,
        responseTimeMs: 0,
      });
      stepId = null;
    }

    let savedAssistantMessage = null;
    if (conversationId) {
      savedAssistantMessage = await createMessage(
        conversationId,
        "assistant",
        result.content
      );
    }

    const memoriesUsed = retrievalResult.memories.map((m) => ({
      id: m.id,
      summary: m.summary || m.text.slice(0, 100),
      relevanceLabel: m.relevanceLabel,
    }));

    // Learning Pipeline
    // Skip when a direct save already handled the message
    let candidatesExtracted = 0;
    if (saveActionResult.handled && saveActionResult.action === "saved") {
      candidatesExtracted = 0;
    } else {
      if (traceId) {
        stepId = (await traceService.startStep(traceId, "Learning_Pipeline"))?.id ?? null;
      }
      const extractionService = new LearningExtractionService();
      const candidateService = new LearningCandidateService();
      const configService = new LearningConfigService();

      try {
        const result_ = await extractionService.processAndStore(
          userId,
          conversationId || null,
          userContent || "",
          result.content,
          candidateService,
          configService
        );
        candidatesExtracted = result_.stored;
      } catch {
        // Learning extraction is non-fatal
      }
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        candidatesExtracted,
      });
      stepId = null;
    }

    // Feedback Signal (no-op here — feedback happens post-response)
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Feedback_Signal"))?.id ?? null;
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        feedbackApplied: false,
      });
      stepId = null;
    }

    // Final Response
    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Final_Response"))?.id ?? null;
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        responseLength: result.content.length,
      });
      stepId = null;
    }

    if (traceId) {
      await traceService.completeTrace(traceId);
    }

    return NextResponse.json({
      role: "assistant",
      content: result.content,
      memoryUsed: retrievalResult.memoryUsed,
      ...(retrievalResult.memoryUsed ? { memoriesUsed } : {}),
      webSearchUsed: searchOutcome.webSearchUsed,
      ...(citations.length > 0 ? { citations } : {}),
      ...(savedUserMessage ? { userMessageId: savedUserMessage.id } : {}),
      ...(savedAssistantMessage ? { messageId: savedAssistantMessage.id } : {}),
      ...(conversationId ? { conversationId } : {}),
      ...(candidatesExtracted > 0 ? { candidatesExtracted } : {}),
      ...(saveActionResult.handled && saveActionResult.action === "saved"
        ? { memorySaved: true, memorySavedId: saveActionResult.memory.id }
        : {}),
    });
  } catch {
    if (traceId) {
      await traceService.failTrace(traceId);
    }
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
