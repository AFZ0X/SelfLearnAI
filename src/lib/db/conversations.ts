import { prisma } from "./prisma";

export interface ConversationData {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
}

export async function listConversations(userId: string): Promise<ConversationData[]> {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    messageCount: r._count.messages,
  }));
}

export async function createConversation(
  userId: string,
  title?: string
): Promise<ConversationData> {
  return prisma.conversation.create({
    data: {
      userId,
      title: title || "New conversation",
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<{ conversation: ConversationData; messages: MessageData[] } | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          conversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation || conversation.userId !== userId) {
    return null;
  }

  return {
    conversation: {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages: conversation.messages,
  };
}

export async function updateConversation(
  conversationId: string,
  userId: string,
  data: { title?: string }
): Promise<ConversationData | null> {
  const existing = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data,
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await prisma.conversation.delete({ where: { id: conversationId } });
  return true;
}

export async function findEmptyConversation(
  userId: string
): Promise<ConversationData | null> {
  const conv = await prisma.conversation.findFirst({
    where: {
      userId,
      title: "New conversation",
      messages: { none: {} },
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  if (!conv) return null;
  return {
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messageCount: conv._count.messages,
  };
}
