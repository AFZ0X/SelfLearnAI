import { getProvider } from "@/lib/ai/providers/AIProvider";
import type { ChatMessage } from "@/lib/ai/providers/AIProvider";

export type SearchDecision =
  | "NO_SEARCH"
  | "OPTIONAL_SEARCH"
  | "REQUIRED_SEARCH"
  | "UNCERTAIN_SEARCH"
  | "FORCED_SEARCH";

export interface SearchDecisionResult {
  decision: SearchDecision;
  reason: string;
  confidenceScore: number;
  detectedTriggers: string[];
  generatedQuery: string;
}

const EXPLICIT_SEARCH_PATTERNS = [
  /ابحث\s/i,
  /دور\s/i,
  /شيك\s/i,
  /search\s+/i,
  /\bsearch\s+the\s+web\b/i,
  /\blook\s+up\b/i,
  /\bfind\s+online\b/i,
  /\bgoogle\b/i,
  /\bwhat\s+does\s+the\s+internet\b/i,
  /\bare\s+you\s+sure\b/i,
  /\bcheck\s+the\s+latest\b/i,
  /\bgive\s+me\s+sources\b/i,
  /\bprovide\s+citations\b/i,
  /\bwith\s+sources\b/i,
];

const FRESHNESS_KEYWORDS = [
  "latest", "current", "today", "now", "recent", "news",
  "weather", "forecast", "price", "pricing", "stock", "crypto",
  "bitcoin", "election", "score", "schedule", "release",
  "version", "update", "changelog", "roadmap", "announcement",
  "breaking", "live", "trending", "new release",
  "آخر", "اليوم", "الآن", "حاليًا", "جديد", "أخبار",
  "سعر", "متوفر", "إصدار", "تحديث", "موعد", "الطقس",
  "سهم", "كريبتو", "نتائج", "قانون", "نظام", "لائحة",
  "توثيق", "مستجد", "أحداث",
];

const UNCERTAINTY_PHRASES = [
  "i don't know", "i'm not sure", "i cannot verify",
  "i don't have current", "i don't have access",
  "i can't verify", "my knowledge cutoff",
  "as of my last", "i was trained on",
  "لا أعلم", "لست متأكد", "لا أستطيع التحقق",
  "لا أملك معلومات حديثة", "لا أملك وصول",
];

const QUESTION_WORDS = [
  /^(who|what|when|where|why|how|which|whose|whom)\s/i,
  /^(من|ماذا|متى|أين|لماذا|كيف|كم|هل|ما)\s/i,
];

const NO_SEARCH_PATTERNS = [
  /^(translate|ترجم)\s/i,
  /^(write|write a|write an|write the|compose|compose a|draft|draft a)\s/i,
  /^(summarize|لخص)\s/i,
  /^tell me a story/i,
  /^create (a |an )?(poem|story|song|joke)/i,
  /^what ('s| is) (your|the) (name|purpose|goal)/i,
  /^(hi|hello|hey|مرحبا|اهلا)\s*$/i,
  /^how are you/i,
  /^(explain|describe|define|what is|ما هو|ما هي|عرّف|معنى|عرفني)\s+(.{0,200})$/i,
];

const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\b[A-Za-z0-9]{32,}\b/,
  /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*\S+\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
];

export class SearchDecisionService {
  async decide(query: string, memoryConfidence?: number): Promise<SearchDecisionResult> {
    const result = await this.classifyWithLLM(query);
    const gated = this.applyMemoryGate(result, memoryConfidence);
    console.log("[SEARCH_DECISION] query:", query.slice(0, 80), "| decision:", gated.decision, "| reason:", gated.reason, "| triggers:", gated.detectedTriggers, "| confidence:", gated.confidenceScore, "| memoryConfidence:", memoryConfidence);
    return gated;
  }

  shouldSearch(decision: SearchDecision): boolean {
    return decision === "REQUIRED_SEARCH" || decision === "OPTIONAL_SEARCH" || decision === "UNCERTAIN_SEARCH" || decision === "FORCED_SEARCH";
  }

