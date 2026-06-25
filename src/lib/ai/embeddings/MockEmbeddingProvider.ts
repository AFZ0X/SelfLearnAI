import type { EmbeddingProvider } from "./EmbeddingProvider";

export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimensions: number;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const seed = Math.abs(hash);
    const embedding: number[] = [];

    for (let i = 0; i < this.dimensions; i++) {
      const val = Math.sin(seed + i * 0.1) * 10000;
      const normalized = Math.max(-1, Math.min(1, val - Math.floor(val / 1) * 1));
      embedding.push(parseFloat(normalized.toFixed(6)));
    }

    return embedding;
  }
}
