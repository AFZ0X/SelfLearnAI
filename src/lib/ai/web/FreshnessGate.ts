import type { QueryClassification } from "./QueryTypes";

export interface FreshnessGateResult {
  passed: boolean;
  acceptedSources: Array<{
    title: string;
    url: string;
    snippet: string;
    sourceDate?: string;
    isStale: boolean;
    rejectionReason?: string;
  }>;
  rejectedSources: Array<{
    title: string;
    url: string;
    snippet: string;
    sourceDate?: string;
    rejectionReason: string;
  }>;
  hasFreshSource: boolean;
  allRejected: boolean;
}

export class FreshnessGate {
  filter(
    sources: Array<{ title: string; url: string; snippet: string; sourceDate?: string; isStale?: boolean; domainCredibility?: number }>,
    classification: QueryClassification,
    query: string
  ): FreshnessGateResult {
    const now = new Date();
    const accepted: FreshnessGateResult["acceptedSources"] = [];
    const rejected: FreshnessGateResult["rejectedSources"] = [];

    const isTodayQuery = /\b(today|اليوم|now|الآن|current|حاليا|الحالي)\b/i.test(query);
    const isFutureEvent = this.isFutureEventQuery(query);

    for (const source of sources) {
      let rejectionReason = "";

      if (isFutureEvent) {
        if (!source.sourceDate || new Date(source.sourceDate) > now) {
          rejectionReason = "Future event — no result exists yet";
        }
      }

      if (!rejectionReason && classification.requiresExactDate && classification.maxSourceAgeDays <= 1) {
        if (source.sourceDate) {
          const diffDays = Math.abs((now.getTime() - new Date(source.sourceDate).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > classification.maxSourceAgeDays && isTodayQuery) {
            rejectionReason = `Source date (${source.sourceDate}) does not match today (${now.toISOString().split("T")[0]})`;
          }
        } else if (isTodayQuery) {
          rejectionReason = "No date found for time-sensitive query";
        }
      }

      if (!rejectionReason && classification.isTimeSensitive) {
        if (source.sourceDate) {
          const diffDays = Math.abs((now.getTime() - new Date(source.sourceDate).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > classification.maxSourceAgeDays) {
            rejectionReason = `Source is ${Math.round(diffDays)} days old, exceeds max ${classification.maxSourceAgeDays} days for ${classification.type}`;
          }
        }
      }

      if (!rejectionReason && source.isStale && classification.isTimeSensitive) {
        rejectionReason = "Source flagged as stale";
      }

      if (!rejectionReason && classification.type === "SPORTS_RESULT") {
        const text = (source.title + " " + source.snippet).toLowerCase();
        if (/\b(predicted?|expected?|forecast|projected?|likely|could|may)\b/i.test(text)) {
          rejectionReason = "Speculative sports content — not an actual result";
        }
      }

      if (!rejectionReason && classification.type === "WEATHER") {
        const text = (source.title + " " + source.snippet).toLowerCase();
        if (/\b(forecast|predicted?|expected)\b/i.test(text) && !/\b(current|now|today|الآن|اليوم)\b/i.test(text)) {
          rejectionReason = "Forecast only, not current conditions";
        }
      }

      if (!rejectionReason && classification.type === "COMPANY_INFO" && classification.needsOfficialSource) {
        const domain = this.extractDomain(source.url);
        if (!this.isOfficialDomain(domain, query)) {
          rejectionReason = "Not an official company source";
        }
      }

      if (rejectionReason) {
        rejected.push({
          title: source.title,
          url: source.url,
          snippet: source.snippet.slice(0, 200),
          sourceDate: source.sourceDate,
          rejectionReason,
        });
      } else {
        accepted.push({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          sourceDate: source.sourceDate,
          isStale: source.isStale || false,
        });
      }
    }

    const hasFreshSource = accepted.some((s) => {
      if (!s.sourceDate) return false;
      const diffDays = Math.abs((now.getTime() - new Date(s.sourceDate).getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= classification.maxSourceAgeDays;
    });

    return {
      passed: accepted.length > 0 && (!classification.isTimeSensitive || hasFreshSource),
      acceptedSources: accepted,
      rejectedSources: rejected,
      hasFreshSource,
      allRejected: accepted.length === 0,
    };
  }

  private isFutureEventQuery(query: string): boolean {
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (!yearMatch) return false;
    const year = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    return year > currentYear;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  private isOfficialDomain(domain: string, query: string): boolean {
    const lower = query.toLowerCase();
    if (lower.includes("aramco") || lower.includes("أرامكو")) {
      return domain === "aramco.com" || domain.endsWith(".aramco.com");
    }
    if (lower.includes("stc")) {
      return domain === "stc.com.sa" || domain.endsWith(".stc.com.sa");
    }
    return true;
  }
}
