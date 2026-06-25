import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { retrievalConfig, type RetrievalConfig } from "./config";

export interface RetrievedMemory {
  id: string;
  text: string;
  summary: string | null;
  tags: string[];
  similarity: number;
  relevanceLabel: "high" | "medium" | "low";
}

export interface RetrievalResult {
  memories: RetrievedMemory[];
  memoryUsed: boolean;
}

interface RawRow {
  memoryId: string;
  distance: number;
}

export class MemoryRetrievalService {
  private config: RetrievalConfig;

  constructor(config?: Partial<RetrievalConfig>) {
    this.config = { ...retrievalConfig, ...config };
  }

  async retrieveRelevantMemories(
    userId: string,
    queryText: string
  ): Promise<RetrievalResult> {
    if (!queryText?.trim()) {
      return { memories: [], memoryUsed: false };
    }

    let embedding: number[];
    try {
      const provider = getEmbeddingProvider();
      embedding = await provider.generateEmbedding(queryText);
    } catch {
      return { memories: [], memoryUsed: false };
    }

    const vectorStr = `[${embedding.join(",")}]`;

    let rows: RawRow[];
    try {
      rows = await prisma.$queryRawUnsafe<RawRow[]>(
        `SELECT me."memoryId", me.embedding <=> $2::vector AS distance
         FROM "MemoryEmbedding" me
         INNER JOIN "Memory" m ON m.id = me."memoryId"
         WHERE m."userId" = $1 AND me.embedding IS NOT NULL
         ORDER BY distance
         LIMIT $3`,
        userId,
        vectorStr,
        this.config.topK
      );
    } catch {
      return { memories: [], memoryUsed: false };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { memories: [], memoryUsed: false };
    }

    const threshold = this.config.similarityThreshold;
    const filtered = rows.filter(
      (row) => 1 - row.distance >= threshold
    );

    if (filtered.length === 0) {
      return { memories: [], memoryUsed: false };
    }

    const memoryIds = filtered.map((r) => r.memoryId);
    const memories = await prisma.memory.findMany({
      where: { id: { in: memoryIds }, userId },
      select: {
        id: true,
        text: true,
        summary: true,
        tags: true,
      },
    });

    const memoryMap = new Map(memories.map((m) => [m.id, m]));

    const result: RetrievedMemory[] = [];
    let totalChars = 0;

    for (const row of filtered) {
      const memory = memoryMap.get(row.memoryId);
      if (!memory) continue;

      const similarity = 1 - row.distance;
      const relevanceLabel = this.getRelevanceLabel(similarity);

      let text = memory.text;
      if (text.length > this.config.maxSingleMemoryChars) {
        text = text.slice(0, this.config.maxSingleMemoryChars) + "...";
      }

      const entry: RetrievedMemory = {
        id: memory.id,
        text,
        summary: memory.summary,
        tags: memory.tags,
        similarity: parseFloat(similarity.toFixed(4)),
        relevanceLabel,
      };

      const entrySize = text.length + (memory.summary?.length || 0);
      if (totalChars + entrySize > this.config.maxMemoryContextChars) {
        break;
      }
      totalChars += entrySize;
      result.push(entry);
    }

    return {
      memories: result,
      memoryUsed: result.length > 0,
    };
  }

  private getRelevanceLabel(
    similarity: number
  ): "high" | "medium" | "low" {
    if (similarity >= 0.85) return "high";
    if (similarity >= 0.7) return "medium";
    return "low";
  }
}
