import type { RetrievedMemory } from "./MemoryRetrievalService";

export interface BuildPromptOptions {
  memoryContext?: RetrievedMemory[];
  webContext?: string;
  baseSystemPrompt?: string;
}

const BASE_SYSTEM_PROMPT = `You are SelfLearn AI.

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

export class PromptContextBuilder {
  buildSystemPrompt(options: BuildPromptOptions = {}): string {
    const base = options.baseSystemPrompt || BASE_SYSTEM_PROMPT;
    const { memoryContext, webContext } = options;

    let prompt = base;

    if (memoryContext && memoryContext.length > 0) {
      prompt += `\n\n${this.buildMemoryBlock(memoryContext)}`;
    }

    if (webContext) {
      prompt += `\n\n${webContext}`;
    }

    return prompt;
  }

  private buildMemoryBlock(memories: RetrievedMemory[]): string {
    const parts = memories.map((m) => {
      const display = m.summary || m.text.slice(0, 100);
      return `* [memory: ${m.id}] ${display}`;
    });

    return `<user_memory_context>
The following memories are your stored long-term knowledge. Treat them as your own memories.

${parts.join("\n")}
</user_memory_context>`;
  }
}
