import { prisma } from "@/lib/db/prisma";
import { createMemory } from "@/lib/db/memories";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/EmbeddingProvider";
import { saveEmbedding } from "@/lib/db/embeddings";
import type { SensitivityLevel } from "./SensitivityClassifier";

export interface LearningCandidateData {
  userId: string;
  conversationId?: string | null;
  messageId?: string | null;
  text: string;
  summary?: string;
  source?: string;
  sensitivity: SensitivityLevel;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  confidence?: number;
  tags?: string[];
}

export interface LearningCandidateResponse {
  id: string;
  userId: string;
  conversationId: string | null;
  messageId: string | null;
  text: string;
  summary: string | null;
  source: string | null;
  sensitivity: string;
  status: string;
  confidence: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class LearningCandidateService {
  async list(userId: string, statusFilter?: string): Promise<LearningCandidateResponse[]> {
    const where: Record<string, unknown> = { userId };
    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    return prisma.learningCandidate.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, userId: true, conversationId: true, messageId: true,
        text: true, summary: true, source: true, sensitivity: true,
        status: true, confidence: true, tags: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async create(data: LearningCandidateData): Promise<LearningCandidateResponse> {
    return prisma.learningCandidate.create({
      data: {
        userId: data.userId,
        conversationId: data.conversationId ?? null,
        messageId: data.messageId ?? null,
        text: data.text,
        summary: data.summary?.trim() || null,
        source: data.source?.trim() || null,
        sensitivity: data.sensitivity,
        status: data.status || "PENDING",
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        tags: Array.isArray(data.tags) ? data.tags : [],
      },
      select: {
        id: true, userId: true, conversationId: true, messageId: true,
        text: true, summary: true, source: true, sensitivity: true,
        status: true, confidence: true, tags: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async get(candidateId: string, userId: string): Promise<LearningCandidateResponse | null> {
    const candidate = await prisma.learningCandidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true, userId: true, conversationId: true, messageId: true,
        text: true, summary: true, source: true, sensitivity: true,
        status: true, confidence: true, tags: true, createdAt: true, updatedAt: true,
      },
    });
    if (!candidate || candidate.userId !== userId) return null;
    return candidate;
  }

  async updateStatus(
    candidateId: string,
    userId: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<LearningCandidateResponse | null> {
    const existing = await prisma.learningCandidate.findUnique({
      where: { id: candidateId },
      select: { userId: true, status: true },
    });
    if (!existing || existing.userId !== userId) return null;
    if (existing.status !== "PENDING") return null;

    return prisma.learningCandidate.update({
      where: { id: candidateId },
      data: { status },
      select: {
        id: true, userId: true, conversationId: true, messageId: true,
        text: true, summary: true, source: true, sensitivity: true,
        status: true, confidence: true, tags: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async approveAndStore(
    userId: string,
    data: {
      text: string;
      summary?: string;
      source?: string;
      sensitivity: SensitivityLevel;
      confidence?: number;
      tags?: string[];
    }
  ): Promise<void> {
    const memory = await createMemory(userId, {
      text: data.text,
      summary: data.summary,
      source: data.source || "learning",
      confidence: data.confidence,
      tags: data.tags || [],
    });

    try {
      const embeddingProvider = getEmbeddingProvider();
      const embedding = await embeddingProvider.generateEmbedding(data.text);
      const model = process.env.EMBEDDING_PROVIDER === "openai"
        ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
        : "mock-v1";
      await saveEmbedding(memory.id, embedding, model);
    } catch {
      // Embedding failure is non-fatal — memory still exists
    }
  }

  async delete(candidateId: string, userId: string): Promise<boolean> {
    const existing = await prisma.learningCandidate.findUnique({
      where: { id: candidateId },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) return false;
    await prisma.learningCandidate.delete({ where: { id: candidateId } });
    return true;
  }
}
