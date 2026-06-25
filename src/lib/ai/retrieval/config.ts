export interface RetrievalConfig {
  topK: number;
  similarityThreshold: number;
  maxMemoryContextChars: number;
  maxSingleMemoryChars: number;
}

export const retrievalConfig: RetrievalConfig = {
  topK: 5,
  similarityThreshold: 0.7,
  maxMemoryContextChars: 4000,
  maxSingleMemoryChars: 800,
};
