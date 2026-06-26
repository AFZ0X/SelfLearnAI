import type { TaskClassification } from "./TaskClassifier";
import type { ReasoningPlan } from "./ReasoningPlanner";
import type { ConfidenceResult } from "./ConfidenceScorer";

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  shouldRetry: boolean;
  failureReason?: string;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export class SelfVerifier {
  verify(
    task: TaskClassification,
    plan: ReasoningPlan,
    confidence: ConfidenceResult,
    hasWebContext: boolean,
    hasMemoryContext: boolean,
    citationsCount: number
  ): VerificationResult {
    const checks: VerificationCheck[] = [];

    const addressed = this.checkQuestionAddressed(task, plan, confidence);
    checks.push(addressed);

    const unsupportedClaims = this.checkUnsupportedClaims(plan, hasWebContext, hasMemoryContext);
    checks.push(unsupportedClaims);

    const webSearchIgnored = this.checkWebSearchIgnored(task, plan, hasWebContext);
    checks.push(webSearchIgnored);

    const overExplained = this.checkOverExplained();
    checks.push(overExplained);

    const fabricatedCitations = this.checkFabricatedCitations(citationsCount, hasWebContext);
    checks.push(fabricatedCitations);

    const evidenceContradicts = this.checkEvidenceContradicts(confidence);
    checks.push(evidenceContradicts);

    const lowConfidence = this.checkLowConfidence(confidence, plan);
    checks.push(lowConfidence);

    const allPassed = checks.every((c) => c.passed);

    if (!allPassed && confidence.score < 30) {
      return {
        passed: false,
        checks,
        shouldRetry: false,
        failureReason: `Multiple verification failures (lowest: ${confidence.score}) — insufficient to answer reliably`,
      };
    }

    if (!allPassed && plan.requiresWebSearch && !hasWebContext) {
      return {
        passed: false,
        checks,
        shouldRetry: false,
        failureReason: "Web search was required but no web context collected",
      };
    }

    return {
      passed: allPassed,
      checks,
      shouldRetry: !allPassed && confidence.score >= 30,
      failureReason: allPassed ? undefined : "Some checks failed — may need revision",
    };
  }

  private checkQuestionAddressed(
    task: TaskClassification,
    plan: ReasoningPlan,
    confidence: ConfidenceResult
  ): VerificationCheck {
    if (plan.planType === "REFUSE_SAFETY" || plan.planType === "CLARIFICATION") {
      return { name: "question_addressed", passed: true, detail: "Plan type does not require answer" };
    }
    if (confidence.label === "UNKNOWN" && plan.planType !== "UNCERTAIN_ANSWER") {
      return { name: "question_addressed", passed: false, detail: "Confidence too low to answer" };
    }
    return { name: "question_addressed", passed: true };
  }

  private checkUnsupportedClaims(
    plan: ReasoningPlan,
    hasWebContext: boolean,
    hasMemoryContext: boolean
  ): VerificationCheck {
    if (plan.requiresWebSearch && !hasWebContext) {
      return { name: "unsupported_claims", passed: false, detail: "Web search required but no web context" };
    }
    if (plan.requiresMemory && !hasMemoryContext) {
      return { name: "unsupported_claims", passed: false, detail: "Memory required but none found" };
    }
    return { name: "unsupported_claims", passed: true };
  }

  private checkWebSearchIgnored(
    task: TaskClassification,
    plan: ReasoningPlan,
    hasWebContext: boolean
  ): VerificationCheck {
    if (plan.requiresWebSearch && !hasWebContext) {
      return { name: "web_search_ignored", passed: false, detail: "Plan required web search but was not executed or returned no results" };
    }
    return { name: "web_search_ignored", passed: true };
  }

  private checkOverExplained(): VerificationCheck {
    return { name: "over_explained", passed: true };
  }

  private checkFabricatedCitations(citationsCount: number, hasWebContext: boolean): VerificationCheck {
    if (hasWebContext && citationsCount === 0) {
      return { name: "fabricated_citations", passed: false, detail: "Web context exists but no citations collected" };
    }
    return { name: "fabricated_citations", passed: true };
  }

  private checkEvidenceContradicts(confidence: ConfidenceResult): VerificationCheck {
    const hasContradictionReason = confidence.reasons.some((r) =>
      r.toLowerCase().includes("contradiction")
    );
    if (hasContradictionReason) {
      return { name: "evidence_contradiction", passed: false, detail: "Source contradictions detected" };
    }
    return { name: "evidence_contradiction", passed: true };
  }

  private checkLowConfidence(confidence: ConfidenceResult, plan: ReasoningPlan): VerificationCheck {
    if (confidence.label === "UNKNOWN" && plan.planType !== "UNCERTAIN_ANSWER") {
      return { name: "low_confidence", passed: false, detail: `Confidence label: ${confidence.label}` };
    }
    if (confidence.score < 25 && plan.planType !== "UNCERTAIN_ANSWER" && plan.planType !== "CLARIFICATION") {
      return { name: "low_confidence", passed: false, detail: `Confidence score: ${confidence.score}` };
    }
    return { name: "low_confidence", passed: true };
  }
}
