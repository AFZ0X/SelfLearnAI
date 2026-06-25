import { OpenAIEmbeddingProvider } from "./OpenAIEmbeddingProvider";
import { MockEmbeddingProvider } from "./MockEmbeddingProvider";

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const providerName = process.env.EMBEDDING_PROVIDER || "mock";

  switch (providerName) {
    case "openai":
      return new OpenAIEmbeddingProvider();
    case "mock":
      return new MockEmbeddingProvider();
    default:
      throw new Error(
        `Unknown embedding provider: ${providerName}. Set EMBEDDING_PROVIDER to "openai" or "mock".`
      );
  }
}
