const MAX_EXTRACTED_TEXT = 5_000;

export interface ExtractedContent {
  title: string;
  text: string;
}

export class SourceExtractor {
  extract(html: string, url: string): ExtractedContent {
    let title = this.extractTitle(html);
    if (!title) {
      title = this.guessTitleFromUrl(url);
    }

    const text = this.extractText(html);

    return { title, text };
  }

  private extractTitle(html: string): string {
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    return match ? match[1].trim() : "";
  }

  private guessTitleFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/\/$/, "").split("/").pop() || parsed.hostname;
      return decodeURIComponent(path.replace(/[-_]/g, " ").replace(/\.[a-z0-9]+$/i, ""));
    } catch {
      return url;
    }
  }

  private extractText(html: string): string {
    let text = html;

    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
    text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ");
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&[a-z]+;/gi, " ");
    text = text.replace(/&#[0-9]+;/gi, " ");
    text = text.replace(/\s+/g, " ").trim();

    if (text.length > MAX_EXTRACTED_TEXT) {
      text = text.slice(0, MAX_EXTRACTED_TEXT) + "...";
    }

    return text;
  }
}
