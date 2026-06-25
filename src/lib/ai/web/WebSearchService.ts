import { getSearchProvider, type SearchResult } from "@/lib/ai/search/SearchProvider";

export interface WebSearchConfig {
  maxResults: number;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  maxResults: 3,
};

const WEB_SEARCH_KEYWORDS = [
  "latest",
  "current",
  "today",
  "now",
  "news",
  "weather",
  "price",
  "price of",
  "stock",
  "forecast",
  "update",
  "recent",
  "breaking",
  "election",
  "score",
  "schedule",
  "release",
  "version",
  "announce",
];

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  fetchedAt: string;
}

export interface WebSearchOutcome {
  results: WebSearchResult[];
  webSearchUsed: boolean;
}

export class WebSearchService {
  private config: WebSearchConfig;

  constructor(config?: Partial<WebSearchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  shouldSearchWeb(query: string): boolean {
    if (!query?.trim()) return false;

    const lower = query.toLowerCase();

    if (WEB_SEARCH_KEYWORDS.some((kw) => lower.includes(kw))) {
      return true;
    }

    if (/^(who|what|when|where|why|how)\s/i.test(lower)) {
      return true;
    }

    return false;
  }

  async search(query: string): Promise<WebSearchOutcome> {
    if (!query?.trim()) {
      return { results: [], webSearchUsed: false };
    }

    if (!this.shouldSearchWeb(query)) {
      return { results: [], webSearchUsed: false };
    }

    let provider;
    try {
      provider = getSearchProvider();
    } catch {
      return { results: [], webSearchUsed: false };
    }

    let searchResults: SearchResult[];
    try {
      searchResults = await provider.search(query, this.config.maxResults);
    } catch {
      return { results: [], webSearchUsed: false };
    }

    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return { results: [], webSearchUsed: false };
    }

    const now = new Date().toISOString();
    const results: WebSearchResult[] = searchResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      fetchedAt: now,
    }));

    return { results, webSearchUsed: results.length > 0 };
  }
}
