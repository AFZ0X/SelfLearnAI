import { prisma } from "@/lib/db/prisma";

export interface DedupResult {
  deduplicated: boolean;
  keptId: string;
  removedCount: number;
}

export class MemoryDeduplicationService {
  async findDuplicate(userId: string, key: string, value: string): Promise<{ id: string } | null> {
    return prisma.memory.findFirst({
      where: {
        userId,
        memoryKey: key,
        status: "ACTIVE",
        text: value,
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async deduplicateOnSave(
    userId: string,
    key: string,
    value: string
  ): Promise<DedupResult | null> {
    const existing = await this.findDuplicate(userId, key, value);
    if (!existing) return null;

    await prisma.memory.update({
      where: { id: existing.id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
        updatedAt: new Date(),
        confidence: { increment: 0.05 },
      },
    });

    return {
      deduplicated: true,
      keptId: existing.id,
      removedCount: 0,
    };
  }

  async cleanOrphans(userId: string, key: string): Promise<number> {
    const actives = await prisma.memory.findMany({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: { id: true, text: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    if (actives.length <= 1) return 0;

    const [, ...orphans] = actives;
    let count = 0;
    for (const orphan of orphans) {
      await prisma.memory.update({
        where: { id: orphan.id },
        data: { status: "SUPERSEDED", confidence: 0.1 },
      });
      count++;
    }
    return count;
  }
}
