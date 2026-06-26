import type { TaskClassification } from "./TaskClassifier";

export type ReasoningPlanType =
  | "DIRECT_ANSWER"
  | "MEMORY_ONLY"
  | "WEB_ONLY"
  | "MEMORY_THEN_WEB"
  | "MEMORY_AND_WEB"
  | "CLARIFICATION"
  | "REFUSE_SAFETY"
  | "UNCERTAIN_ANSWER";

export interface ReasoningPlan {
  planType: ReasoningPlanType;
  description: string;
  requiresMemory: boolean;
  requiresWebSearch: boolean;
  requiresClarification: boolean;
  requiresRefusal: boolean;
  canAnswerWithUncertainty: boolean;
}

export class ReasoningPlanner {
  plan(
    task: TaskClassification,
    hasExplicitSearchTrigger: boolean,
    hasExistingMemory: boolean
  ): ReasoningPlan {
    if (hasExplicitSearchTrigger) {
      return {
        planType: "WEB_ONLY",
        description: "Explicit search requested",
        requiresMemory: false,
        requiresWebSearch: true,
        requiresClarification: false,
        requiresRefusal: false,
        canAnswerWithUncertainty: false,
      };
    }

    switch (task.type) {
      case "FACTUAL_CURRENT":
        return {
          planType: "WEB_ONLY",
          description: "Current factual question — requires web search",
          requiresMemory: false,
          requiresWebSearch: true,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: true,
        };

      case "PERSONAL_MEMORY":
        if (hasExistingMemory) {
          return {
            planType: "MEMORY_ONLY",
            description: "Personal question — answering from memory",
            requiresMemory: true,
            requiresWebSearch: false,
            requiresClarification: false,
            requiresRefusal: false,
            canAnswerWithUncertainty: true,
          };
        }
        return {
          planType: "UNCERTAIN_ANSWER",
          description: "No relevant memory found",
          requiresMemory: false,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: true,
        };

      case "CODING":
      case "TROUBLESHOOTING":
        return {
          planType: "DIRECT_ANSWER",
          description: "Coding or troubleshooting — using internal knowledge + optional memory",
          requiresMemory: hasExistingMemory,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: false,
        };

      case "CREATIVE":
      case "SUMMARIZATION":
      case "TRANSLATION":
        return {
          planType: "DIRECT_ANSWER",
          description: "Using internal knowledge only",
          requiresMemory: false,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: false,
        };

      case "OPINION_ADVICE":
      case "PLANNING":
        return {
          planType: "DIRECT_ANSWER",
          description: "Opinion/advice/planning — using internal knowledge + memory if available",
          requiresMemory: hasExistingMemory,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: true,
        };

      case "FACTUAL_STABLE":
        return {
          planType: "DIRECT_ANSWER",
          description: "Stable factual — using internal knowledge + memory if relevant",
          requiresMemory: hasExistingMemory,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: true,
        };

      case "UNKNOWN":
        return {
          planType: "DIRECT_ANSWER",
          description: "General response",
          requiresMemory: false,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: false,
        };

      default:
        return {
          planType: "DIRECT_ANSWER",
          description: "Default response plan",
          requiresMemory: false,
          requiresWebSearch: false,
          requiresClarification: false,
          requiresRefusal: false,
          canAnswerWithUncertainty: false,
        };
    }
  }
}
