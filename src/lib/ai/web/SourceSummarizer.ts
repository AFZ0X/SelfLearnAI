const MAX_SNIPPET_CHARS = 600;

export interface SourceSummary {
  snippet: string;
  confidence: number;
}

export class SourceSummarizer {
  summarize(text: string): SourceSummary {
    const cleaned = text.replace(/\s+/g, " ").trim();
    const snippet = cleaned.length > MAX_SNIPPET_CHARS
      ? cleaned.slice(0, MAX_SNIPPET_CHARS) + "..."
      : cleaned;

    const confidence = this.estimateConfidence(cleaned);

    return { snippet, confidence };
  }

  private estimateConfidence(text: string): number {
    const words = text.split(/\s+/).length;
    if (words < 10) return 0.3;
    if (words < 30) return 0.5;
    if (words < 100) return 0.7;
    return 0.9;
  }
}
