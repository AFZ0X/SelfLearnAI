import type { AIProvider, ChatMessage, ChatOptions } from "./AIProvider";

export class MockProvider implements AIProvider {
  async generateChatResponse(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<{ content: string }> {
    void options;
    const lastMessage = messages[messages.length - 1];

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      content: `Hello! You said: "${lastMessage?.content || "..."}"

I am running in **mock mode** — no real AI provider is connected.

To connect a real AI, set:
- \`AI_PROVIDER=openai\`
- \`OPENAI_API_KEY=your-key-here\`
- \`OPENAI_MODEL=gpt-4o-mini\` (optional)

Until then, I can only echo your messages back.`,
    };
  }
}
