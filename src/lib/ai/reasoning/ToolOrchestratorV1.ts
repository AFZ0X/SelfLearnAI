import type { ReasoningPlan } from "./ReasoningPlanner";

export interface ToolDecision {
  useMemory: boolean;
  useWebSearch: boolean;
  useConversationContext: boolean;
  useInternalKnowledge: boolean;
}

export class ToolOrchestratorV1 {
  selectTools(plan: ReasoningPlan, hasExplicitSearch: boolean): ToolDecision {
    if (plan.requiresClarification) {
      return {
        useMemory: false,
        useWebSearch: false,
        useConversationContext: true,
        useInternalKnowledge: false,
      };
    }

    if (plan.requiresRefusal) {
      return {
        useMemory: false,
        useWebSearch: false,
        useConversationContext: false,
        useInternalKnowledge: false,
      };
    }

    return {
      useMemory: plan.requiresMemory,
      useWebSearch: plan.requiresWebSearch || hasExplicitSearch,
      useConversationContext: true,
      useInternalKnowledge: true,
    };
  }
}
