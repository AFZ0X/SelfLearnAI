import { BraveSearchProvider } from "./providers/BraveSearchProvider";
import { MockSearchProvider } from "./providers/MockSearchProvider";
import { TavilySearchProvider } from "./providers/TavilySearchProvider";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: string, count?: number): Promise<SearchResult[]>;
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  error?: string;
}

export function getSearchProvider(): SearchProvider {
  const providerName = process.env.SEARCH_PROVIDER || "mock";

  switch (providerName) {
    case "tavily":
      return new TavilySearchProvider();
    case "brave":
      return new BraveSearchProvider();
    case "mock":
      return new MockSearchProvider();
    default:
      throw new Error(
        `Unknown search provider: ${providerName}. Set SEARCH_PROVIDER to "tavily", "brave", or "mock".`
      );
  }
}

export function getProviderStatus(): ProviderStatus {
  const providerName = process.env.SEARCH_PROVIDER || "mock";

  switch (providerName) {
    case "tavily":
      return {
        name: "Tavily",
        configured: !!process.env.TAVILY_API_KEY,
        error: !process.env.TAVILY_API_KEY ? "TAVILY_API_KEY is not set" : undefined,
      };
    case "brave":
      return {
        name: "Brave Search",
        configured: !!process.env.BRAVE_API_KEY,
        error: !process.env.BRAVE_API_KEY ? "BRAVE_API_KEY is not set" : undefined,
      };
    case "mock":
      return {
        name: "Mock (development)",
        configured: true,
      };
    default:
      return {
        name: providerName,
        configured: false,
        error: `Unknown provider: ${providerName}`,
      };
  }
}

export function isSearchConfigured(): boolean {
  const providerName = process.env.SEARCH_PROVIDER || "mock";
  if (providerName === "mock") return true;
  if (providerName === "tavily") return !!process.env.TAVILY_API_KEY;
  if (providerName === "brave") return !!process.env.BRAVE_API_KEY;
  return false;
}
