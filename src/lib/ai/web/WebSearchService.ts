import { getSearchProvider, isSearchConfigured, isUsingMockProvider, type SearchResult } from "@/lib/ai/search/SearchProvider";
import { SearchDecisionService, type SearchDecisionResult } from "./SearchDecisionService";
import { SourceRanker } from "./SourceRanker";

export interface WebSearchConfig {
  maxResults: number;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  maxResults: 5,
};

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
}

export class WebSearchService {
  private config: WebSearchConfig;
  private decisionService: SearchDecisionService;

  constructor(config?: Partial<WebSearchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.decisionService = new SearchDecisionService();
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
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search provider not configured. Set SEARCH_PROVIDER to \"tavily\" or \"brave\" with a valid API key.",
        },
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
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Web search is set to mock provider. Configure a real provider (SEARCH_PROVIDER=tavily) for real results.",
        },
        usingMock: true,
        searchFailed: true,
        originalDecision,
      };
    }

    const redactedQuery = this.decisionService.generateSearchQuery(query);
    console.log("[WEB_SEARCH] redactedQuery:", redactedQuery.slice(0, 100));
    let provider;
    try {
      provider = getSearchProvider();
      console.log("[WEB_SEARCH] provider obtained:", provider.constructor?.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider initialization failed.";
      console.log("[WEB_SEARCH] provider init failed:", msg);
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: msg,
        },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    let searchResults: SearchResult[];
    try {
      console.log("[WEB_SEARCH] calling provider.search with config.maxResults:", this.config.maxResults);
      searchResults = await provider.search(redactedQuery, this.config.maxResults);
      console.log("[WEB_SEARCH] search returned", searchResults?.length ?? 0, "results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider API call failed.";
      console.log("[WEB_SEARCH] search failed:", msg);
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: msg,
        },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      console.log("[WEB_SEARCH] search returned no results or empty array");
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search returned no results",
        },
        usingMock: false,
        searchFailed: true,
        originalDecision,
      };
    }

    const now = new Date().toISOString();

    const ranker = new SourceRanker();
    const ranked = ranker.rank(
      searchResults.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
      redactedQuery
    );
    const qualityFiltered = ranker.filterLowQuality(ranked);

    console.log("[WEB_SEARCH] ranked:", ranked.length, "| after quality filter:", qualityFiltered.length, "| total from tavily:", searchResults.length);

    const results: WebSearchResult[] = qualityFiltered.map((r) => ({
      title: r.source.title,
      url: r.source.url,
      snippet: r.source.snippet,
      fetchedAt: now,
      isMock,
      sourceReliability: r.score.reliability,
      sourceDate: r.score.extractedDate || undefined,
      isStale: r.score.isStale,
      domainCredibility: r.score.domainScore,
    }));

    console.log("[WEB_SEARCH] success: returning", results.length, "ranked results, webSearchUsed: true, originalDecision:", originalDecision);
    return {
      results,
      webSearchUsed: results.length > 0,
      decisionResult,
      usingMock: isMock,
      originalDecision,
    };
  }
}
