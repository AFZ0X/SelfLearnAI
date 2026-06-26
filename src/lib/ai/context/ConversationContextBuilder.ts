import { prisma } from "@/lib/db/prisma";
import type { ChatMessage } from "@/lib/ai/providers/AIProvider";

export interface ConversationContext {
  history: ChatMessage[];
  historyTruncated: boolean;
  totalHistoryChars: number;
}

export class ConversationContextBuilder {
  private maxMessages: number;

  constructor() {
    this.maxMessages = parseInt(process.env.CHAT_CONTEXT_MAX_MESSAGES || "20", 10);
    if (this.maxMessages < 2) this.maxMessages = 2;
    if (this.maxMessages > 100) this.maxMessages = 100;
  }

  async loadConversationHistory(
    conversationId: string,
    excludeMessageId?: string
  ): Promise<ConversationContext> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: this.maxMessages,
      select: { id: true, role: true, content: true },
    });

    const filtered = excludeMessageId
      ? messages.filter((m) => m.id !== excludeMessageId)
      : messages;

    const history: ChatMessage[] = filtered.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const totalHistoryChars = history.reduce((sum, m) => sum + m.content.length, 0);

    return {
      history,
      historyTruncated: false,
      totalHistoryChars,
    };
  }
}
