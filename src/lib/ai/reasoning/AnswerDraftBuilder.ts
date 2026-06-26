import { PromptContextBuilder } from "../retrieval/PromptContextBuilder";
import type { ResponseMode } from "../retrieval/ResponseStyleService";
import type { ReasoningPlan } from "./ReasoningPlanner";
import type { ToolDecision } from "./ToolOrchestratorV1";
import type { EvidenceResult } from "./EvidenceCollector";
import type { TaskClassification } from "./TaskClassifier";
import type { ConfidenceResult } from "./ConfidenceScorer";
import type { RetrievedMemory } from "../retrieval/MemoryRetrievalService";

export interface DraftOptions {
  memoryContext?: RetrievedMemory[];
  webContext?: string;
  webSearchUsed?: boolean;
  forcedSearch?: boolean;
  responseStyle?: ResponseMode;
  hasWeakEvidence?: boolean;
  reasoningPlan?: ReasoningPlan;
  toolDecision?: ToolDecision;
  evidence?: EvidenceResult;
  taskClassification?: TaskClassification;
  confidence?: ConfidenceResult;
}

export class AnswerDraftBuilder {
  private promptBuilder: PromptContextBuilder;

  constructor() {
    this.promptBuilder = new PromptContextBuilder();
  }

  buildSystemPrompt(options: DraftOptions): string {
    const {
      memoryContext,
      webContext,
      webSearchUsed,
      forcedSearch,
      responseStyle,
      hasWeakEvidence,
      reasoningPlan,
      confidence,
    } = options;

    const basePrompt = this.promptBuilder.buildSystemPrompt({
      memoryContext,
      webContext,
      webSearchUsed,
      forcedSearch,
      responseStyle,
      hasWeakEvidence,
    });

    const parts: string[] = [basePrompt];

    if (reasoningPlan && forcedSearch) {
      parts.push(
        "REASONING CONTEXT (internal, do not reveal): This response was planned through a reasoning pipeline."
      );
    }

    if (confidence) {
      parts.push(`\nSYSTEM CONFIDENCE: ${confidence.label}`);
      if (hasWeakEvidence || confidence.label === "LOW" || confidence.label === "UNKNOWN") {
        parts.push("NOTE: Confidence is limited. If evidence is insufficient, say so clearly.");
      }
    }

    return parts.join("\n");
  }
}
