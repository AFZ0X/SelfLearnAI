import { BraveSearchProvider } from "./providers/BraveSearchProvider";
import { MockSearchProvider } from "./providers/MockSearchProvider";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: string, count?: number): Promise<SearchResult[]>;
}

export function getSearchProvider(): SearchProvider {
  const providerName = process.env.SEARCH_PROVIDER || "mock";

  switch (providerName) {
    case "brave":
      return new BraveSearchProvider();
    case "mock":
      return new MockSearchProvider();
    default:
      throw new Error(
        `Unknown search provider: ${providerName}. Set SEARCH_PROVIDER to "brave" or "mock".`
      );
  }
}
