import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";
import { MemoryDeduplicationService } from "./MemoryDeduplicationService";
import { MemoryUpdateService } from "./MemoryUpdateService";
import { MemoryImportanceScorer } from "./MemoryImportanceScorer";
import {
  getMemoryTypeForKey,
  getImportanceForKey,
  isSingleValueKey,
  type MemoryTypeV2,
} from "./MemoryTypes";

export interface WriteRequest {
  userId: string;
  key: string;
  value: string;
  text: string;
  source: string;
  confidence: number;
  tags?: string[];
  memoryType?: MemoryTypeV2;
  importance?: number;
  lifespan?: string;
}

export interface WriteResult {
  written: boolean;
  deduplicated: boolean;
  superseded: boolean;
  memoryId: string;
  oldValue: string | null;
}

function logError(context: string, error: unknown): void {
  console.error(`[MemoryWriteService] ${context}:`, error instanceof Error ? error.message : String(error));
}

export class MemoryWriteService {
  private dedup = new MemoryDeduplicationService();
  private update = new MemoryUpdateService();
  private scorer = new MemoryImportanceScorer();

  async write(request: WriteRequest): Promise<WriteResult> {
    const { userId, key, value, text, source, confidence } = request;
    const memoryType = request.memoryType || getMemoryTypeForKey(key);
    const importance = request.importance ?? getImportanceForKey(key);
    const dedupResult = await this.dedup.findDuplicate(userId, key, value);
    if (dedupResult) {
      await this.update.touch(dedupResult.id);
      return {
        written: false,
        deduplicated: true,
        superseded: false,
        memoryId: dedupResult.id,
        oldValue: null,
      };
    }

    const updateResult = await this.update.updateFact(userId, key, value);

    const isMultiValueKey = !isSingleValueKey(key);
    const createNew = !updateResult.updated || updateResult.superseded || isMultiValueKey;

    if (!createNew) {
      return {
        written: false,
        deduplicated: true,
        superseded: false,
        memoryId: updateResult.oldValue ? "" : "",
        oldValue: updateResult.oldValue,
      };
    }

    const memory = await prisma.$transaction(async (tx) => {
      if (isSingleValueKey(key)) {
        await tx.memory.updateMany({
          where: { userId, memoryKey: key, status: "ACTIVE" },
          data: { status: "SUPERSEDED", confidence: 0.1 },
        });
      }

      const mem = await tx.memory.create({
        data: {
          userId,
          type: "USER",
          text,
          summary: `${key}: ${value}`,
          source,
          confidence,
          visibility: "private",
          tags: request.tags || [memoryType.toLowerCase(), key],
          memoryKey: key,
          status: "ACTIVE",
        },
      });

      return mem;
    });

    try {
      const provider = getEmbeddingProvider();
      const embedding = await provider.generateEmbedding(text);
      const model =
        process.env.EMBEDDING_PROVIDER === "openai"
          ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
          : "mock-v1";
      await saveEmbedding(memory.id, embedding, model);
    } catch (e) {
      logError("embedding generation failed", e);
    }

    return {
      written: true,
      deduplicated: false,
      superseded: !!updateResult.superseded,
      memoryId: memory.id,
      oldValue: updateResult.oldValue,
    };
  }

  async writeBatch(requests: WriteRequest[]): Promise<WriteResult[]> {
    return Promise.all(requests.map((r) => this.write(r)));
  }
}
