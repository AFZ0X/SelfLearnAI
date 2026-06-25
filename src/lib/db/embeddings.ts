import { prisma } from "./prisma";

export async function saveEmbedding(
  memoryId: string,
  embedding: number[],
  model: string
) {
  const dimensions = embedding.length;
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MemoryEmbedding" (id, "memoryId", embedding, model, dimensions, "createdAt")
     VALUES ($1, $2, $3::vector, $4, $5, NOW())
     ON CONFLICT ("memoryId") DO UPDATE SET embedding = $3::vector, model = $4, dimensions = $5`,
    crypto.randomUUID(),
    memoryId,
    vectorStr,
    model,
    dimensions
  );
}
