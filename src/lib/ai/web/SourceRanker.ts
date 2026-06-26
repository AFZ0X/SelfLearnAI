export type SourceReliability = "high" | "medium" | "low";

export interface SourceScore {
  reliability: SourceReliability;
  freshnessScore: number;
  domainScore: number;
  qualityScore: number;
  compositeScore: number;
  extractedDate: string | null;
  isStale: boolean;
  isDuplicate: boolean;
  reason: string;
}

const HIGH_TRUST_DOMAINS = [
  "wikipedia.org", "britannica.com", "reuters.com", "apnews.com",
  "bbc.com", "bbc.co.uk", "nytimes.com", "wsj.com", "bloomberg.com",
  "nature.com", "sciencedirect.com", "pubmed.ncbi.nlm.nih.gov",
  "who.int", "worldbank.org", "imf.org", "un.org",
  "fifa.com", "weather.com", "accuweather.com", "timeanddate.com",
  "npmjs.com", "github.com", "nodejs.org", "nextjs.org", "vercel.com",
  "google.com", "developer.mozilla.org", "stackoverflow.com",
  "gov", "edu",
];

const LOW_TRUST_DOMAINS = [
  "blogspot.com", "wordpress.com", "medium.com", "quora.com",
  "reddit.com", "tiktok.com", "instagram.com", "facebook.com",
  "twitter.com", "x.com", "example.com", "fandom.com",
  "wikia.com", "pinterest.com", "tumblr.com",
];

const DATE_PATTERNS = [
  /\b(20\d{2})[-\/]?(0[1-9]|1[0-2])[-\/]?(0[1-9]|[12]\d|3[01])\b/,
  /\b(0[1-9]|[12]\d|3[01])[-\/\.](0[1-9]|1[0-2])[-\/\.](20\d{2})\b/,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]?),?\s+(20\d{2})\b/i,
  /\b(0?[1-9]|[12]\d|3[01]?)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  /\b(20\d{2})\b/,
];

export class SourceRanker {
  rank(
    sources: Array<{ title: string; url: string; snippet: string }>,
    query: string
  ): Array<{ source: { title: string; url: string; snippet: string }; score: SourceScore }> {
    const ranked = sources.map((s) => ({
      source: s,
      score: this.scoreSource(s, query),
    }));

    ranked.sort((a, b) => b.score.compositeScore - a.score.compositeScore);

    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const deduplicated: typeof ranked = [];

    for (const item of ranked) {
      const url = item.source.url.toLowerCase().replace(/\/$/, "");
      const title = item.source.title.toLowerCase().trim();

      if (seenUrls.has(url)) {
        item.score.isDuplicate = true;
        continue;
      }

      let isDupTitle = false;
      for (const seen of seenTitles) {
        if (this.similarity(title, seen) > 0.85) {
          isDupTitle = true;
          break;
        }
      }
      if (isDupTitle) {
        item.score.isDuplicate = true;
        continue;
      }

      seenUrls.add(url);
      seenTitles.add(title);
      deduplicated.push(item);
    }

    return deduplicated;
  }

  filterLowQuality(
    ranked: Array<{ source: { title: string; url: string; snippet: string }; score: SourceScore }>
  ): Array<{ source: { title: string; url: string; snippet: string }; score: SourceScore }> {
    return ranked.filter((item) => {
      if (item.score.isDuplicate) return false;
      if (item.score.isStale && item.score.reliability === "low") return false;
      if (item.score.compositeScore < 0.2) return false;
      return true;
    });
  }

  private scoreSource(
    source: { title: string; url: string; snippet: string },
    query: string
  ): SourceScore {
    const domain = this.extractDomain(source.url);
    const domainScore = this.scoreDomain(domain);
    const extractedDate = this.extractDate(source.snippet + " " + source.title);
    const freshnessScore = this.scoreFreshness(extractedDate);
    const qualityScore = this.scoreContentQuality(source.snippet, source.title);
    const queryRelevance = this.scoreQueryRelevance(source, query);
    const compositeScore = domainScore * 0.3 + freshnessScore * 0.25 + qualityScore * 0.2 + queryRelevance * 0.25;
    const isStale = freshnessScore < 0.3;

    let reliability: SourceReliability;
    if (compositeScore >= 0.7 && domainScore >= 0.7) {
      reliability = "high";
    } else if (compositeScore >= 0.4) {
      reliability = "medium";
    } else {
      reliability = "low";
    }

    let reason = "";
    if (isStale) reason = "Source date is stale or absent";
    else if (reliability === "high") reason = "High-quality, current source";
    else if (reliability === "medium") reason = "Moderate quality source";
    else reason = "Low quality source";

    return {
      reliability,
      freshnessScore,
      domainScore,
      qualityScore,
      compositeScore,
      extractedDate,
      isStale,
      isDuplicate: false,
      reason,
    };
  }

