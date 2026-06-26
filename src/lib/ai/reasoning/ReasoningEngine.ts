import { IntentAnalyzer, type IntentResult } from "./IntentAnalyzer";
import { TaskClassifier, type TaskClassification } from "./TaskClassifier";
import { ReasoningPlanner, type ReasoningPlan } from "./ReasoningPlanner";
import { ToolOrchestratorV1, type ToolDecision } from "./ToolOrchestratorV1";
import { EvidenceCollector, type EvidenceResult } from "./EvidenceCollector";
import { AnswerDraftBuilder, type DraftOptions } from "./AnswerDraftBuilder";
import { SelfVerifier, type VerificationResult } from "./SelfVerifier";
import { ConfidenceScorer, type ConfidenceResult } from "./ConfidenceScorer";
import type { ResponseMode } from "../retrieval/ResponseStyleService";
import type { RetrievedMemory } from "../retrieval/MemoryRetrievalService";
import type { WebSearchOutcome } from "../web/WebSearchService";

export interface ReasoningEvent {
  stepName: string;
  status: "RUNNING" | "COMPLETED" | "ERROR";
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ReasoningOutput {
  intent: IntentResult;
  taskClassification: TaskClassification;
  reasoningPlan: ReasoningPlan;
  toolDecision: ToolDecision;
  evidence: EvidenceResult;
  verification: VerificationResult;
  confidence: ConfidenceResult;
  draftOptions: DraftOptions;
  systemPrompt: string;
  planSummary: string;
  events: ReasoningEvent[];
}

export class ReasoningEngine {
  private intentAnalyzer: IntentAnalyzer;
  private taskClassifier: TaskClassifier;
  private reasoningPlanner: ReasoningPlanner;
  private toolOrchestrator: ToolOrchestratorV1;
  private evidenceCollector: EvidenceCollector;
  private draftBuilder: AnswerDraftBuilder;
  private verifier: SelfVerifier;
  private confidenceScorer: ConfidenceScorer;

  constructor() {
    this.intentAnalyzer = new IntentAnalyzer();
    this.taskClassifier = new TaskClassifier();
    this.reasoningPlanner = new ReasoningPlanner();
    this.toolOrchestrator = new ToolOrchestratorV1();
    this.evidenceCollector = new EvidenceCollector();
    this.draftBuilder = new AnswerDraftBuilder();
    this.verifier = new SelfVerifier();
    this.confidenceScorer = new ConfidenceScorer();
  }

  async reason(options: {
    query: string;
    memoryRetrievalResult: { memories: RetrievedMemory[]; memoryUsed: boolean };
    webSearchOutcome?: WebSearchOutcome;
    hasExplicitSearchTrigger: boolean;
    responseStyle: ResponseMode;
    citationsCount: number;
    webContext?: string;
    hasWeakEvidence: boolean;
  }): Promise<ReasoningOutput> {
    const events: ReasoningEvent[] = [];

    const intent = this.runStep("Intent_Analysis", events, () => {
      return this.intentAnalyzer.analyze(options.query);
    });

    const taskClassification = this.runStep("Task_Classification", events, () => {
      return this.taskClassifier.classify(intent);
    });

    const hasExistingMemory = options.memoryRetrievalResult.memoryUsed;

    const reasoningPlan = this.runStep("Reasoning_Plan", events, () => {
      return this.reasoningPlanner.plan(taskClassification, options.hasExplicitSearchTrigger, hasExistingMemory);
    });

    const toolDecision = this.runStep("Tool_Selection", events, () => {
      return this.toolOrchestrator.selectTools(reasoningPlan, options.hasExplicitSearchTrigger);
    });

    const evidence = this.runStep("Evidence_Collection", events, () => {
      return this.evidenceCollector.collectFromMemory(options.memoryRetrievalResult, toolDecision);
    });

    const webEvidenceSufficient = options.webSearchOutcome?.sufficiencyResult?.sufficient ?? false;
    const webEvidenceConfidence = options.webSearchOutcome?.sufficiencyResult?.confidence;
    const contradictions = options.webSearchOutcome?.freshnessResult
      ? 0
      : 0;

    const confidence = this.runStep("Confidence_Scoring", events, () => {
      return this.confidenceScorer.score(
        taskClassification,
        reasoningPlan,
        evidence,
        webEvidenceSufficient,
        webEvidenceConfidence,
        contradictions
      );
    });

    const hasWebContext = !!options.webContext;

    const verification = this.runStep("Self_Verification", events, () => {
      return this.verifier.verify(
        taskClassification,
        reasoningPlan,
        confidence,
        hasWebContext,
        evidence.memoryUsed,
        options.citationsCount
      );
    });

    const draftOptions: DraftOptions = {
      memoryContext: evidence.memoryUsed ? evidence.memories : undefined,
      webContext: options.webSearchOutcome?.sufficiencyResult?.controlledResponse ? undefined : options.webContext,
      webSearchUsed: options.webSearchOutcome?.webSearchUsed ?? false,
      forcedSearch: options.hasExplicitSearchTrigger,
      responseStyle: options.responseStyle,
      hasWeakEvidence: options.hasWeakEvidence,
      reasoningPlan,
      toolDecision,
      evidence,
      taskClassification,
      confidence,
    };

    const systemPrompt = this.draftBuilder.buildSystemPrompt(draftOptions);

    const planSummary = this.buildSafeSummary(reasoningPlan, toolDecision, evidence, confidence);

    return {
      intent,
      taskClassification,
      reasoningPlan,
      toolDecision,
      evidence,
      verification,
      confidence,
      draftOptions,
      systemPrompt,
      planSummary,
      events,
    };
  }

  private runStep<T>(name: string, events: ReasoningEvent[], fn: () => T): T {
    const event: ReasoningEvent = { stepName: name, status: "RUNNING" };
    events.push(event);
    try {
      const result = fn();
      event.status = "COMPLETED";
      return result;
    } catch (err) {
      event.status = "ERROR";
      event.metadata = { error: err instanceof Error ? err.message : "Unknown error" };
      throw err;
    }
  }

  private buildSafeSummary(
    plan: ReasoningPlan,
    tools: ToolDecision,
    evidence: EvidenceResult,
    confidence: ConfidenceResult
  ): string {
    const parts: string[] = [];

    if (tools.useWebSearch) {
      parts.push("web search");
    }
    if (evidence.memoryUsed) {
      parts.push("memory");
    }
    if (tools.useInternalKnowledge && !tools.useWebSearch) {
      parts.push("internal knowledge");
    }

    const toolSummary = parts.length > 0
      ? `Used: ${parts.join(" + ")}`
      : "No external tools required";

    return `${toolSummary}. Confidence: ${confidence.label}`;
  }
}
