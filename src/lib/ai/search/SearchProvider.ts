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
  usingMock: boolean;
  productionSafe: boolean;
  providerName: string;
}

const PROVIDER_NOT_CONFIGURED_MSG =
  'Web search provider is not configured. Set SEARCH_PROVIDER environment variable to "tavily" or "brave" and provide the corresponding API key.';
const MOCK_IN_PRODUCTION_MSG =
  'Mock search provider cannot be used in production. Set SEARCH_PROVIDER to "tavily" or "brave" with a valid API key.';

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSearchProvider(): SearchProvider {
  const providerName = process.env.SEARCH_PROVIDER;
  if (!providerName) {
    throw new Error(PROVIDER_NOT_CONFIGURED_MSG);
  }

  switch (providerName) {
    case "tavily":
      return new TavilySearchProvider();
    case "brave":
      return new BraveSearchProvider();
    case "mock": {
      if (isProduction()) {
        throw new Error(MOCK_IN_PRODUCTION_MSG);
      }
      return new MockSearchProvider();
    }
    default:
      throw new Error(
        `Unknown search provider: "${providerName}". Set SEARCH_PROVIDER to "tavily", "brave", or "mock" (development only).`
      );
  }
}

export function getProviderStatus(): ProviderStatus {
  const providerName = process.env.SEARCH_PROVIDER;

  if (!providerName) {
    return {
      name: "Not configured",
      configured: false,
      error: PROVIDER_NOT_CONFIGURED_MSG,
      usingMock: false,
      productionSafe: false,
      providerName: "",
    };
  }

  switch (providerName) {
    case "tavily": {
      const hasKey = !!process.env.TAVILY_API_KEY;
      return {
        name: "Tavily",
        configured: hasKey,
        error: hasKey ? undefined : "TAVILY_API_KEY is not set",
        usingMock: false,
        productionSafe: hasKey,
        providerName: "tavily",
      };
    }
    case "brave": {
      const hasKey = !!process.env.BRAVE_API_KEY;
      return {
        name: "Brave Search",
        configured: hasKey,
        error: hasKey ? undefined : "BRAVE_API_KEY is not set",
        usingMock: false,
        productionSafe: hasKey,
        providerName: "brave",
      };
    }
    case "mock": {
      const production = isProduction();
      return {
        name: production ? "Mock (not allowed in production)" : "Mock (development only)",
        configured: !production,
        error: production ? MOCK_IN_PRODUCTION_MSG : undefined,
        usingMock: true,
        productionSafe: !production,
        providerName: "mock",
      };
    }
    default:
      return {
        name: providerName,
        configured: false,
        error: `Unknown provider: ${providerName}`,
        usingMock: false,
        productionSafe: false,
        providerName: providerName,
      };
  }
}

export function isSearchConfigured(): boolean {
  const providerName = process.env.SEARCH_PROVIDER;
  if (!providerName) return false;
  if (providerName === "mock") return !isProduction();
  if (providerName === "tavily") return !!process.env.TAVILY_API_KEY;
  if (providerName === "brave") return !!process.env.BRAVE_API_KEY;
  return false;
}

export function isUsingMockProvider(): boolean {
  return process.env.SEARCH_PROVIDER === "mock";
}
