import { getImportanceForKey } from "./MemoryTypes";

export interface ImportanceScore {
  importance: number;
  reason: string;
}

export class MemoryImportanceScorer {
  score(key: string, value: string, source: string, confidence: number): ImportanceScore {
    const base = getImportanceForKey(key);

    let boost = 0;
    if (source === "explicit_save") boost += 2;
    if (source === "chat_extraction") boost += 0;
    if (confidence >= 0.9) boost += 1;
    if (value.length > 100) boost += 1;

    if (key === "name") {
      return { importance: Math.min(10, base + boost), reason: "Core identity fact" };
    }
    if (key === "goals" || key === "age") {
      return { importance: Math.min(10, base + boost), reason: "High-value personal fact" };
    }

    return { importance: Math.min(10, base + boost), reason: "Auto-scored" };
  }

  scoreForRetrieval(importance: number, useCount: number, daysSinceLastUse: number | null): number {
    let score = importance * 0.5;
    score += Math.min(useCount, 20) * 0.2;

    if (daysSinceLastUse !== null && daysSinceLastUse < 7) {
      score += 2;
    }

    return Math.min(10, score);
  }
}
