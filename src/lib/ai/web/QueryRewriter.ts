import type { QueryClassification } from "./QueryTypes";

export class QueryRewriter {
  rewrite(rawQuery: string, classification: QueryClassification): string {
    const clean = rawQuery.trim();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();

    switch (classification.type) {
      case "WEATHER":
        return this.rewriteWeather(clean, todayStr);
      case "NEWS":
        return this.rewriteNews(clean, todayStr);
      case "VERSION":
        return this.rewriteVersion(clean);
      case "SPORTS_RESULT":
        return this.rewriteSports(clean, currentYear);
      case "COMPANY_INFO":
        return this.rewriteCompany(clean);
      default:
        return clean.length > 200 ? clean.slice(0, 200) : clean;
    }
  }

  private rewriteWeather(query: string, todayStr: string): string {
    const location = this.extractLocation(query);
    const hasArabic = /[\u0600-\u06FF]/.test(query);

    if (hasArabic) {
      return `درجة الحرارة الحالية في ${location || "المدينة"} ${todayStr} طقس الآن الطقس درجة حرارة`.slice(0, 200);
    }
    return `${location} current temperature weather ${todayStr} today hourly`.trim().slice(0, 200);
  }

  private rewriteNews(query: string, todayStr: string): string {
    const hasArabic = /[\u0600-\u06FF]/.test(query);
    const company = this.extractCompany(query);

    if (company) {
      if (hasArabic) {
        return `site:${company}.com ${query} ${todayStr}`.slice(0, 200);
      }
      return `site:${company}.com ${query} ${todayStr}`.slice(0, 200);
    }

    if (hasArabic) {
      return `${query} ${todayStr}`.slice(0, 200);
    }
    return `${query} ${todayStr}`.slice(0, 200);
  }

  private rewriteVersion(query: string): string {
    const frameworks: Record<string, string[]> = {
      nextjs: ["nextjs.org", "github.com/vercel/next.js/releases", "npmjs.com/package/next"],
      "next.js": ["nextjs.org", "github.com/vercel/next.js/releases", "npmjs.com/package/next"],
      react: ["react.dev", "github.com/facebook/react/releases", "npmjs.com/package/react"],
      node: ["nodejs.org", "github.com/nodejs/node/releases", "npmjs.com/package/node"],
      npm: ["npmjs.com", "github.com/npm/cli/releases"],
    };

    const lower = query.toLowerCase();
    for (const [name, sites] of Object.entries(frameworks)) {
      if (lower.includes(name)) {
        return `${query} official latest version ${sites.join(" OR ")}`.slice(0, 200);
      }
    }

    return `${query} latest version official release`.slice(0, 200);
  }

  private rewriteSports(query: string, currentYear: number): string {
    const hasArabic = /[\u0600-\u06FF]/.test(query);

    const yearMatch = query.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

    if (hasArabic) {
      return `FIFA ${query} رسمي نتيجة ${year}`.slice(0, 200);
    }
    return `FIFA ${query} official result ${year}`.slice(0, 200);
  }

  private rewriteCompany(query: string): string {
    const companies: Record<string, string[]> = {
      aramco: ["aramco.com"],
      "saudi aramco": ["aramco.com"],
      أرامكو: ["aramco.com"],
      stc: ["stc.com.sa"],
      الراجحي: ["alrajhibank.com.sa"],
    };

    const lower = query.toLowerCase();
    for (const [name, sites] of Object.entries(companies)) {
      if (lower.includes(name)) {
        return `site:${sites[0]} ${query}`.slice(0, 200);
      }
    }

    return query.length > 200 ? query.slice(0, 200) : query;
  }

  extractLocation(text: string): string {
    const arabic = text.match(/(?:في|فى)\s+([\u0600-\u06FF\s]{2,30}?)(?:\s*[؟?]|\s*$|\s+[فيو])/i);
    if (arabic) return arabic[1].trim();
    const english = text.match(/(?:in|at|for)\s+([a-zA-Z\s]{2,30}?)(?:\s*[?.!]|\s*$|\s+(?:today|now|weather))/i);
    if (english) return english[1].trim();
    return "";
  }

  private extractCompany(query: string): string {
    const companies: Record<string, string> = {
      nvidia: "nvidia",
      google: "google",
      apple: "apple",
      microsoft: "microsoft",
      meta: "meta",
      amazon: "amazon",
      aramco: "aramco",
      أرامكو: "aramco",
    };
    const lower = query.toLowerCase();
    for (const [name, domain] of Object.entries(companies)) {
      if (lower.includes(name)) return domain;
    }
    return "";
  }
}
