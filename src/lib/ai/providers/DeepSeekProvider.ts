import type { AIProvider, ChatMessage, ChatOptions } from "./AIProvider";
import { DEFAULT_SYSTEM_PROMPT } from "./OpenAIProvider";

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error(
        "DEEPSEEK_API_KEY is not configured. Set the environment variable or switch to AI_PROVIDER=mock."
      );
    }
    this.apiKey = key;
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    this.baseUrl =
      (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
        /\/+$/,
        ""
      ) + "/chat/completions";
  }

  async generateChatResponse(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<{ content: string }> {
    const systemPrompt = options?.system || DEFAULT_SYSTEM_PROMPT;

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(
        `DeepSeek API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("DeepSeek returned an unexpected response format.");
    }

    return { content };
  }
}
