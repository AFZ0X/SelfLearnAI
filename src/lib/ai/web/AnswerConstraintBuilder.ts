import type { QueryClassification } from "./QueryTypes";
import type { SufficiencyResult } from "./EvidenceSufficiencyValidator";

export class AnswerConstraintBuilder {
  buildConstraints(
    classification: QueryClassification,
    sufficiency: SufficiencyResult,
    acceptedCount: number,
    rejectedCount: number
  ): string {
    const parts: string[] = [];

    parts.push("EVIDENCE CONSTRAINTS — VIOLATION IS A BUG:");

    if (classification.type === "WEATHER") {
      parts.push("- You are answering a WEATHER question. Give ONLY the current temperature/condition.");
      parts.push("- Use ONLY sources with recent timestamps for the current temperature.");
      parts.push("- Do not use forecast data as current conditions.");
      parts.push("- If sources conflict, state the range and mention the conflict.");
      parts.push("- If no current source passed validation, say no reliable current reading found.");
      parts.push("- Do NOT use your training data to fill in weather values.");
    } else if (classification.type === "NEWS") {
      parts.push("- You are answering a NEWS question. Give ONLY news from recent sources.");
      parts.push("- If a source date is not today, do NOT describe it as \"today's news\".");
      parts.push("- Label older sources with their actual date (e.g., \"as of [date]\").");
      parts.push("- If no today-specific reliable source found, say no reliable today news found.");
    } else if (classification.type === "VERSION") {
      parts.push("- You are answering a VERSION question. Use ONLY official sources.");
      parts.push("- Prefer npm registry, GitHub releases, or official documentation.");
      parts.push("- Give the EXACT version number from the source, not a range.");
      parts.push("- Cite the official source with [N].");
    } else if (classification.type === "SPORTS_RESULT") {
      parts.push("- You are answering a SPORTS RESULT question.");
      parts.push("- If the event is in the future: no result exists yet. Say so.");
      parts.push("- Use ONLY official or reputable sports sources (FIFA, ESPN, etc.).");
      parts.push("- Do NOT fabricate scores, dates, venues, or goal details.");
      parts.push("- Do NOT use speculative content (predictions, forecasts) as actual results.");
    } else if (classification.type === "COMPANY_INFO") {
      parts.push("- You are answering a COMPANY INFORMATION question.");
      parts.push("- Use ONLY official company sources when available.");
      parts.push("- Clearly distinguish official programs from third-party/preparation courses.");
      parts.push("- If the source is unofficial, label it as such.");
    }

    if (sufficiency.warnings.length > 0) {
      parts.push("");
      parts.push("SOURCE QUALITY NOTES (from validation):");
      for (const w of sufficiency.warnings) {
        parts.push(`- ${w}`);
      }
    }

    if (rejectedCount > 0) {
      parts.push("");
      parts.push(`- ${rejectedCount} source(s) were rejected: stale dates, speculative content, or non-official domains.`);
    }

    parts.push("");
    parts.push("GENERAL RULES:");
    parts.push("- If evidence is insufficient, say so clearly. Do NOT fabricate.");
    parts.push("- Cite every factual claim with [N] notation matching the source numbers in <web_search_results>.");
    parts.push("- Never say \"I cannot access the internet\" — the results are provided above.");
    parts.push("- Never use internal training data to fill gaps when web search was used.");

    return parts.join("\n");
  }
}
