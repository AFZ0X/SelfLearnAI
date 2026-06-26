import { getSearchProvider, isSearchConfigured, type SearchResult } from "@/lib/ai/search/SearchProvider";
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
}

export interface WebSearchOutcome {
  results: WebSearchResult[];
  webSearchUsed: boolean;
  decisionResult?: SearchDecisionResult;
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
      return { results: [], webSearchUsed: false };
    }

    const decisionResult = await this.decisionService.decide(query, memoryConfidence);

    if (!this.decisionService.shouldSearch(decisionResult.decision)) {
      return { results: [], webSearchUsed: false, decisionResult };
    }

    if (!isSearchConfigured()) {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search provider not configured. Set SEARCH_PROVIDER and corresponding API key.",
        },
      };
    }

    const redactedQuery = this.decisionService.generateSearchQuery(query);
    let provider;
    try {
      provider = getSearchProvider();
    } catch {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search provider initialization failed. Check SEARCH_PROVIDER env var.",
        },
      };
    }

    let searchResults: SearchResult[];
    try {
      searchResults = await provider.search(redactedQuery, this.config.maxResults);
    } catch {
      return {
        results: [],
        webSearchUsed: false,
        decisionResult: {
          ...decisionResult,
          decision: "NO_SEARCH",
          reason: "Search provider API call failed. Check API key and network connectivity.",
        },
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
      };
    }

    const now = new Date().toISOString();
    const results: WebSearchResult[] = searchResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      fetchedAt: now,
    }));

    return { results, webSearchUsed: results.length > 0, decisionResult };
  }
}
