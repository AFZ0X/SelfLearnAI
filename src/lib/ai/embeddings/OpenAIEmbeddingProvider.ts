import type { EmbeddingProvider } from "./EmbeddingProvider";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set the environment variable or switch to EMBEDDING_PROVIDER=mock."
      );
    }
    this.apiKey = key;
    this.model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(
        `OpenAI embedding API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error("OpenAI returned an unexpected embedding format.");
    }

    return embedding;
  }
}
