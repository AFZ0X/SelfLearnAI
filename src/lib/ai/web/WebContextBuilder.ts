import type { WebSearchResult } from "./WebSearchService";
import type { FetchedPage } from "./WebFetchService";
import type { SourceSummary } from "./SourceSummarizer";

export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

export interface WebContextResult {
  webContext: string;
  citations: Citation[];
}

const MAX_WEB_CONTEXT_CHARS = 4000;

export class WebContextBuilder {
  buildContext(
    searchResults: WebSearchResult[],
    fetchedPages: FetchedPage[],
    summaries: SourceSummary[]
  ): WebContextResult {
    if (searchResults.length === 0) {
      return { webContext: "", citations: [] };
    }

    const citations: Citation[] = [];
    const parts: string[] = [];
    let totalChars = 0;

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const page = fetchedPages[i];
      const summary = summaries[i];

      let sourceText = "";
      if (page && summary) {
        sourceText = summary.snippet;
      } else {
        sourceText = result.snippet;
      }

      const title = (page?.title || result.title).trim() || "Untitled";
      const block = `[source ${i + 1}]
Title: ${title}
URL: ${result.url}
Content: ${sourceText}`;

      const blockLen = block.length + 50;
      if (totalChars + blockLen > MAX_WEB_CONTEXT_CHARS) {
        break;
      }

      totalChars += blockLen;
      parts.push(block);
      citations.push({
        title,
        url: result.url,
        snippet: sourceText.slice(0, 200),
      });
    }

    const webContext = `<web_search_results>
The following information was retrieved from web search. These sources are external and may contain inaccuracies, opinions, or outdated information. Use them as reference only and cite the specific source when using information from them.

${parts.join("\n\n")}
</web_search_results>`;

    return { webContext, citations };
  }
}
