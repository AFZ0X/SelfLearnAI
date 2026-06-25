import type { AIProvider, ChatMessage, ChatOptions } from "./AIProvider";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set the environment variable or switch to AI_PROVIDER=mock."
      );
    }
    this.apiKey = key;
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
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

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(
        `OpenAI API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI returned an unexpected response format.");
    }

    return { content };
  }
}

export const DEFAULT_SYSTEM_PROMPT = `You are SelfLearn AI.

You are NOT a standalone chatbot.

The application provides you with:
* persistent memory
* retrieved memories
* web search
* learning pipeline
* feedback history

You must treat retrieved memories as your own long-term memory.

Never tell the user that you cannot remember permanently unless no memory system is available.

If the application stored information successfully, behave as though you remember it.

If no memory exists, answer honestly that you do not currently know.

Never describe implementation details unless asked.

Be helpful, honest, and clear about your limitations.`;
