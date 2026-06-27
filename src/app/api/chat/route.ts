import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getProvider } from "@/lib/ai/providers/AIProvider";
import type { ChatMessage } from "@/lib/ai/providers/AIProvider";
import { getConversation } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";
import { MemoryRetrievalServiceV2 } from "@/lib/ai/memory/MemoryRetrievalServiceV2";
import { MemoryAnswerService } from "@/lib/ai/memory/MemoryAnswerService";
import { MemoryExtractionServiceV2 } from "@/lib/ai/memory/MemoryExtractionServiceV2";
import { MemoryWriteService } from "@/lib/ai/memory/MemoryWriteService";

import { ProfileMemoryService } from "@/lib/ai/memory/ProfileMemoryService";
import { ConversationContextBuilder } from "@/lib/ai/context/ConversationContextBuilder";
import { buildCurrentDateContext } from "@/lib/ai/retrieval/PromptContextBuilder";
import { ResponseStyleService } from "@/lib/ai/retrieval/ResponseStyleService";
import { WebSearchService } from "@/lib/ai/web/WebSearchService";
import { ReasoningEngine } from "@/lib/ai/reasoning/ReasoningEngine";
import { WebFetchService, type FetchedPage } from "@/lib/ai/web/WebFetchService";
import { SourceSummarizer } from "@/lib/ai/web/SourceSummarizer";
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
import { requireNotBanned } from "@/lib/auth/ban-check";
import { getProviderStatus } from "@/lib/ai/search/SearchProvider";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES = 50;

function logError(context: string, error: unknown): void {
  console.error(`[Chat] ${context}:`, error instanceof Error ? error.message : String(error));
}

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
    /[وفبل]احفظ[\s\S]{0,100}ذاكرت/im,
    /[وفبل]تذكر[\s\S]{0,100}ذاكرت/im,
    /[وفبل]اذكر[\s\S]{0,100}ذاكرت/im,
    /[وفبل]خزن[\s\S]{0,100}ذاكرت/im,
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

  let memoryText = userContent;
  const extractPatterns = [
    /^(.*?)[\s]*[وفبل]?(احفظ|تذكر|اذكر|خزن)[\s\S]*$/im,
    /^(.*?)[\s]*\b(remember|save|store|memorize|keep)\b[\s\S]*$/im,
  ];
  for (const pat of extractPatterns) {
    const m = userContent.match(pat);
    if (m && m[1] && m[1].trim().length > 2) {
      memoryText = m[1].trim();
      break;
    }
  }

  const extractionService = new MemoryExtractionServiceV2();
  const writeService = new MemoryWriteService();

  const extracted = extractionService.extract(memoryText);
  if (extracted) {
    const writeResult = await writeService.write({
      userId,
      key: extracted.key,
      value: extracted.value,
      text: memoryText,
      source: "explicit_save",
      confidence: extracted.confidence,
      tags: ["saved", extracted.key],
    });
    return { handled: true, action: "saved", memory: { id: writeResult.memoryId, text: memoryText } };
  }

  const memory = await createMemory(userId, {
    text: memoryText,
    summary: memoryText.slice(0, 150),
    source: "chat",
    confidence: 1.0,
    tags: ["saved"],
  });

  try {
    const embeddingProvider = getEmbeddingProvider();
    const embedding = await embeddingProvider.generateEmbedding(memoryText);
    const model =
      process.env.EMBEDDING_PROVIDER === "openai"
        ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
        : "mock-v1";
    await saveEmbedding(memory.id, embedding, model);
  } catch (e) {
    logError("embedding generation failed", e);
  }

  return { handled: true, action: "saved", memory: { id: memory.id, text: memory.text } };
}

