export interface EvidenceValidation {
  valid: boolean;
  conflicts: ConflictInfo[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  warnings: string[];
  insufficientEvidence: boolean;
  speculativeContent: boolean;
}

export interface ConflictInfo {
  topic: string;
  sources: string[];
  detail: string;
}

const FRESHNESS_REQUIRED_KEYWORDS = [
  "today", "now", "current", "latest", "live", "weather", "temperature",
  "forecast", "score", "result", "news", "breaking", "update",
  "اليوم", "الآن", "حاليا", "الطقس", "درجة الحرارة", "نتيجة", "أخبار",
];

const SPECULATIVE_PATTERNS = [
  /predicted?\s+(to|that|win|reach)/i,
  /expected?\s+(to|that|win|reach)/i,
  /forecast(ed)?/i,
  /projected?\s+(to|that|win|reach)/i,
  /likely\s+(to|win|reach)/i,
  /could\s+(win|reach|beat|defeat)/i,
  /may\s+(win|reach|beat|defeat)/i,
  /would\s+(win|reach|defeat)/i,
];

export class EvidenceValidator {
  validate(
    sources: Array<{ title: string; url: string; snippet: string; sourceDate?: string; isStale?: boolean }>,
    query: string
  ): EvidenceValidation {
    const conflicts: ConflictInfo[] = [];
    const warnings: string[] = [];
    const now = new Date();

    const needsFreshness = FRESHNESS_REQUIRED_KEYWORDS.some((kw) =>
      query.toLowerCase().includes(kw)
    );

    const hasDateRelevantSource = sources.some((s) => {
      if (!s.sourceDate) return false;
      const diffDays = Math.abs((now.getTime() - new Date(s.sourceDate).getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    if (needsFreshness && !hasDateRelevantSource && sources.length > 0) {
      warnings.push("Query requires current information but no source has a recent date.");
    }

    if (needsFreshness && sources.length === 0) {
      warnings.push("Query requires current information but no sources found.");
    }

    const staleCount = sources.filter((s) => s.isStale).length;
    if (staleCount > 0 && staleCount === sources.length) {
      warnings.push("All sources have stale or absent dates.");
    }

    const speculativeSources: string[] = [];
    for (const source of sources) {
      const text = (source.title + " " + source.snippet).toLowerCase();
      for (const pattern of SPECULATIVE_PATTERNS) {
        if (pattern.test(text)) {
          speculativeSources.push(source.title);
          break;
        }
      }
    }

    if (speculativeSources.length > 0) {
      warnings.push(`Speculative content detected in ${speculativeSources.length} source(s).`);
    }

    const contradictionPairs = this.detectContradictions(sources);
    for (const c of contradictionPairs) {
      conflicts.push(c);
    }

    const insufficientEvidence = sources.length === 0;
    const speculativeContent = speculativeSources.length > sources.length / 2;

    let confidence: "HIGH" | "MEDIUM" | "LOW";
    if (sources.length >= 2 && conflicts.length === 0 && !needsFreshness) {
      confidence = "HIGH";
    } else if (sources.length >= 1 && conflicts.length <= 1 && hasDateRelevantSource) {
      confidence = "HIGH";
    } else if (sources.length >= 1) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }

    const valid = !insufficientEvidence;

    return {
      valid,
      conflicts,
      confidence,
      warnings,
      insufficientEvidence,
      speculativeContent,
    };
  }

  private detectContradictions(
    sources: Array<{ title: string; url: string; snippet: string }>
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const a = (sources[i].title + " " + sources[i].snippet).toLowerCase();
        const b = (sources[j].title + " " + sources[j].snippet).toLowerCase();

        if (this.hasDirectContradiction(a, b)) {
          conflicts.push({
            topic: "Contradictory information",
            sources: [sources[i].title, sources[j].title],
            detail: `Source ${i + 1} and source ${j + 1} contain contradictory information.`,
          });
        }
      }
    }

    return conflicts;
  }

  private hasDirectContradiction(a: string, b: string): boolean {
    const negationPairs = [
      ["win", "lost"],
      ["won", "lost"],
      ["defeated", "defeated by"],
      ["beat", "lost to"],
      ["higher", "lower"],
      ["increase", "decrease"],
      ["up", "down"],
      ["hot", "cold"],
      ["warm", "cold"],
    ];

    for (const [pos, neg] of negationPairs) {
      const hasPosA = a.includes(pos) && a.includes(neg);
      const hasPosB = b.includes(pos) && b.includes(neg);
      if ((a.includes(pos) && b.includes(neg)) || (a.includes(neg) && b.includes(pos))) {
        if (hasPosA || hasPosB) continue;
        return true;
      }
    }

    const numberPattern = /\b(-?\d+\.?\d*)\b/g;
    const numsA = [...a.matchAll(numberPattern)].map((m) => parseFloat(m[1]));
    const numsB = [...b.matchAll(numberPattern)].map((m) => parseFloat(m[1]));

    if (numsA.length === 1 && numsB.length === 1 && numsA[0] !== numsB[0]) {
      const diff = Math.abs(numsA[0] - numsB[0]);
      if (diff > 5) return true;
    }

    return false;
  }
}
