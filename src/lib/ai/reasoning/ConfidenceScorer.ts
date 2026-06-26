import type { TaskClassification } from "./TaskClassifier";
import type { ReasoningPlan } from "./ReasoningPlanner";
import type { EvidenceResult } from "./EvidenceCollector";

export type ConfidenceLabel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  reasons: string[];
}

export class ConfidenceScorer {
  score(
    task: TaskClassification,
    plan: ReasoningPlan,
    evidence: EvidenceResult,
    webEvidenceSufficient: boolean,
    webEvidenceConfidence?: string,
    contradictions: number = 0
  ): ConfidenceResult {
    const reasons: string[] = [];
    let score = 50;

    if (plan.planType === "REFUSE_SAFETY") {
      return { score: 0, label: "UNKNOWN", reasons: ["Request refused for safety"] };
    }

    if (plan.planType === "CLARIFICATION") {
      return { score: 10, label: "LOW", reasons: ["Need clarification from user"] };
    }

    if (plan.planType === "UNCERTAIN_ANSWER") {
      return { score: 20, label: "LOW", reasons: ["No evidence found for this query"] };
    }

    if (plan.requiresWebSearch && webEvidenceSufficient) {
      score += 25;
      reasons.push("Web evidence available and sufficient");
      if (webEvidenceConfidence === "HIGH") {
        score += 10;
        reasons.push("High-confidence web sources");
      }
    } else if (plan.requiresWebSearch && !webEvidenceSufficient) {
      score -= 15;
      reasons.push("Web search did not return sufficient evidence");
    } else if (!plan.requiresWebSearch) {
      score += 15;
      reasons.push("No web search needed — stable knowledge");
    }

    if (evidence.memoryUsed) {
      score += 10;
      reasons.push("Relevant memory found");
      if (evidence.memoryConfidence > 0.85) {
        score += 10;
        reasons.push("High-confidence memory match");
      } else if (evidence.memoryConfidence > 0.7) {
        score += 5;
        reasons.push("Medium-confidence memory match");
      }
    }

    if (contradictions > 0) {
      score -= contradictions * 10;
      reasons.push(`Source contradiction(s) detected: ${contradictions}`);
    }

    if (task.type === "UNKNOWN") {
      score -= 10;
      reasons.push("Task type unclear");
    }

    if (task.type === "CREATIVE" || task.type === "OPINION_ADVICE") {
      score = Math.min(score, 70);
      reasons.push("Subjective/creative task — confidence capped");
    }

    if (task.type === "PERSONAL_MEMORY" && !evidence.memoryUsed) {
      return { score: 20, label: "LOW", reasons: ["No personal memory found for this query"] };
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    let label: ConfidenceLabel;
    if (clampedScore >= 75) label = "HIGH";
    else if (clampedScore >= 45) label = "MEDIUM";
    else if (clampedScore >= 15) label = "LOW";
    else label = "UNKNOWN";

    return { score: clampedScore, label, reasons };
  }
}