  redactSensitiveData(text: string): string {
    let redacted = text;
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, "[REDACTED]");
    }
    return redacted;
  }

  generateSearchQuery(userMessage: string): string {
    const clean = this.redactSensitiveData(userMessage);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();

    const lower = clean.toLowerCase();

    const isWeatherQuery = /\b(weather|temperature|طقس|حرارة|درجة\s*الحرارة|الطقس)\b/i.test(clean) &&
      /\b(today|now|current|اليوم|الآن|حاليا)\b/i.test(clean);

    if (isWeatherQuery) {
      const location = this.extractLocation(clean);
      if (/[\u0600-\u06FF]/.test(clean)) {
        return `درجة الحرارة الحالية في ${location || "المدينة"} ${todayStr} الطقس الآن`.slice(0, 200);
      }
      return `${location || ""} current temperature weather ${todayStr}`.trim().slice(0, 200);
    }

    const isSportsQuery = /\b(match|result|score|game|مباراة|نتيجة|فوز|خسارة|تعادل)\b/i.test(clean) &&
      /\b(result|score|النتيجة)\b/i.test(clean);

    if (isSportsQuery) {
      if (/[\u0600-\u06FF]/.test(clean)) {
        return `${clean} رسمي FIFA ${currentYear}`.slice(0, 200);
      }
      return `${clean} official FIFA result ${currentYear}`.slice(0, 200);
    }

    const isFreshnessQuery = FRESHNESS_KEYWORDS.some((kw) => lower.includes(kw));
    if (isFreshnessQuery && !/[\u0600-\u06FF]/.test(clean)) {
      return `${clean} ${todayStr}`.slice(0, 200);
    }

    return clean.length > 200 ? clean.slice(0, 200) : clean;
  }

  private extractLocation(text: string): string {
    const arabicLocation = text.match(/(?:في|فى)\s+([\u0600-\u06FF\s]{2,30}?)(?:\s*[؟?]|\s*$|\s+[فيو])/i);
    if (arabicLocation) return arabicLocation[1].trim();
    const englishLocation = text.match(/(?:in|at|for)\s+([a-zA-Z\s]{2,30}?)(?:\s*[?.!]|\s*$|\s+(?:today|now|weather))/i);
    if (englishLocation) return englishLocation[1].trim();
    return "";
  }

  private async classifyWithLLM(query: string): Promise<SearchDecisionResult> {
    const detectedTriggers: string[] = [];
    const lower = query.toLowerCase();

    if (!query?.trim()) {
      return {
        decision: "NO_SEARCH",
        reason: "Empty query",
        confidenceScore: 1,
        detectedTriggers: [],
        generatedQuery: "",
      };
    }

    const isExplicit = EXPLICIT_SEARCH_PATTERNS.some((p) => p.test(query));
    if (isExplicit) {
      detectedTriggers.push("explicit_search_request");
      return {
        decision: "FORCED_SEARCH",
        reason: "User explicitly requested web search",
        confidenceScore: 0.95,
        detectedTriggers,
        generatedQuery: this.generateSearchQuery(query),
      };
    }

    const hasFreshness = FRESHNESS_KEYWORDS.some((kw) => lower.includes(kw));
    if (hasFreshness) {
      detectedTriggers.push("freshness_keyword");
    }

    const hasQuestionWord = QUESTION_WORDS.some((p) => p.test(query));
    if (hasQuestionWord) {
      detectedTriggers.push("question_word");
    }

    const hasUncertainty = UNCERTAINTY_PHRASES.some((p) => lower.includes(p));
    if (hasUncertainty) {
      detectedTriggers.push("uncertainty_phrase");
    }

    const noSearchMatch = NO_SEARCH_PATTERNS.some((p) => p.test(query));
    if (noSearchMatch) {
      return {
        decision: "NO_SEARCH",
        reason: "Query is stable knowledge or creative task that does not need web search",
        confidenceScore: 0.8,
        detectedTriggers: [],
        generatedQuery: "",
      };
    }

    if (hasFreshness && hasQuestionWord) {
      return {
        decision: "REQUIRED_SEARCH",
        reason: "Query asks about current information using freshness keywords",
        confidenceScore: 0.9,
        detectedTriggers,
        generatedQuery: this.generateSearchQuery(query),
      };
    }

    if (hasFreshness) {
      return {
        decision: "REQUIRED_SEARCH",
        reason: "Query contains freshness keywords indicating current information is needed",
        confidenceScore: 0.85,
        detectedTriggers,
        generatedQuery: this.generateSearchQuery(query),
      };
    }

    if (hasUncertainty) {
      return {
        decision: "REQUIRED_SEARCH",
        reason: "Query expresses uncertainty about information",
        confidenceScore: 0.8,
        detectedTriggers,
        generatedQuery: this.generateSearchQuery(query),
      };
    }

    if (hasQuestionWord) {
      if (this.isStableKnowledgeQuestion(query)) {
        return {
          decision: "NO_SEARCH",
          reason: "Question about stable general knowledge",
          confidenceScore: 0.7,
          detectedTriggers: [],
          generatedQuery: "",
        };
      }

      try {
        const llmDecision = await this.classifyWithAI(query, detectedTriggers);
        return llmDecision;
      } catch {
        return {
          decision: "OPTIONAL_SEARCH",
          reason: "Question word detected, AI classifier unavailable, defaulting to optional search",
          confidenceScore: 0.6,
          detectedTriggers,
          generatedQuery: this.generateSearchQuery(query),
        };
      }
    }

    return {
      decision: "NO_SEARCH",
      reason: "No search triggers detected",
      confidenceScore: 0.95,
      detectedTriggers: [],
      generatedQuery: "",
    };
  }

  private isStableKnowledgeQuestion(query: string): boolean {
    const stablePatterns = [
      /^(what|who)\s+(is|are|was|were)\s+(the\s+)?(meaning|definition|difference|purpose|goal|function)\b/i,
      /^(what|who)\s+(is|are)\s+(the\s+)?(capital|largest|smallest|tallest)\b/i,
      /^(what|when)\s+(did|does|do)\s/i,
      /^(what|how)\s+(many|much|old|long|far|often)\s/i,
      /^(what)\s+is\s+(your|the)\s+(name|purpose|goal|mission|creator)\b/i,
      /^(ما)\s+(معنى|هو|هي|تعريف|مفهوم|مقصود)\s/i,
      /^(من)\s+(هو|هي)\s+(مؤسس|مخترع|مكتشف|رسام|كاتب)\s/i,
    ];
    return stablePatterns.some((p) => p.test(query));
  }

  private async classifyWithAI(query: string, triggers: string[]): Promise<SearchDecisionResult> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a search decision classifier. Determine if the user's message requires a web search.

