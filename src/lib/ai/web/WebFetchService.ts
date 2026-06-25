import { SourceExtractor } from "./SourceExtractor";

const MAX_PAGE_SIZE = 100_000;
const FETCH_TIMEOUT_MS = 8_000;

const BLOCKED_SCHEMES = ["file:", "ftp:", "data:", "javascript:", "chrome:", "devtools:", "about:", "blob:"];

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  fetchedAt: string;
}

export class WebFetchService {
  async fetchPage(url: string): Promise<FetchedPage> {
    const parsed = this.validateUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(parsed.href, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "SelfLearnAI/1.0 (educational research agent)",
          Accept: "text/html, text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const raw = await response.text();
      if (raw.length > MAX_PAGE_SIZE) {
        throw new Error(`Page content exceeds ${MAX_PAGE_SIZE} byte limit`);
      }

      const extractor = new SourceExtractor();
      const extracted = extractor.extract(raw, url);

      return {
        url: parsed.href,
        title: extracted.title,
        text: extracted.text,
        fetchedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private validateUrl(url: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Malformed URL: ${url}`);
    }

    const scheme = parsed.protocol.replace(":", "").toLowerCase();
    if (BLOCKED_SCHEMES.includes(scheme)) {
      throw new Error(`Blocked URL scheme: ${parsed.protocol}`);
    }

    if (scheme !== "http" && scheme !== "https") {
      throw new Error(`Unsupported URL scheme: ${parsed.protocol}`);
    }

    return parsed;
  }
}
