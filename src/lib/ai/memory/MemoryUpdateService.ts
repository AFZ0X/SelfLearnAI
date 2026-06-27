import { prisma } from "@/lib/db/prisma";
import { isSingleValueKey } from "./MemoryTypes";

export interface UpdateResult {
  updated: boolean;
  oldValue: string | null;
  newValue: string;
  superseded: boolean;
}

export class MemoryUpdateService {
  async updateFact(
    userId: string,
    key: string,
    newValue: string,
    memoryType: string,
    importance: number
  ): Promise<UpdateResult> {
    const existing = await prisma.memory.findFirst({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: { id: true, text: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!existing) {
      return { updated: false, oldValue: null, newValue, superseded: false };
    }

    if (existing.text === newValue) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      });
      return { updated: true, oldValue: existing.text, newValue, superseded: false };
    }

    if (isSingleValueKey(key)) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: { status: "SUPERSEDED", confidence: 0.1 },
      });
      return { updated: true, oldValue: existing.text, newValue, superseded: true };
    }

    return { updated: false, oldValue: existing.text, newValue, superseded: false };
  }

  async touch(memoryId: string): Promise<void> {
    await prisma.memory.update({
      where: { id: memoryId },
      data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
    });
  }

  async updateConfidence(memoryId: string, confidence: number): Promise<void> {
    await prisma.memory.update({
      where: { id: memoryId },
      data: { confidence },
    });
  }

  async archive(memoryId: string): Promise<void> {
    await prisma.memory.update({
      where: { id: memoryId },
      data: { status: "ARCHIVED" },
    });
  }

  async supersedeByKey(userId: string, key: string, excludeId?: string): Promise<number> {
    const where: Record<string, unknown> = { userId, memoryKey: key, status: "ACTIVE" };
    if (excludeId) where.id = { not: excludeId };

    const result = await prisma.memory.updateMany({
      where,
      data: { status: "SUPERSEDED", confidence: 0.1 },
    });
    return result.count;
  }
}
