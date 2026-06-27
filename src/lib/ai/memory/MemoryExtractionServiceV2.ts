import { ProfileFactExtractor, type ProfileFact, type ProfileKey } from "./ProfileFactExtractor";
import { NameExtractorService } from "./NameExtractorService";
import {
  MEMORY_TYPES,
  LOW_RISK_AUTO_STORE_KEYS,
  isSingleValueKey,
  type MemoryTypeV2,
} from "./MemoryTypes";

export interface ExtractedMemory {
  key: string;
  value: string;
  text: string;
  memoryType: MemoryTypeV2;
  confidence: number;
  isSingleValue: boolean;
  canAutoStore: boolean;
  source: string;
}

const EXPLICIT_SAVE_PATTERNS = [
  /احفظ\s+(هذي|هذه|هذا)?\s*(.+)/i,
  /تذكر\s+(هذا|هذي|هذه)?\s*(.+)/i,
  /خزن\s+(هذا|هذي|هذه)?\s*(.+)/i,
  /خل\s+في\s+بالك\s+(.+)/i,
  /لا\s+تنسى\s+(.+)/i,
  /remember\s+(this|that)?\s*(.+)/i,
  /save\s+(this|that)?\s*(.+)/i,
  /store\s+(this|that)?\s*(.+)/i,
  /keep\s+(this|that)?\s*(.+)/i,
  /memorize\s+(this|that)?\s*(.+)/i,
];

const IGNORE_MEMORY_PATTERNS = [
  /بدون\s+(استخدام\s+)?الذاكرة/i,
  /دون\s+(استخدام\s+)?الذاكرة/i,
  /ignore\s+(your\s+)?memory/i,
  /without\s+(using\s+)?memory/i,
  /forget\s+(what\s+)?(you\s+)?(know|remember)/i,
  /لا\s+تستخدم\s+الذاكرة/i,
];

const TEMPORARY_CONTEXT_PATTERNS = [
  /الحين\s+أنا\s+(.+)/i,
  /currently\s+(i(?:'| a)?m|working\s+on)\s+(.+)/i,
  /right\s+now\s+(i(?:'| a)?m)\s+(.+)/i,
];

export class MemoryExtractionServiceV2 {
  private profileExtractor = new ProfileFactExtractor();
  private nameExtractor = new NameExtractorService();

  extract(text: string): ExtractedMemory | null {
    if (!text?.trim()) return null;

    const fact = this.profileExtractor.extract(text);
    if (fact) {
      return this.toExtractedMemory(fact);
    }

    const tempMatch = this.extractTemporaryContext(text);
    if (tempMatch) return tempMatch;

    return null;
  }

  isIgnoreMemoryQuery(text: string): boolean {
    return IGNORE_MEMORY_PATTERNS.some((p) => p.test(text));
  }

  isExplicitSave(text: string): boolean {
    return EXPLICIT_SAVE_PATTERNS.some((p) => p.test(text));
  }

  isProfileQuery(text: string): boolean {
    return this.profileExtractor.detectQuery(text) !== null || this.nameExtractor.isNameQuery(text);
  }

  extractExplicitSaveContent(text: string): string | null {
    if (!text?.trim()) return null;
    for (const pattern of EXPLICIT_SAVE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const content = match[match.length - 1]?.trim();
        if (content && content.length > 1) return content;
      }
    }
    return null;
  }

  private extractTemporaryContext(text: string): ExtractedMemory | null {
    for (const pattern of TEMPORARY_CONTEXT_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        return {
          key: "current_context",
          value: match[1].trim(),
          text: text.trim(),
          memoryType: MEMORY_TYPES.TEMPORARY_CONTEXT,
          confidence: 0.6,
          isSingleValue: false,
          canAutoStore: false,
          source: "temporary_context",
        };
      }
    }
    return null;
  }

  private toExtractedMemory(fact: ProfileFact): ExtractedMemory {
    return {
      key: fact.key,
      value: fact.value,
      text: fact.text,
      memoryType: this.getMemoryTypeForKey(fact.key),
      confidence: fact.confidence,
      isSingleValue: isSingleValueKey(fact.key),
      canAutoStore: LOW_RISK_AUTO_STORE_KEYS.includes(fact.key),
      source: "chat_extraction",
    };
  }

  private getMemoryTypeForKey(key: string): MemoryTypeV2 {
    const mapping: Record<string, MemoryTypeV2> = {
      name: "PROFILE_FACT",
      age: "PROFILE_FACT",
      city: "LOCATION",
      country: "LOCATION",
      location: "LOCATION",
      education: "EDUCATION",
      job: "WORK",
      work: "WORK",
      interests: "PREFERENCE",
      goal: "GOAL",
      goals: "GOAL",
      preferences: "PREFERENCE",
      tools: "TOOL",
      projects: "PROJECT",
      nickname: "PROFILE_FACT",
    };
    return mapping[key] || "GENERAL_NOTE";
  }
}
