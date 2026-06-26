import { prisma } from "@/lib/db/prisma";

export interface MemoryConflictRecord {
  oldId: string;
  newId: string;
  key: string;
  oldValue: string;
  newValue: string;
  resolved: boolean;
}

export class MemoryConflictResolver {
  async resolve(
    userId: string,
    key: string,
    newMemoryId: string
  ): Promise<MemoryConflictRecord | null> {
    const existingActive = await prisma.memory.findFirst({
      where: {
        userId,
        memoryKey: key,
        status: "ACTIVE",
        id: { not: newMemoryId },
      },
      select: { id: true, text: true },
    });

    if (!existingActive) return null;

    await prisma.memory.update({
      where: { id: existingActive.id },
      data: {
        status: "SUPERSEDED",
        supersededById: newMemoryId,
        confidence: 0.1,
      },
    });

    return {
      oldId: existingActive.id,
      newId: newMemoryId,
      key,
      oldValue: existingActive.text,
      newValue: "",
      resolved: true,
    };
  }

  async supersedeAllByKey(userId: string, key: string): Promise<number> {
    const result = await prisma.memory.updateMany({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      data: { status: "SUPERSEDED", confidence: 0.1 },
    });
    return result.count;
  }

  async getActive(userId: string, key: string): Promise<{ id: string; text: string } | null> {
    const memory = await prisma.memory.findFirst({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: { id: true, text: true },
      orderBy: { updatedAt: "desc" },
    });
    return memory;
  }

  async getAllActive(userId: string): Promise<{ key: string; value: string }[]> {
    const memories = await prisma.memory.findMany({
      where: { userId, memoryKey: { not: null }, status: "ACTIVE" },
      select: { memoryKey: true, text: true },
      orderBy: { updatedAt: "desc" },
    });
    return memories
      .filter((m) => m.memoryKey)
      .map((m) => ({ key: m.memoryKey!, value: m.text }));
  }
}