async function getUserSettings(userId: string): Promise<{ webSearchEnabled: boolean; responseStyle: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    if (user?.settings && typeof user.settings === "object") {
      const settings = user.settings as Record<string, unknown>;
      return {
        webSearchEnabled: typeof settings.webSearchEnabled === "boolean" ? settings.webSearchEnabled : true,
        responseStyle: typeof settings.responseStyle === "string" ? settings.responseStyle : "SHORT",
      };
    }
  } catch (e) {
    logError("getUserSettings", e);
  }
  return { webSearchEnabled: true, responseStyle: "SHORT" };
}

async function saveUserWebSearchSetting(userId: string, enabled: boolean): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    const currentSettings = (user?.settings && typeof user.settings === "object")
      ? (user.settings as Record<string, unknown>)
      : {};
    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: { ...currentSettings, webSearchEnabled: enabled },
      },
    });
  } catch (e) {
    logError("saveUserWebSearchSetting", e);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const guard = rateLimitGuard(session.user.id, request, "/api/chat");
  if (guard) return guard;

  const userId = session.user.id;

  try {
    await requireNotBanned(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Access denied.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
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

    let conversationHistory: ChatMessage[] = [];
    if (conversationId) {
      const ownership = await getConversation(conversationId, userId);
      if (!ownership) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 }
        );
      }
      const ctxBuilder = new ConversationContextBuilder();
      const ctx = await ctxBuilder.loadConversationHistory(conversationId);
      conversationHistory = ctx.history;
    }

    const typedMessages: ChatMessage[] = [...conversationHistory];
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

    const trace = await traceService.startTrace(userId, conversationId);
    traceId = trace?.id ?? null;

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

    const extractionService = new MemoryExtractionServiceV2();
    const answerService = new MemoryAnswerService();
    const profileService = new ProfileMemoryService();
    const retrievalService = new MemoryRetrievalServiceV2();
    const ignoreMemory = userContent ? extractionService.isIgnoreMemoryQuery(userContent) : false;

    // Memory gating: skip memory for greetings and non-personal messages
    const isGreeting = intent.type === "greeting";
    const shouldUseMemory = userContent && !ignoreMemory && !isGreeting;

    let directAnswer: { answer: string; retrievalMode: string } | null = null;
    if (shouldUseMemory) {
      try {
        const da = await answerService.answerFromMemory(userId, userContent, false);
        if (da.answer) {
          directAnswer = { answer: da.answer, retrievalMode: da.retrievalMode };
        }
      } catch (e) {
        logError("direct memory answer failed", e);
      }
    }

    if (directAnswer) {
      return NextResponse.json({
        role: "assistant",
        content: directAnswer.answer,
        memoryUsed: true,
        responseMode: "SHORT",
        retrievalMode: directAnswer.retrievalMode,
        reasoningPlan: "MEMORY_ONLY",
        reasoningSummary: "Direct profile answer from exact memory lookup",
        confidenceLabel: "HIGH",
        confidenceScore: 1.0,
      });
    }

    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Memory_Retrieval"))?.id ?? null;
    }
    let retrievalResult: Awaited<ReturnType<typeof retrievalService.retrieve>>;
    if (shouldUseMemory) {
      try {
        retrievalResult = await retrievalService.retrieve(
          userId,
          userContent || ""
        );
      } catch (e) {
        logError("memory retrieval failed", e);
        retrievalResult = { memories: [], profileFacts: [], memoryUsed: false, retrievalMode: "none", confidence: 0 };
      }
    } else {
      retrievalResult = { memories: [], profileFacts: [], memoryUsed: false, retrievalMode: "none", confidence: 0 };
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        memoriesFound: retrievalResult.memories.length,
        memoryUsed: retrievalResult.memoryUsed,
        memoryConfidence: retrievalResult.confidence,
        retrievalMode: retrievalResult.retrievalMode,
      });
      stepId = null;
    }

    let profileFactKey: string | null = null;
    let profileFactAction: string | null = null;
    let profileConflictResolved = false;
    let profileResult: Awaited<ReturnType<typeof profileService.process>> | null = null;
    if (userContent) {
      try {
        profileResult = await profileService.process(userId, userContent);
      } catch (e) {
        logError("profile memory process failed", e);
      }
      if (profileResult) {
        const pr = profileResult;
      profileFactKey = pr.key;
      profileFactAction = pr.action;
      profileConflictResolved = pr.conflictResolved;
      if ((pr.action === "saved" || pr.action === "found") && pr.value && pr.memoryId) {
        const alreadyInMemories = retrievalResult.memories.some(
          (m) => m.id === pr.memoryId || m.tags.includes(pr.key || "")
        );
        if (!alreadyInMemories) {
          retrievalResult.memories.unshift({
            id: pr.memoryId,
            text: pr.value,
            summary: `${pr.key}: ${pr.value}`,
            tags: pr.key ? ["profile", pr.key] : ["profile"],
            status: "active",
            similarity: 1.0,
            relevanceLabel: "high",
            memoryKey: pr.key,
            retrievalMode: "exact",
          });
          retrievalResult.memoryUsed = true;
        }
      }
    }
    }

    let saveActionResult: SaveActionResult = { handled: false };
    if (userContent) {
      try {
        saveActionResult = await handleExplicitSaveCommand(userId, userContent);
      } catch (e) {
        logError("explicit save command failed", e);
      }
    }

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

    const userSettings = await getUserSettings(userId);
    const webSearchEnabled = userSettings.webSearchEnabled;
    const searchDecisionStart = Date.now();
    const webSearchService = new WebSearchService();
    const memoryConfidence = retrievalResult.memories.length > 0
      ? Math.max(...retrievalResult.memories.map((m) => m.similarity || 0))
      : undefined;

    let searchOutcome;
    if (webSearchEnabled) {
      searchOutcome = await webSearchService.searchWithDecision(userContent || "", memoryConfidence);
    } else {
      searchOutcome = { results: [], webSearchUsed: false, decisionResult: undefined, usingMock: false };
    }
    const searchDurationMs = Date.now() - searchDecisionStart;

    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Web_Search_Decision"))?.id ?? null;
    }
    if (stepId) {
      const decisionMeta: Record<string, unknown> = {
        searchTriggered: searchOutcome.webSearchUsed,
        searchReason: searchOutcome.decisionResult?.reason || "not_needed",
        searchDecision: searchOutcome.decisionResult?.decision || "NO_SEARCH",
        searchDecisionConfidence: searchOutcome.decisionResult?.confidenceScore || 0,
        sourcesFound: searchOutcome.results.length,
        searchDurationMs,
        webSearchEnabled,
        forcedSearch: searchOutcome.decisionResult?.decision === "FORCED_SEARCH" || undefined,
      };
      if (searchOutcome.decisionResult?.detectedTriggers && searchOutcome.decisionResult.detectedTriggers.length > 0) {
        decisionMeta.detectedTriggers = searchOutcome.decisionResult.detectedTriggers;
      }
      if (searchOutcome.searchFailed) {
        decisionMeta.searchFailed = true;
        decisionMeta.originalDecision = searchOutcome.originalDecision;
      }
      if (searchOutcome.classification) {
        decisionMeta.queryType = searchOutcome.classification.type;
        decisionMeta.isTimeSensitive = searchOutcome.classification.isTimeSensitive;
        decisionMeta.needsOfficialSource = searchOutcome.classification.needsOfficialSource;
      }
      if (searchOutcome.rewrittenQuery) {
        decisionMeta.rewrittenQuery = searchOutcome.rewrittenQuery;
      }
      if (searchOutcome.freshnessResult) {
        decisionMeta.sourcesAccepted = searchOutcome.freshnessResult.acceptedSources.length;
        decisionMeta.sourcesRejected = searchOutcome.freshnessResult.rejectedSources.length;
        decisionMeta.hasFreshSource = searchOutcome.freshnessResult.hasFreshSource;
        decisionMeta.allRejected = searchOutcome.freshnessResult.allRejected;
        decisionMeta.freshnessGatePassed = searchOutcome.freshnessResult.acceptedSources.length > 0;
      }
      if (searchOutcome.sufficiencyResult) {
        decisionMeta.evidenceSufficient = searchOutcome.sufficiencyResult.sufficient;
        decisionMeta.evidenceConfidence = searchOutcome.sufficiencyResult.confidence;
        decisionMeta.controlledResponseUsed = !!searchOutcome.sufficiencyResult.controlledResponse;
      }
      if (searchOutcome.rejectionSummary) {
        decisionMeta.rejectionReasons = searchOutcome.rejectionSummary.reasons;
      }
      const providerInfo = getProviderStatus();
      decisionMeta.searchProvider = providerInfo.name;
      await traceService.completeStep(stepId, decisionMeta);
      stepId = null;
    }

    let webContextStr = "";
    let citations: Array<{ title: string; url: string; snippet: string }> = [];

    const isMockProvider = searchOutcome.usingMock === true;

    const originalDecision = searchOutcome.originalDecision || searchOutcome.decisionResult?.decision;
    const forcedSearch = originalDecision === "FORCED_SEARCH";
    const searchRequired = forcedSearch || originalDecision === "REQUIRED_SEARCH" || originalDecision === "UNCERTAIN_SEARCH";
    const searchFailed = searchOutcome.searchFailed === true;

    if (searchRequired && (searchFailed || !searchOutcome.webSearchUsed)) {
      if (traceId) {
        await traceService.failTrace(traceId);
      }
      const forcedMsg = forcedSearch
        ? "You asked me to search the web, but no real search provider is configured. To enable web search, set SEARCH_PROVIDER=tavily with a valid TAVILY_API_KEY in your environment variables."
        : "Web search is required for this question, but no real search provider is configured. To enable real-time information retrieval, set SEARCH_PROVIDER=tavily with a valid TAVILY_API_KEY in your environment variables.";
      return NextResponse.json({
        role: "assistant",
        content: forcedMsg,
        webSearchUsed: false,
        webSearchDecision: originalDecision,
        webSearchReason: searchOutcome.decisionResult?.reason || "Search required but no real provider configured",
        searchFailed: true,
      });
    }

    if (searchOutcome.webSearchUsed && searchOutcome.results.length > 0) {
      if (traceId) {
        stepId = (await traceService.startStep(traceId, "Web_Source_Fetch"))?.id ?? null;
      }
      const fetchService = new WebFetchService();
      const summarizer = new SourceSummarizer();
      const contextBuilder = new WebContextBuilder();

      const pageResults = await Promise.all(
        searchOutcome.results.map(async (result) => {
          try {
            const page = await fetchService.fetchPage(result.url);
            return { page, summary: summarizer.summarize(page.text) };
          } catch {
            const fallback: FetchedPage = { url: result.url, title: result.title, text: result.snippet, fetchedAt: result.fetchedAt };
            return { page: fallback, summary: summarizer.summarize(fallback.text) };
          }
        })
      );
      const fetchedPages = pageResults.map((r) => r.page);
      const summaries = pageResults.map((r) => r.summary);

      const totalChars = fetchedPages.reduce((sum, p) => sum + (p.text?.length || 0), 0);
      if (stepId) {
        await traceService.completeStep(stepId, {
          pagesFetched: fetchedPages.length,
          totalChars,
        });
        stepId = null;
      }

      if (traceId) {
        stepId = (await traceService.startStep(traceId, "Source_Summarization"))?.id ?? null;
      }
      const built = contextBuilder.buildContext(
        searchOutcome.results,
        fetchedPages,
        summaries,
        searchOutcome.classification,
        searchOutcome.sufficiencyResult
      );
      webContextStr = built.webContext;
      citations = built.citations;
      if (!webContextStr) {
        searchOutcome.webSearchUsed = false;
      }
      if (stepId) {
        await traceService.completeStep(stepId, {
          summariesCount: summaries.length,
          sourcesUsed: citations.length,
          citationsGenerated: citations.length,
          evidenceConfidence: built.validation.confidence,
          evidenceWarnings: built.validation.warnings.length,
          evidenceConflicts: built.validation.conflicts,
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

    if (searchOutcome.sufficiencyResult?.controlledResponse) {
      if (traceId) {
        await traceService.failTrace(traceId);
      }
      return NextResponse.json({
        role: "assistant",
        content: searchOutcome.sufficiencyResult.controlledResponse,
        webSearchUsed: false,
        webSearchDecision: "NO_SEARCH",
        webSearchReason: "Insufficient reliable evidence",
        searchFailed: true,
        ...(searchOutcome.classification ? { queryType: searchOutcome.classification.type } : {}),
        ...(searchOutcome.rejectionSummary ? { rejectedSources: searchOutcome.rejectionSummary.total, rejectionReasons: searchOutcome.rejectionSummary.reasons } : {}),
      });
    }

    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Reasoning_Engine"))?.id ?? null;
    }
    const styleService = new ResponseStyleService();
    const styleResult = styleService.detectStyle(userContent || "", userSettings.responseStyle);
    const hasWeakEvidence = searchOutcome.sufficiencyResult?.confidence === "LOW";
    const hasExplicitSearchTrigger =
      originalDecision === "FORCED_SEARCH" ||
      (searchOutcome.decisionResult?.detectedTriggers?.includes("action_keyword") ?? false);

    const currentDateContext = buildCurrentDateContext();

    const reasoningEngine = new ReasoningEngine();
    const memoryForReasoning = ignoreMemory
      ? { memories: [], profileFacts: [], memoryUsed: false, retrievalMode: "ignored" as const, confidence: 0 }
      : retrievalResult;
    const reasoningOutput = await reasoningEngine.reason({
      query: userContent || "",
      memoryRetrievalResult: memoryForReasoning,
      webSearchOutcome: searchOutcome.webSearchUsed ? searchOutcome : undefined,
      hasExplicitSearchTrigger,
      responseStyle: styleResult.mode,
      citationsCount: citations.length,
      webContext: webContextStr || undefined,
      hasWeakEvidence,
      currentDateContext,
    });

    let systemPrompt = reasoningOutput.systemPrompt;

    if (saveActionResult.handled) {
      if (saveActionResult.action === "saved") {
        const safeText = saveActionResult.memory.text.replace(/["\n\r]/g, " ").slice(0, 200);
        systemPrompt += `\n\n[SYSTEM NOTE: A new memory was saved. The saved content is: "${safeText}" You may refer to this when responding. For example, if the user saved their name, you can recall it later.]`;
      } else if (saveActionResult.action === "needs_approval") {
        systemPrompt += `\n\n[SYSTEM NOTE: The user asked to save something to memory but it requires approval. Explain that it needs to be approved from the Learning page first.]`;
      } else if (saveActionResult.action === "rejected") {
        systemPrompt += `\n\n[SYSTEM NOTE: The user asked to save something to memory but it was rejected because it contained sensitive data. Explain that sensitive information cannot be saved.]`;
      }
    }

    if (stepId) {
      const rcMeta: Record<string, unknown> = {
        responseMode: styleResult.mode,
        userPreference: userSettings.responseStyle,
        userWantsShort: styleResult.userWantsShort,
        userWantsDetailed: styleResult.userWantsDetailed,
        userWantsAction: styleResult.userWantsAction,
        intentGoal: reasoningOutput.intent.goal,
        intentLanguage: reasoningOutput.intent.language,
        taskType: reasoningOutput.taskClassification.type,
        reasoningPlanType: reasoningOutput.reasoningPlan.planType,
        toolsUsed: `${reasoningOutput.toolDecision.useMemory ? "memory," : ""}${reasoningOutput.toolDecision.useWebSearch ? "web," : ""}${reasoningOutput.toolDecision.useInternalKnowledge ? "internal," : ""}`.replace(/,$/, ""),
        verificationPassed: reasoningOutput.verification.passed,
        confidenceScore: reasoningOutput.confidence.score,
        confidenceLabel: reasoningOutput.confidence.label,
        memoryContextChars: systemPrompt.length,
        webContextChars: webContextStr.length,
        webSearchUsed: searchOutcome.webSearchUsed,
        forcedSearch: forcedSearch || undefined,
        profileFactKey: profileFactKey || undefined,
        profileFactAction: profileFactAction || undefined,
        profileConflictResolved: profileConflictResolved || undefined,
        retrievalMode: retrievalResult.retrievalMode,
        memoryUsed: retrievalResult.memoryUsed,
        memoryKeysUsed: retrievalResult.profileFacts.map((f) => f.memoryKey).filter(Boolean) as string[] || undefined,
      };
      await traceService.completeStep(stepId, rcMeta);
      stepId = null;
    }
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
      } catch (e) {
        logError("LearningExtractionService.processAndStore", e);
      }
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        candidatesExtracted,
      });
      stepId = null;
    }

    if (traceId) {
      stepId = (await traceService.startStep(traceId, "Feedback_Signal"))?.id ?? null;
    }
    if (stepId) {
      await traceService.completeStep(stepId, {
        feedbackApplied: false,
      });
      stepId = null;
    }

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

    const showWebSearchUI = searchOutcome.webSearchUsed && !isMockProvider;
    const showCitations = citations.length > 0 && !isMockProvider;

    const memoryActuallyUsed = reasoningOutput.toolDecision.useMemory && retrievalResult.memoryUsed;

    return NextResponse.json({
      role: "assistant",
      content: result.content,
      memoryUsed: memoryActuallyUsed,
      ...(memoryActuallyUsed ? { memoriesUsed } : {}),
      webSearchUsed: showWebSearchUI,
      ...(showCitations ? { citations } : {}),
      usingMockProvider: isMockProvider || undefined,
      ...(searchOutcome.decisionResult ? {
        webSearchDecision: searchOutcome.decisionResult.decision,
        webSearchReason: searchOutcome.decisionResult.reason,
        webSearchConfidence: searchOutcome.decisionResult.confidenceScore,
      } : {}),
      ...(savedUserMessage ? { userMessageId: savedUserMessage.id } : {}),
      ...(savedAssistantMessage ? { messageId: savedAssistantMessage.id } : {}),
      ...(conversationId ? { conversationId } : {}),
      ...(candidatesExtracted > 0 ? { candidatesExtracted } : {}),
      ...(saveActionResult.handled && saveActionResult.action === "saved"
        ? { memorySaved: true, memorySavedId: saveActionResult.memory.id }
        : {}),
      ...(searchOutcome.classification ? { queryType: searchOutcome.classification.type } : {}),
      ...(searchOutcome.sufficiencyResult ? { evidenceConfidence: searchOutcome.sufficiencyResult.confidence } : {}),
      ...(searchOutcome.rejectionSummary ? { rejectedSourcesCount: searchOutcome.rejectionSummary.total } : {}),
      responseMode: styleResult.mode,
      reasoningPlan: reasoningOutput.reasoningPlan.planType,
      reasoningSummary: reasoningOutput.planSummary,
      confidenceLabel: reasoningOutput.confidence.label,
      confidenceScore: reasoningOutput.confidence.score,
      retrievalMode: retrievalResult.retrievalMode,
      memoryKeysUsed: retrievalResult.profileFacts.length > 0
        ? retrievalResult.profileFacts.map((f) => f.memoryKey).filter(Boolean)
        : undefined,
      ignoreMemory: ignoreMemory || undefined,
    });
  } catch (e) {
    logError("POST /api/chat", e);
    if (traceId) {
      await traceService.failTrace(traceId);
    }
    const isClientError = e instanceof SyntaxError || (e instanceof Error && (e as Error).message?.includes("JSON"));
    return NextResponse.json(
      { error: "Invalid request." },
      { status: isClientError ? 400 : 500 }
    );
  }
}

export { saveUserWebSearchSetting };
