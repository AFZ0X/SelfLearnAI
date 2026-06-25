import { prisma } from "./prisma";

export async function createMessage(
  conversationId: string,
  role: string,
  content: string
) {
  return prisma.message.create({
    data: { conversationId, role, content },
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });
}