  private extractDomain(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        return parts.slice(-2).join(".");
      }
      return hostname;
    } catch {
      return url;
    }
  }

  private scoreDomain(domain: string): number {
    for (const trusted of HIGH_TRUST_DOMAINS) {
      if (domain.endsWith(trusted) || domain === trusted) {
        return 1.0;
      }
    }
    if (domain.endsWith(".gov") || domain.endsWith(".edu")) return 0.95;

    for (const untrusted of LOW_TRUST_DOMAINS) {
      if (domain.endsWith(untrusted) || domain === untrusted) {
        return 0.1;
      }
    }

    return 0.5;
  }

  private extractDate(text: string): string | null {
    const now = new Date();
    let bestDate: string | null = null;
    let bestYearDiff = Infinity;

    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        let year: number | null = null;
        let month: number | null = null;
        let day: number | null = null;

        if (pattern === DATE_PATTERNS[4]) {
          year = parseInt(match[1], 10);
        } else if (pattern === DATE_PATTERNS[0]) {
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          day = parseInt(match[3], 10);
        } else if (pattern === DATE_PATTERNS[1]) {
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        } else if (pattern === DATE_PATTERNS[2]) {
          const monthStr = match[1];
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
          month = this.monthNameToNumber(monthStr);
        } else if (pattern === DATE_PATTERNS[3]) {
          day = parseInt(match[1], 10);
          const monthStr = match[2];
          year = parseInt(match[3], 10);
          month = this.monthNameToNumber(monthStr);
        }

        if (year && year >= 2000 && year <= now.getFullYear() + 1) {
          const yearDiff = Math.abs(year - now.getFullYear());
          if (yearDiff < bestYearDiff) {
            bestYearDiff = yearDiff;
            const monthStr = month !== null ? String(month).padStart(2, "0") : "01";
            const dayStr = day !== null ? String(day).padStart(2, "0") : "01";
            bestDate = `${year}-${monthStr}-${dayStr}`;
          }
        }
      }
    }

    return bestDate;
  }

  private monthNameToNumber(name: string): number {
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    };
    return months[name.toLowerCase()] || 1;
  }

  private scoreFreshness(extractedDate: string | null): number {
    if (!extractedDate) return 0.3;

    const now = new Date();
    const sourceDate = new Date(extractedDate);
    const diffDays = Math.abs((now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 1.0;
    if (diffDays <= 7) return 0.9;
    if (diffDays <= 30) return 0.8;
    if (diffDays <= 90) return 0.6;
    if (diffDays <= 365) return 0.4;
    return 0.1;
  }

  private scoreContentQuality(snippet: string, title: string): number {
    const text = (snippet + " " + title).trim();
    const words = text.split(/\s+/).length;

    if (words < 5) return 0.1;
    if (words < 20) return 0.3;
    if (words < 50) return 0.5;
    if (words < 100) return 0.7;

    const hasNumbers = /\d/.test(text);
    const hasSentences = /[.!?]/.test(text);
    const quality = (hasNumbers ? 0.15 : 0) + (hasSentences ? 0.15 : 0);

    return Math.min(1.0, 0.7 + quality);
  }

  private scoreQueryRelevance(
    source: { title: string; url: string; snippet: string },
    query: string
  ): number {
    const queryLower = query.toLowerCase();
    const text = (source.title + " " + source.snippet + " " + source.url).toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    if (queryWords.length === 0) return 0.5;

    let matchCount = 0;
    for (const word of queryWords) {
      if (text.includes(word)) matchCount++;
    }

    return matchCount / queryWords.length;
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length < 5 || b.length < 5) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.includes(shorter)) return 0.9;

    const maxDist = Math.floor(shorter.length * 0.3);
    let distance = 0;
    for (let i = 0; i < Math.min(shorter.length, longer.length); i++) {
      if (shorter[i] !== longer[i]) distance++;
    }

    if (distance <= maxDist) {
      return 1.0 - distance / longer.length;
    }

    return 0;
  }
}
