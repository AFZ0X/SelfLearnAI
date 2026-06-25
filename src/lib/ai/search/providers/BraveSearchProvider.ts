import type { SearchProvider, SearchResult } from "../SearchProvider";

export class BraveSearchProvider implements SearchProvider {
  private apiKey: string;

  constructor() {
    const key = process.env.BRAVE_API_KEY;
    if (!key) {
      throw new Error(
        "BRAVE_API_KEY is not configured. Set the environment variable or switch to SEARCH_PROVIDER=mock."
      );
    }
    this.apiKey = key;
  }

  async search(query: string, count = 3): Promise<SearchResult[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(count, 10)));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`Brave Search API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const webResults = data.web?.results;
    if (!Array.isArray(webResults)) {
      return [];
    }

    return webResults.slice(0, count).map((r: Record<string, unknown>) => ({
      title: typeof r.title === "string" ? r.title : "Untitled",
      url: typeof r.url === "string" ? r.url : "",
      snippet: typeof r.description === "string" ? r.description : "",
    }));
  }
}
