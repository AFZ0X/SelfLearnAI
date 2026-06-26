export type ProfileKey =
  | "name"
  | "age"
  | "city"
  | "location"
  | "job"
  | "education"
  | "goal"
  | "interests"
  | "preferences"
  | "tools"
  | "projects"
  | "nickname";

export interface ProfileFact {
  key: ProfileKey;
  value: string;
  text: string;
  confidence: number;
}

export interface ProfileQuery {
  key: ProfileKey;
  text: string;
}

const FACT_PATTERNS: { pattern: RegExp; key: ProfileKey; confidence: number }[] = [
  { pattern: /اسمي\s+الكامل\s+(.+)/i, key: "name", confidence: 0.95 },
  { pattern: /اسمي\s+(.+)/i, key: "name", confidence: 0.95 },
  { pattern: /my name is\s+(.+)/i, key: "name", confidence: 0.95 },
  { pattern: /نادني\s+(.+)/i, key: "nickname", confidence: 0.9 },
  { pattern: /ناديني\s+(.+)/i, key: "nickname", confidence: 0.9 },
  { pattern: /call me\s+(.+)/i, key: "nickname", confidence: 0.9 },
  { pattern: /أنا\s+عمري\s+(\d+)/i, key: "age", confidence: 0.9 },
  { pattern: /عمري\s+هو\s+(\d+)/i, key: "age", confidence: 0.95 },
  { pattern: /عمري\s+(\d+)/i, key: "age", confidence: 0.95 },
  { pattern: /اقولك\s+عمري\s+(?:هو\s+)?(\d+)/i, key: "age", confidence: 0.9 },
  { pattern: /i(?:'| a)?m\s+(\d+)\s*(?:years?\s*old|y\.?o\.?)/i, key: "age", confidence: 0.95 },
  { pattern: /i(?:'| a)?m\s+(\d+)\s*$/i, key: "age", confidence: 0.85 },
  { pattern: /my age is\s+(\d+)/i, key: "age", confidence: 0.95 },
  { pattern: /my\s+age\s+(\d+)/i, key: "age", confidence: 0.9 },
  { pattern: /أنا\s+(.+)/i, key: "name", confidence: 0.7 },
  { pattern: /i(?:'| a)?m\s+([a-zA-Z]+)/i, key: "name", confidence: 0.7 },

  { pattern: /ساكن\s+في\s+(.+)/i, key: "city", confidence: 0.9 },
  { pattern: /ساكن\s+(.+)/i, key: "city", confidence: 0.85 },
  { pattern: /أنا\s+من\s+(.+)/i, key: "city", confidence: 0.8 },
  { pattern: /أسكن\s+في\s+(.+)/i, key: "city", confidence: 0.9 },
  { pattern: /i live in\s+(.+)/i, key: "location", confidence: 0.9 },
  { pattern: /i(?:'| a)?m from\s+(.+)/i, key: "location", confidence: 0.85 },

  { pattern: /أحب\s+(.+)/i, key: "interests", confidence: 0.85 },
  { pattern: /أعشق\s+(.+)/i, key: "interests", confidence: 0.8 },
  { pattern: /i(?:'| a)?m? (?:interested in|into)\s+(.+)/i, key: "interests", confidence: 0.8 },

  { pattern: /هدفي\s+(\S+(?:\s+\S+){0,10})/i, key: "goal", confidence: 0.9 },
  { pattern: /my goal is\s+(.+)/i, key: "goal", confidence: 0.9 },
  { pattern: /i want to\s+(.+)/i, key: "goal", confidence: 0.7 },

  { pattern: /أشتغل\s+(?:في|بـ|كـ)\s+(.+)/i, key: "job", confidence: 0.85 },
  { pattern: /أدرس\s+(.+)/i, key: "education", confidence: 0.85 },
  { pattern: /i work as\s+(.+)/i, key: "job", confidence: 0.9 },
  { pattern: /i study\s+(.+)/i, key: "education", confidence: 0.85 },
  { pattern: /i(?:'| a)?m (?:a|an)\s+(.+)/i, key: "job", confidence: 0.7 },

  { pattern: /أفضل\s+(.+)/i, key: "preferences", confidence: 0.8 },
  { pattern: /i prefer\s+(.+)/i, key: "preferences", confidence: 0.8 },
  { pattern: /i like\s+(.+)/i, key: "preferences", confidence: 0.7 },

  { pattern: /أستخدم\s+(.+)/i, key: "tools", confidence: 0.75 },
  { pattern: /i use\s+(.+)/i, key: "tools", confidence: 0.75 },

  { pattern: /project\s+(?:is|name)\s+(.+)/i, key: "projects", confidence: 0.8 },
];

const QUERY_PATTERNS: { pattern: RegExp; key: ProfileKey }[] = [
  { pattern: /وش\s+اسمي/i, key: "name" },
  { pattern: /ما\s+اسمي/i, key: "name" },
  { pattern: /شو\s+اسمي/i, key: "name" },
  { pattern: /ايش\s+اسمي/i, key: "name" },
  { pattern: /كيف\s+اسمي/i, key: "name" },
  { pattern: /what(?:'s| is)\s+my\s+name/i, key: "name" },
  { pattern: /do\s+you\s+(?:know|remember)\s+my\s+name/i, key: "name" },
  { pattern: /what\s+do\s+you\s+call\s+me/i, key: "name" },

  { pattern: /كم\s+عمري/i, key: "age" },
  { pattern: /عمر\s+كم/i, key: "age" },
  { pattern: /how\s+old\s+am\s+i/i, key: "age" },
  { pattern: /what(?:'s| is)\s+my\s+age/i, key: "age" },

  { pattern: /وين\s+ساكن/i, key: "city" },
  { pattern: /أين\s+أسكن/i, key: "city" },
  { pattern: /where\s+do\s+i\s+live/i, key: "location" },

  { pattern: /وش\s+أحب/i, key: "interests" },
  { pattern: /وش\s+أعشق/i, key: "interests" },
  { pattern: /what\s+do\s+i\s+like/i, key: "interests" },
  { pattern: /what\s+are\s+my\s+hobbies/i, key: "interests" },

  { pattern: /وش\s+هدفي/i, key: "goal" },
  { pattern: /ما\s+هدفي/i, key: "goal" },
  { pattern: /what(?:'s| is)\s+my\s+goal/i, key: "goal" },

  { pattern: /وش\s+أشتغل/i, key: "job" },
  { pattern: /what(?:'s| is)\s+my\s+job/i, key: "job" },
  { pattern: /what\s+do\s+i\s+do\s+for\s+work/i, key: "job" },
];

export class ProfileFactExtractor {
  extract(text: string): ProfileFact | null {
    if (!text?.trim()) return null;
    for (const rule of FACT_PATTERNS) {
      const match = text.match(rule.pattern);
      if (match && match[1]?.trim()) {
        const value = match[1].trim();
        if (value.length > 100 || value.length < 1) continue;
        return {
          key: rule.key,
          value,
          text: match[0].trim(),
          confidence: rule.confidence,
        };
      }
    }
    return null;
  }

  detectQuery(text: string): ProfileQuery | null {
    if (!text?.trim()) return null;
    for (const q of QUERY_PATTERNS) {
      if (q.pattern.test(text)) {
        return { key: q.key, text: text.trim() };
      }
    }
    return null;
  }
}