Respond with exactly one of:
- FORCED_SEARCH: if the user explicitly asks you to search the web, look something up, or get information from the internet (e.g., "search", "google it", "look up", "find online", "ابحث").
- REQUIRED_SEARCH: if the query asks for current, recent, live, changing, version-specific, price, news, weather, sports, or source-sensitive information.
- OPTIONAL_SEARCH: if a web search could improve the answer but is not strictly required.
- NO_SEARCH: if the query is about stable general knowledge, creative writing, translation, summarization of provided text, coding help that does not need current docs, or basic greetings.
- UNCERTAIN_SEARCH: if unsure.

Output format (JSON only):
{"decision": "...", "reason": "..."}`,
      },
      {
        role: "user",
        content: query,
      },
    ];

    const provider = getProvider();
    const result = await provider.generateChatResponse(messages, {
      system: "You are a search decision classifier. Respond only with the JSON output format specified.",
    });

    const content = result.content.trim();
    let decision: SearchDecision = "NO_SEARCH";
    let reason = "AI classifier default";

    try {
      const parsed = JSON.parse(content);
      if (parsed.decision && ["FORCED_SEARCH", "REQUIRED_SEARCH", "OPTIONAL_SEARCH", "NO_SEARCH", "UNCERTAIN_SEARCH"].includes(parsed.decision)) {
        decision = parsed.decision;
      }
      if (parsed.reason) {
        reason = parsed.reason;
      }
    } catch {
      if (content.includes("FORCED_SEARCH")) {
        decision = "FORCED_SEARCH";
        reason = "AI classifier: forced search";
      } else if (content.includes("REQUIRED_SEARCH")) {
        decision = "REQUIRED_SEARCH";
        reason = "AI classifier: required search";
      } else if (content.includes("OPTIONAL_SEARCH")) {
        decision = "OPTIONAL_SEARCH";
        reason = "AI classifier: optional search";
      } else if (content.includes("UNCERTAIN_SEARCH")) {
        decision = "UNCERTAIN_SEARCH";
        reason = "AI classifier: uncertain";
      }
    }

    return {
      decision,
      reason,
      confidenceScore: decision === "FORCED_SEARCH" ? 0.95 : decision === "REQUIRED_SEARCH" ? 0.85 : decision === "NO_SEARCH" ? 0.7 : 0.6,
      detectedTriggers: triggers,
      generatedQuery: this.generateSearchQuery(query),
    };
  }

  private applyMemoryGate(result: SearchDecisionResult, memoryConfidence?: number): SearchDecisionResult {
    if (result.decision === "NO_SEARCH" || result.decision === "FORCED_SEARCH") {
      return result;
    }

    if (memoryConfidence !== undefined && memoryConfidence >= 0.8) {
      return {
        ...result,
        decision: "NO_SEARCH",
        reason: `Memory confidence (${memoryConfidence.toFixed(2)}) exceeds threshold (0.8), no search needed`,
        confidenceScore: memoryConfidence,
      };
    }

    return result;
  }
}
