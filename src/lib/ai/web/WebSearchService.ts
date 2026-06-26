import { getSearchProvider, isSearchConfigured, isUsingMockProvider, type SearchResult } from "@/lib/ai/search/SearchProvider";
import { SearchDecisionService, type SearchDecisionResult } from "./SearchDecisionService";

export interface WebSearchConfig {
  maxResults: number;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  maxResults: 5,
};

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  fetchedAt: string;
  isMock: boolean;
}

export interface WebSearchOutcome {
  results: WebSearchResult[];
  webSearchUsed: boolean;
  decisionResult?: SearchDecisionResult;
  usingMock: boolean;
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

    if (!this.decisionService.shouldSearch(decisionResult.decision)) {
      return { results: [], webSearchUsed: false, decisionResult, usingMock: false };
    }

    if (!isSearchConfigured()) {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search provider not configured. Set SEARCH_PROVIDER to \"tavily\" or \"brave\" with a valid API key.",
        },
        usingMock: false,
      };
    }

    const isMock = isUsingMockProvider();

    const redactedQuery = this.decisionService.generateSearchQuery(query);
    let provider;
    try {
      provider = getSearchProvider();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider initialization failed.";
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: msg,
        },
        usingMock: isMock,
      };
    }

    let searchResults: SearchResult[];
    try {
      searchResults = await provider.search(redactedQuery, this.config.maxResults);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search provider API call failed.";
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: msg,
        },
        usingMock: isMock,
      };
    }

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search returned no results",
        },
        usingMock: isMock,
      };
    }

    const now = new Date().toISOString();
    const results: WebSearchResult[] = searchResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      fetchedAt: now,
      isMock,
    }));

    return {
      results,
      webSearchUsed: results.length > 0,
      decisionResult,
      usingMock: isMock,
    };
  }
}
