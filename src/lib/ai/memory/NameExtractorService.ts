import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";

interface NameMemoryData {
  id: string;
  text: string;
  summary: string | null;
  tags: string[];
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
  source: string | null;
}

export interface NameExtractionResult {
  action: "saved" | "found" | "query_found" | "query_not_found" | "none";
  name: string | null;
  memory: NameMemoryData | null;
}

export class NameExtractorService {
  private nameIntroPatterns = [
    /اسمي\s+الكامل\s+(.+)/i,
    /اسمي\s+(.+)/i,
    /أنا\s+(.+)/i,
    /نادني\s+(.+)/i,
    /ناديني\s+(.+)/i,
    /my name is\s+(.+)/i,
    /call me\s+(.+)/i,
    /i(?:'| a)?m\s+([a-zA-Z]+)/i,
  ];

  private nameQueryPatterns = [
    /وش\s+اسمي/i,
    /ما\s+اسمي/i,
    /شو\s+اسمي/i,
    /ايش\s+اسمي/i,
    /كيف\s+اسمي/i,
    /what(?:'s| is)\s+my\s+name/i,
    /do\s+you\s+(?:know|remember)\s+my\s+name/i,
    /what\s+do\s+you\s+call\s+me/i,
  ];

  extractName(text: string): string | null {
    if (!text?.trim()) return null;
    for (const pattern of this.nameIntroPatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
    return null;
  }

  isNameQuery(text: string): boolean {
    if (!text?.trim()) return false;
    return this.nameQueryPatterns.some((p) => p.test(text));
  }

  async findExistingNameMemory(userId: string): Promise<NameMemoryData | null> {
    const memory = await prisma.memory.findFirst({
      where: { userId, memoryKey: "name", status: "ACTIVE" },
      select: {
        id: true,
        text: true,
        summary: true,
        tags: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
        source: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return memory;
  }

  async getStoredName(userId: string): Promise<string | null> {
    const memory = await this.findExistingNameMemory(userId);
    return memory ? memory.text : null;
  }

  async upsertNameMemory(
    userId: string,
    name: string
  ): Promise<NameMemoryData> {
    const existing = await this.findExistingNameMemory(userId);

    if (existing) {
      const updated = await prisma.memory.update({
        where: { id: existing.id },
        data: {
          text: name,
          summary: `Preferred name: ${name}`,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          text: true,
          summary: true,
          tags: true,
          confidence: true,
          createdAt: true,
          updatedAt: true,
          source: true,
        },
      });

      const embeddingProvider = getEmbeddingProvider();
      try {
        const embedding = await embeddingProvider.generateEmbedding(
          `اسمي ${name}`
        );
        const model = process.env.EMBEDDING_PROVIDER === "openai"
          ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
          : "mock-v1";
        await saveEmbedding(updated.id, embedding, model);
      } catch (e) {
        console.error("[NameExtractorService] embedding generation failed:", e instanceof Error ? e.message : String(e));
      }

      return updated;
    }

    const memory = await prisma.memory.create({
      data: {
        userId,
        type: "USER",
        text: name,
        summary: `Preferred name: ${name}`,
        source: "chat",
        confidence: 1.0,
        visibility: "private",
        tags: ["name", "active"],
      },
      select: {
        id: true,
        text: true,
        summary: true,
        tags: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
        source: true,
      },
    });

    const embeddingProvider = getEmbeddingProvider();
    try {
      const embedding = await embeddingProvider.generateEmbedding(
        `اسمي ${name}`
      );
      const model = process.env.EMBEDDING_PROVIDER === "openai"
        ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
        : "mock-v1";
      await saveEmbedding(memory.id, embedding, model);
    } catch (e) {
      console.error("[NameExtractorService] embedding generation failed:", e instanceof Error ? e.message : String(e));
    }

    return memory;
  }

  async process(
    userId: string,
    userMessage: string
  ): Promise<NameExtractionResult> {
    const extractedName = this.extractName(userMessage);
    if (extractedName) {
      const memory = await this.upsertNameMemory(userId, extractedName);
      return { action: "saved", name: extractedName, memory };
    }

    if (this.isNameQuery(userMessage)) {
      const memory = await this.findExistingNameMemory(userId);
      if (memory) {
        return { action: "query_found", name: memory.text, memory };
      }
      return { action: "query_not_found", name: null, memory: null };
    }

    return { action: "none", name: null, memory: null };
  }
}
