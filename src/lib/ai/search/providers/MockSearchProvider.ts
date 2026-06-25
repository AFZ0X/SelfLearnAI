import type { SearchProvider, SearchResult } from "../SearchProvider";

export class MockSearchProvider implements SearchProvider {
  async search(query: string, count = 3): Promise<SearchResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const results: SearchResult[] = [
      {
        title: `Mock Result: "${query}" — Overview`,
        url: "https://example.com/overview",
        snippet: `This is a mock search result for "${query}". In development mode, mock results are returned instead of real web search results. Set SEARCH_PROVIDER=brave and BRAVE_API_KEY to enable real web search.`,
      },
      {
        title: `Mock Result: "${query}" — Details`,
        url: "https://example.com/details",
        snippet: `Additional mock information about "${query}". These results are clearly labeled as mock/development-only and should not be treated as real web content.`,
      },
    ];

    return results.slice(0, count);
  }
}
