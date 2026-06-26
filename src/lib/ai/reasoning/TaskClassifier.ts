import type { UserGoal } from "./IntentAnalyzer";

export type TaskType =
  | "FACTUAL_STABLE"
  | "FACTUAL_CURRENT"
  | "PERSONAL_MEMORY"
  | "TROUBLESHOOTING"
  | "CODING"
  | "PLANNING"
  | "CREATIVE"
  | "SUMMARIZATION"
  | "TRANSLATION"
  | "OPINION_ADVICE"
  | "ADMIN_OR_SYSTEM"
  | "UNKNOWN";

export interface TaskClassification {
  type: TaskType;
  needsWebSearch: boolean;
  needsMemory: boolean;
  canUseInternalKnowledge: boolean;
  isTimeSensitive: boolean;
  requiresOfficialSource: boolean;
}

const GOAL_TO_TASK: Record<UserGoal, TaskType> = {
  ASK_FACT: "FACTUAL_STABLE",
  ASK_CURRENT: "FACTUAL_CURRENT",
  ASK_PERSONAL: "PERSONAL_MEMORY",
  ASK_ACTION: "FACTUAL_STABLE",
  ASK_EXPLANATION: "FACTUAL_STABLE",
  ASK_CODE: "CODING",
  ASK_CREATIVE: "CREATIVE",
  ASK_SUMMARY: "SUMMARIZATION",
  ASK_TRANSLATION: "TRANSLATION",
  ASK_ADVICE: "OPINION_ADVICE",
  ASK_PLANNING: "PLANNING",
  ASK_TROUBLESHOOT: "TROUBLESHOOTING",
  GREETING: "UNKNOWN",
  SAVE_MEMORY: "PERSONAL_MEMORY",
  CHANGE_SETTING: "ADMIN_OR_SYSTEM",
  UNKNOWN: "UNKNOWN",
};

const TIME_SENSITIVE_TYPES: Set<TaskType> = new Set(["FACTUAL_CURRENT"]);
const NEEDS_OFFICIAL_SOURCE_TYPES: Set<TaskType> = new Set(["FACTUAL_CURRENT"]);
const NEEDS_MEMORY_TYPES: Set<TaskType> = new Set(["PERSONAL_MEMORY"]);
const CAN_USE_INTERNAL_TYPES: Set<TaskType> = new Set([
  "FACTUAL_STABLE", "CODING", "CREATIVE", "SUMMARIZATION",
  "TRANSLATION", "OPINION_ADVICE", "PLANNING", "TROUBLESHOOTING", "UNKNOWN",
]);
const NEEDS_WEB_TYPES: Set<TaskType> = new Set(["FACTUAL_CURRENT"]);

export class TaskClassifier {
  classify(intent: { goal: UserGoal }): TaskClassification {
    const type = GOAL_TO_TASK[intent.goal] || "UNKNOWN";

    return {
      type,
      needsWebSearch: NEEDS_WEB_TYPES.has(type),
      needsMemory: NEEDS_MEMORY_TYPES.has(type),
      canUseInternalKnowledge: CAN_USE_INTERNAL_TYPES.has(type),
      isTimeSensitive: TIME_SENSITIVE_TYPES.has(type),
      requiresOfficialSource: NEEDS_OFFICIAL_SOURCE_TYPES.has(type),
    };
  }
}
