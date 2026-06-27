import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { retrievalConfig, type RetrievalConfig } from "../retrieval/config";
import { MemoryExtractionServiceV2 } from "./MemoryExtractionServiceV2";
import { ProfileFactExtractor } from "./ProfileFactExtractor";
import { NameExtractorService } from "./NameExtractorService";

export interface RetrievedMemoryV2 {
  id: string;
  text: string;
  value: string | null;
  summary: string | null;
  tags: string[];
  memoryKey: string | null;
  memoryType: string | null;
  status: string;
  importance: number;
  similarity: number;
  relevanceLabel: "high" | "medium" | "low";
  retrievalMode: "exact" | "structured" | "vector" | "conversation";
}

export interface RetrievalResultV2 {
  memories: RetrievedMemoryV2[];
  profileFacts: RetrievedMemoryV2[];
  memoryUsed: boolean;
  retrievalMode: "exact" | "structured" | "vector" | "conversation" | "none";
  confidence: number;
}

interface RawRow {
  memoryId: string;
  distance: number;
}

export class MemoryRetrievalServiceV2 {
  private config: RetrievalConfig;
  private extractionService = new MemoryExtractionServiceV2();
  private profileExtractor = new ProfileFactExtractor();
  private nameExtractor = new NameExtractorService();

  constructor(config?: Partial<RetrievalConfig>) {
    this.config = { ...retrievalConfig, ...config };
  }

  async retrieve(
    userId: string,
    queryText: string
  ): Promise<RetrievalResultV2> {
    if (!queryText?.trim()) {
      return { memories: [], profileFacts: [], memoryUsed: false, retrievalMode: "none", confidence: 0 };
    }

    const profileQuery = this.profileExtractor.detectQuery(queryText);
    const nameQuery = this.nameExtractor.isNameQuery(queryText);

    if (profileQuery || nameQuery) {
      const key = profileQuery?.key || "name";
      const exact = await this.lookupExact(userId, key);
      if (exact) {
        return {
          memories: [exact],
          profileFacts: [exact],
          memoryUsed: true,
          retrievalMode: "exact",
          confidence: exact.similarity,
        };
      }
      return {
        memories: [],
        profileFacts: [],
        memoryUsed: false,
        retrievalMode: "exact",
        confidence: 0,
      };
    }

    const structured = await this.structuredQuery(userId, queryText);
    if (structured.memories.length > 0) {
      return { ...structured, retrievalMode: "structured", confidence: 0.85 };
    }

    const vector = await this.vectorSearch(userId, queryText);
    if (vector.memories.length > 0) {
      return { ...vector, retrievalMode: "vector", confidence: vector.memories[0]?.similarity || 0 };
    }

    return {
      memories: [], profileFacts: [], memoryUsed: false, retrievalMode: "none", confidence: 0,
    };
  }

  async lookupExact(userId: string, key: string): Promise<RetrievedMemoryV2 | null> {
    const memory = await prisma.memory.findFirst({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: {
        id: true, text: true, value: true, summary: true, tags: true,
        memoryKey: true, memoryType: true, status: true, importance: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!memory) return null;

    return {
      ...memory,
      similarity: 1.0,
      relevanceLabel: "high",
      retrievalMode: "exact",
    };
  }

  async getAllActiveProfileFacts(userId: string): Promise<RetrievedMemoryV2[]> {
    const memories = await prisma.memory.findMany({
      where: { userId, memoryKey: { not: null }, status: "ACTIVE" },
      select: {
        id: true, text: true, value: true, summary: true, tags: true,
        memoryKey: true, memoryType: true, status: true, importance: true,
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });

    return memories.map((m) => ({
      ...m,
      similarity: 1.0,
      relevanceLabel: "high" as const,
      retrievalMode: "exact" as const,
    }));
  }

  private async structuredQuery(
    userId: string,
    queryText: string
  ): Promise<{ memories: RetrievedMemoryV2[]; profileFacts: RetrievedMemoryV2[]; memoryUsed: boolean }> {
    const lower = queryText.toLowerCase();
    const keyWords: Record<string, string[]> = {
      name: ["name", "اسم", "call"],
      age: ["age", "old", "عمر", "سن"],
      city: ["city", "live", "ساكن", "أسكن", "من"],
      work: ["work", "job", "أشتغل", "وظيفة"],
      education: ["education", "study", "أدرس", "دراسة"],
      interests: ["interests", "hobbies", "أحب", "هوايات"],
      goals: ["goal", "هدف", "future"],
    };

    for (const [key, words] of Object.entries(keyWords)) {
      if (words.some((w) => lower.includes(w))) {
        const memory = await this.lookupExact(userId, key);
        if (memory) {
          return { memories: [memory], profileFacts: [memory], memoryUsed: true };
        }
      }
    }

    return { memories: [], profileFacts: [], memoryUsed: false };
  }

  private async vectorSearch(
    userId: string,
    queryText: string
  ): Promise<{ memories: RetrievedMemoryV2[]; profileFacts: RetrievedMemoryV2[]; memoryUsed: boolean }> {
    let embedding: number[];
    try {
      const provider = getEmbeddingProvider();
      embedding = await provider.generateEmbedding(queryText);
    } catch {
      return { memories: [], profileFacts: [], memoryUsed: false };
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
      return { memories: [], profileFacts: [], memoryUsed: false };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { memories: [], profileFacts: [], memoryUsed: false };
    }

    const threshold = this.config.similarityThreshold;
    const filtered = rows.filter((row) => 1 - row.distance >= threshold);

    if (filtered.length === 0) {
      return { memories: [], profileFacts: [], memoryUsed: false };
    }

    const memoryIds = filtered.map((r) => r.memoryId);
    const memories = await prisma.memory.findMany({
      where: { id: { in: memoryIds }, userId, status: "ACTIVE" },
      select: {
        id: true, text: true, value: true, summary: true, tags: true,
        memoryKey: true, memoryType: true, status: true, importance: true,
      },
    });

    const memoryMap = new Map(memories.map((m) => [m.id, m]));

    const result: RetrievedMemoryV2[] = [];
    let totalChars = 0;

    for (const row of filtered) {
      const memory = memoryMap.get(row.memoryId);
      if (!memory) continue;

      const similarity = 1 - row.distance;
      const relevanceLabel = similarity >= 0.85 ? "high" : similarity >= 0.7 ? "medium" : "low";

      let text = memory.text;
      if (text.length > this.config.maxSingleMemoryChars) {
        text = text.slice(0, this.config.maxSingleMemoryChars) + "...";
      }

      const entry: RetrievedMemoryV2 = {
        ...memory,
        similarity: parseFloat(similarity.toFixed(4)),
        relevanceLabel,
        retrievalMode: "vector",
      };

      const entrySize = text.length + (memory.summary?.length || 0);
      if (totalChars + entrySize > this.config.maxMemoryContextChars) break;
      totalChars += entrySize;
      result.push(entry);
    }

    return {
      memories: result,
      profileFacts: result.filter((m) => m.memoryKey && m.memoryType === "PROFILE_FACT"),
      memoryUsed: result.length > 0,
    };
  }
}
