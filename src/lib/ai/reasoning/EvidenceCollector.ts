import type { RetrievedMemory } from "../retrieval/MemoryRetrievalService";
import type { ToolDecision } from "./ToolOrchestratorV1";

export interface EvidenceResult {
  memories: RetrievedMemory[];
  memoryUsed: boolean;
  memoryConfidence: number;
  conversationMessages: number;
}

export class EvidenceCollector {
  collectFromMemory(
    retrievalResult: { memories: RetrievedMemory[]; memoryUsed: boolean },
    tools: ToolDecision
  ): EvidenceResult {
    if (!tools.useMemory || !retrievalResult.memoryUsed) {
      return {
        memories: [],
        memoryUsed: false,
        memoryConfidence: 0,
        conversationMessages: 0,
      };
    }

    const memoryConfidence = retrievalResult.memories.length > 0
      ? Math.max(...retrievalResult.memories.map((m) => m.similarity || 0))
      : 0;

    return {
      memories: retrievalResult.memories,
      memoryUsed: true,
      memoryConfidence,
      conversationMessages: 0,
    };
  }
}
