import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";
import { ProfileFactExtractor, type ProfileKey, type ProfileFact, type ProfileQuery } from "./ProfileFactExtractor";
import { MemoryConflictResolver } from "./MemoryConflictResolver";

function logError(context: string, error: unknown): void {
  console.error(`[ProfileMemoryService] ${context}:`, error instanceof Error ? error.message : String(error));
}

export interface ProfileMemoryResult {
  action: "saved" | "found" | "not_found" | "none";
  key: ProfileKey | null;
  value: string | null;
  memoryId: string | null;
  conflictResolved: boolean;
  oldValueSuperseded: string | null;
}

export interface ProfileFactData {
  id: string;
  text: string;
  summary: string | null;
  tags: string[];
  memoryKey: string | null;
  status: string;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileMemoryService {
  private extractor = new ProfileFactExtractor();
  private resolver = new MemoryConflictResolver();

  async process(
    userId: string,
    userMessage: string
  ): Promise<ProfileMemoryResult> {
    const fact = this.extractor.extract(userMessage);
    if (fact) {
      return this.saveProfileFact(userId, fact);
    }

    const query = this.extractor.detectQuery(userMessage);
    if (query) {
      return this.resolveProfileQuery(userId, query);
    }

    return { action: "none", key: null, value: null, memoryId: null, conflictResolved: false, oldValueSuperseded: null };
  }

  private async saveProfileFact(
    userId: string,
    fact: ProfileFact
  ): Promise<ProfileMemoryResult> {
    const existing = await this.resolver.getActive(userId, fact.key);

    if (existing && existing.text.normalize("NFC") === fact.value.normalize("NFC")) {
      return {
        action: "found",
        key: fact.key,
        value: fact.value,
        memoryId: existing.id,
        conflictResolved: false,
        oldValueSuperseded: null,
      };
    }

    const memory = await prisma.$transaction(async (tx) => {
      const mem = await tx.memory.create({
        data: {
          userId,
          type: "USER",
          text: fact.value,
          summary: `${fact.key}: ${fact.value}`,
          source: "chat",
          confidence: fact.confidence,
          visibility: "private",
          tags: ["profile", fact.key],
          memoryKey: fact.key,
          status: "ACTIVE",
        },
        select: {
          id: true,
          text: true,
          summary: true,
          tags: true,
          memoryKey: true,
          status: true,
          confidence: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const prevActive = await tx.memory.findFirst({
        where: { userId, memoryKey: fact.key, status: "ACTIVE", id: { not: mem.id } },
        select: { id: true, text: true },
      });

      if (prevActive) {
        await tx.memory.update({
          where: { id: prevActive.id },
          data: { status: "SUPERSEDED", supersededById: mem.id, confidence: 0.1 },
        });
      }

      return { memory: mem, conflict: prevActive };
    });

    const model = process.env.EMBEDDING_PROVIDER === "openai"
      ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
      : "mock-v1";
    try {
      const provider = getEmbeddingProvider();
      const embedding = await provider.generateEmbedding(fact.text);
      await saveEmbedding(memory.memory.id, embedding, model);
    } catch (e) {
      logError("embedding generation failed", e);
    }

    return {
      action: "saved",
      key: fact.key,
      value: fact.value,
      memoryId: memory.memory.id,
      conflictResolved: !!memory.conflict,
      oldValueSuperseded: memory.conflict?.text ?? null,
    };
  }

  private async resolveProfileQuery(
    userId: string,
    query: ProfileQuery
  ): Promise<ProfileMemoryResult> {
    const active = await this.resolver.getActive(userId, query.key);
    if (active) {
      return {
        action: "found",
        key: query.key,
        value: active.text,
        memoryId: active.id,
        conflictResolved: false,
        oldValueSuperseded: null,
      };
    }

    return {
      action: "not_found",
      key: query.key,
      value: null,
      memoryId: null,
      conflictResolved: false,
      oldValueSuperseded: null,
    };
  }

  async getActiveFact(userId: string, key: string): Promise<ProfileFactData | null> {
    const memory = await prisma.memory.findFirst({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: {
        id: true,
        text: true,
        summary: true,
        tags: true,
        memoryKey: true,
        status: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return memory;
  }

  async getAllActiveFacts(userId: string): Promise<ProfileFactData[]> {
    const memories = await prisma.memory.findMany({
      where: { userId, memoryKey: { not: null }, status: "ACTIVE" },
      select: {
        id: true,
        text: true,
        summary: true,
        tags: true,
        memoryKey: true,
        status: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return memories;
  }
}
