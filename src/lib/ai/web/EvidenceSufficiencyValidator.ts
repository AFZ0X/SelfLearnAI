import type { QueryClassification } from "./QueryTypes";
import type { FreshnessGateResult } from "./FreshnessGate";

export interface SufficiencyResult {
  sufficient: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warnings: string[];
  controlledResponse: string | null;
  canProceedToLlm: boolean;
}

export class EvidenceSufficiencyValidator {
  validate(
    freshnessResult: FreshnessGateResult,
    classification: QueryClassification,
    query: string
  ): SufficiencyResult {
    const warnings: string[] = [];
    const { acceptedSources, rejectedSources, hasFreshSource, allRejected } = freshnessResult;

    const isFutureQuery = this.isFutureQuery(query);

    if (isFutureQuery) {
      return {
        sufficient: false,
        confidence: "LOW",
        warnings: ["Query refers to a future event"],
        controlledResponse: "بحثت ولم أجد نتيجة موثوقة؛ الحدث لم يحدث بعد حسب المصادر المتاحة.",
        canProceedToLlm: false,
      };
    }

    if (allRejected) {
      const rejectionReasons = [...new Set(rejectedSources.map((r) => r.rejectionReason))];
      warnings.push(`All ${rejectedSources.length} source(s) rejected: ${rejectionReasons.join("; ")}`);

      let response: string;
      if (classification.type === "WEATHER") {
        response = "بحثت في الويب، لكن لم أجد قراءة حالية موثوقة لدرجة الحرارة.";
      } else if (classification.type === "NEWS") {
        response = "بحثت في الويب، لكن لم أجد أخبارًا حديثة وموثوقة لهذا اليوم.";
      } else if (classification.type === "SPORTS_RESULT") {
        response = "بحثت ولم أجد نتيجة موثوقة؛ لا توجد مباراة مؤكدة أو لم تُلعب بعد حسب المصادر.";
      } else if (classification.type === "VERSION") {
        response = "بحثت في الويب، لكن لم أجد مصدرًا رسميًا يؤكد آخر إصدار.";
      } else if (classification.type === "COMPANY_INFO") {
        response = "بحثت في الويب، لكن لم أجد مصدرًا رسميًا موثوقًا لهذه المعلومة.";
      } else {
        response = "بحثت في الويب، لكن لم أجد مصدرًا موثوقًا وحديثًا يؤكد هذه المعلومة.";
      }

      return {
        sufficient: false,
        confidence: "LOW",
        warnings,
        controlledResponse: response,
        canProceedToLlm: false,
      };
    }

    if (classification.isTimeSensitive && !hasFreshSource) {
      warnings.push(`No fresh source found for time-sensitive ${classification.type} query. Falling back to available sources.`);
    }

    if (classification.needsOfficialSource && classification.type !== "GENERAL") {
      const hasOfficial = acceptedSources.some((s) => {
        const domain = this.extractDomain(s.url);
        return this.isOfficialDomain(domain, classification);
      });

      if (!hasOfficial) {
        warnings.push(`No official source found for ${classification.type} query that prefers official sources.`);

        if (classification.type === "COMPANY_INFO") {
          return {
            sufficient: false,
            confidence: "LOW",
            warnings,
            controlledResponse: "بحثت ولم أجد تأكيدًا رسميًا من المصدر المعني بهذه المعلومة.",
            canProceedToLlm: false,
          };
        }
      }
    }

    if (rejectedSources.length > 0) {
      warnings.push(`${rejectedSources.length} source(s) rejected: ${[...new Set(rejectedSources.map((r) => r.rejectionReason))].join("; ")}`);
    }

    let confidence: "HIGH" | "MEDIUM" | "LOW";
    if (acceptedSources.length >= 2 && hasFreshSource) {
      confidence = "HIGH";
    } else if (acceptedSources.length >= 1) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }

    return {
      sufficient: acceptedSources.length > 0,
      confidence,
      warnings,
      controlledResponse: null,
      canProceedToLlm: acceptedSources.length > 0,
    };
  }

  private isFutureQuery(query: string): boolean {
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (!yearMatch) return false;
    const year = parseInt(yearMatch[1], 10);
    return year > new Date().getFullYear();
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  private isOfficialDomain(domain: string, classification: QueryClassification): boolean {
    const type = classification.type;
    const official: Record<string, string[]> = {
      VERSION: ["npmjs.com", "github.com", "nextjs.org", "vercel.com", "nodejs.org"],
      SPORTS_RESULT: ["fifa.com", "espn.com", "uefa.com"],
      COMPANY_INFO: ["aramco.com"],
      WEATHER: ["weather.com", "accuweather.com", "weather.gov"],
    };
    const domains = official[type];
    if (!domains) return true;
    return domains.some((d) => domain === d || domain.endsWith("." + d));
  }
}
