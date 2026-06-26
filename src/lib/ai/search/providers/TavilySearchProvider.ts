import type { SearchProvider, SearchResult } from "../SearchProvider";

export class TavilySearchProvider implements SearchProvider {
  private apiKey: string;

  constructor() {
    const key = process.env.TAVILY_API_KEY;
    if (!key) {
      throw new Error(
        "TAVILY_API_KEY is not configured. Set the environment variable or switch to SEARCH_PROVIDER=mock."
      );
    }
    this.apiKey = key;
  }

  async search(query: string, count = 5): Promise<SearchResult[]> {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: "advanced",
        include_answer: false,
        max_results: Math.min(count, 10),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`Tavily Search API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const results = data.results;
    if (!Array.isArray(results)) {
      return [];
    }

    return results.slice(0, count).map((r: Record<string, unknown>) => ({
      title: typeof r.title === "string" ? r.title : "Untitled",
      url: typeof r.url === "string" ? r.url : "",
      snippet: typeof r.content === "string" ? r.content : typeof r.snippet === "string" ? r.snippet : "",
    }));
  }
}
