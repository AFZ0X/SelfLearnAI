import { getSearchProvider, isSearchConfigured, isUsingMockProvider, type SearchResult } from "@/lib/ai/search/SearchProvider";
import { SearchDecisionService, type SearchDecisionResult } from "./SearchDecisionService";
import { SourceRanker } from "./SourceRanker";
import { QueryRewriter } from "./QueryRewriter";
import { FreshnessGate, type FreshnessGateResult } from "./FreshnessGate";
import { EvidenceSufficiencyValidator, type SufficiencyResult } from "./EvidenceSufficiencyValidator";
import { classifyQuery, type QueryClassification } from "./QueryTypes";

export type SourceReliability = "high" | "medium" | "low";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  fetchedAt: string;
  isMock: boolean;
  sourceReliability?: SourceReliability;
  sourceDate?: string;
  isStale?: boolean;
  domainCredibility?: number;
}

export interface WebSearchOutcome {
  results: WebSearchResult[];
  webSearchUsed: boolean;
  decisionResult?: SearchDecisionResult;
  usingMock: boolean;
  searchFailed?: boolean;
  originalDecision?: SearchDecisionResult["decision"];
  classification?: QueryClassification;
  rewrittenQuery?: string;
  freshnessResult?: FreshnessGateResult;
  sufficiencyResult?: SufficiencyResult;
  rejectionSummary?: { total: number; reasons: string[] };
}

export class WebSearchService {
  private decisionService: SearchDecisionService;
  private queryRewriter: QueryRewriter;

  constructor() {
    this.decisionService = new SearchDecisionService();
    this.queryRewriter = new QueryRewriter();
  }

  async searchWithDecision(query: string, memoryConfidence?: number): Promise<WebSearchOutcome> {
    if (!query?.trim()) {
      return { results: [], webSearchUsed: false, usingMock: false };
    }

    const decisionResult = await this.decisionService.decide(query, memoryConfidence);
    console.log("[WEB_SEARCH] decisionResult.decision:", decisionResult.decision, "| shouldSearch:", this.decisionService.shouldSearch(decisionResult.decision), "| query:", query.slice(0, 80));

    if (!this.decisionService.shouldSearch(decisionResult.decision)) {
      return { results: [], webSearchUsed: false, decisionResult, usingMock: false };
    }

    const originalDecision = decisionResult.decision;

    const configured = isSearchConfigured();
    console.log("[WEB_SEARCH] isSearchConfigured:", configured, "| provider:", process.env.SEARCH_PROVIDER);
    if (!configured) {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: { ...decisionResult, decision: "NO_SEARCH", reason: "Search provider not configured." },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    const isMock = isUsingMockProvider();
    if (isMock) {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: { ...decisionResult, decision: "NO_SEARCH", reason: "Mock provider in use." },
        usingMock: true,
        searchFailed: true,
        originalDecision,
      };
    }

    const classification = classifyQuery(query);
    const rewrittenQuery = this.queryRewriter.rewrite(query, classification);
    console.log("[WEB_SEARCH] queryType:", classification.type, "| rewritten:", rewrittenQuery.slice(0, 100));

    const redactedQuery = this.decisionService.generateSearchQuery(rewrittenQuery);
    console.log("[WEB_SEARCH] redactedQuery:", redactedQuery.slice(0, 100));

    let provider;
    try {
      provider = getSearchProvider();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider initialization failed.";
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: { ...decisionResult, decision: "NO_SEARCH", reason: msg },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    let searchResults: SearchResult[];
    try {
      console.log("[WEB_SEARCH] calling provider.search");
      searchResults = await provider.search(redactedQuery, 10);
      console.log("[WEB_SEARCH] search returned", searchResults?.length ?? 0, "results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider API call failed.";
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: { ...decisionResult, decision: "NO_SEARCH", reason: msg },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      console.log("[WEB_SEARCH] search returned no results");
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: { ...decisionResult, decision: "NO_SEARCH", reason: "Search returned no results" },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    const ranker = new SourceRanker(classification);
    const ranked = ranker.rank(
      searchResults.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
      query
    );
    const qualityFiltered = ranker.filterLowQuality(ranked);
    console.log("[WEB_SEARCH] ranked:", ranked.length, "| after quality filter:", qualityFiltered.length);

    const now = new Date().toISOString();
    const rawSources = qualityFiltered.map((r) => ({
      title: r.source.title,
      url: r.source.url,
      snippet: r.source.snippet,
      sourceDate: r.score.extractedDate || undefined,
      isStale: r.score.isStale,
      domainCredibility: r.score.domainScore,
    }));

    const freshnessGate = new FreshnessGate();
    const freshnessResult = freshnessGate.filter(rawSources, classification, query);
    console.log("[WEB_SEARCH] freshnessGate: accepted:", freshnessResult.acceptedSources.length, "| rejected:", freshnessResult.rejectedSources.length, "| hasFresh:", freshnessResult.hasFreshSource);

    const validator = new EvidenceSufficiencyValidator();
    const sufficiencyResult = validator.validate(freshnessResult, classification, query);
    console.log("[WEB_SEARCH] sufficiency: sufficient:", sufficiencyResult.sufficient, "| confidence:", sufficiencyResult.confidence, "| controlledResponse:", sufficiencyResult.controlledResponse ? "YES" : "NO");

    const rejectionSummary = freshnessResult.rejectedSources.length > 0
      ? {
          total: freshnessResult.rejectedSources.length,
          reasons: [...new Set(freshnessResult.rejectedSources.map((r) => r.rejectionReason))],
        }
      : undefined;

    const results: WebSearchResult[] = freshnessResult.acceptedSources.map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      fetchedAt: now,
      isMock,
      sourceReliability: "medium" as SourceReliability,
      sourceDate: s.sourceDate,
      isStale: s.isStale,
    }));

    return {
      results,
      webSearchUsed: results.length > 0,
      decisionResult,
      usingMock: isMock,
      originalDecision,
      classification,
      rewrittenQuery,
      freshnessResult,
      sufficiencyResult,
      rejectionSummary,
    };
  }
}
