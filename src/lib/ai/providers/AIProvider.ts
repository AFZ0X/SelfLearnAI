import { OpenAIProvider } from "./OpenAIProvider";
import { MockProvider } from "./MockProvider";
import { DeepSeekProvider } from "./DeepSeekProvider";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  generateChatResponse(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<{ content: string }>;
}

export function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "mock";

  switch (providerName) {
    case "openai":
      return new OpenAIProvider();
    case "deepseek":
      return new DeepSeekProvider();
    case "mock":
      return new MockProvider();
    default:
      throw new Error(
        `Unknown AI provider: ${providerName}. Set AI_PROVIDER to "openai", "deepseek", or "mock".`
      );
  }
}
