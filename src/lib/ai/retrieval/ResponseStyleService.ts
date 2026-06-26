export type ResponseMode = "SHORT" | "NORMAL" | "DETAILED" | "ACTION_ONLY";

export interface StyleResult {
  mode: ResponseMode;
  reason?: string;
  userWantsShort: boolean;
  userWantsDetailed: boolean;
  userWantsAction: boolean;
}

const SHORT_PATTERNS = [
  /اختصر/i,
  /باختصار/i,
  /الزبدة/i,
  /المختصر/i,
  /بدون\s+شرح/i,
  /عطيني\s+النتيجة/i,
  /quick/i,
  /short/i,
  /concise/i,
  /بسرعة/i,
  /خلاصة/i,
  /موجز/i,
  /باختصار شديد/i,
];

const DETAILED_PATTERNS = [
  /اشرح/i,
  /بالتفصيل/i,
  /خطوة\s+بخطوة/i,
  /علمني/i,
  /ليه/i,
  /why/i,
  /explain/i,
  /detailed/i,
  /how\s+(does|do|can|is|are|to)/i,
  /what\s+is\s+the\s+difference/i,
  /how\s+it\s+works/i,
  /how\s+to/i,
  /tell\s+me\s+more/i,
  /elaborate/i,
  /in\s+detail/i,
  /step\s+by\s+step/i,
  /full\s+explanation/i,
  /فصل/i,
  /فصلي/i,
  /شرح\s+مفصل/i,
  /بالأمثلة/i,
  /بأمثلة/i,
];

const ACTION_PATTERNS = [
  /وش\s+اسوي/i,
  /عطيني\s+الأوامر/i,
  /حلها/i,
  /fix/i,
  /command/i,
  /steps/i,
  /terminal/i,
  /how\s+to\s+fix/i,
  /what\s+should\s+i\s+(do|run|type)/i,
  /give\s+me\s+(the\s+)?(command|commands)/i,
  /اعطيني\s+الأمر/i,
  /اعطيني\s+الأوامر/i,
  /كيف\s+احل/i,
  /كيف\s+أصلح/i,
  /شو\s+الحل/i,
  /ماذا\s+أفعل/i,
];

export class ResponseStyleService {
  detectStyle(query: string, preference?: string): StyleResult {
    const text = query || "";

    const userWantsShort = SHORT_PATTERNS.some((p) => p.test(text));
    const userWantsDetailed = DETAILED_PATTERNS.some((p) => p.test(text));
    const userWantsAction = ACTION_PATTERNS.some((p) => p.test(text));

    if (userWantsAction) {
      return {
        mode: "ACTION_ONLY",
        reason: "Action request detected",
        userWantsShort,
        userWantsDetailed,
        userWantsAction,
      };
    }

    if (userWantsDetailed) {
      return {
        mode: "DETAILED",
        reason: "Detailed explanation requested",
        userWantsShort,
        userWantsDetailed,
        userWantsAction,
      };
    }

    if (preference === "DETAILED") {
      return {
        mode: "DETAILED",
        reason: "User preference: DETAILED",
        userWantsShort,
        userWantsDetailed,
        userWantsAction,
      };
    }

    if (preference === "NORMAL") {
      return {
        mode: "NORMAL",
        reason: "User preference: NORMAL",
        userWantsShort,
        userWantsDetailed,
        userWantsAction,
      };
    }

    if (userWantsShort) {
      return {
        mode: "SHORT",
        reason: "Short answer requested",
        userWantsShort,
        userWantsDetailed,
        userWantsAction,
      };
    }

    return {
      mode: "SHORT",
      reason: "Default: concise",
      userWantsShort,
      userWantsDetailed,
      userWantsAction,
    };
  }

  buildStyleBlock(mode: ResponseMode, isWebSearch: boolean, hasWeakEvidence: boolean): string {
    const blocks: string[] = [];

    blocks.push("RESPONSE STYLE — FAILURE TO FOLLOW IS A BUG:");

    switch (mode) {
      case "SHORT":
        blocks.push("- Answer in 1–5 lines. Default to concise.");
        blocks.push("- Start with the answer directly. No introductions.");
        blocks.push("- Use 1–4 short bullet points when useful, not long paragraphs.");
        blocks.push("- Avoid: 'بناءً على المعلومات المتوفرة', 'يمكنني مساعدتك', 'إذا كنت تريد', 'من المهم الإشارة'.");
        blocks.push("- Do not explain the search process or your reasoning.");
        blocks.push("- Do not ask follow-up questions unless critical.");
        blocks.push("- Keep citations compact: [1], [2] next to claims.");
        break;

      case "NORMAL":
        blocks.push("- Answer with balanced detail. A few sentences per point.");
        blocks.push("- Start with the key answer, then add brief context if needed.");
        break;

      case "DETAILED":
        blocks.push("- The user asked for detailed explanation. Expand fully.");
        blocks.push("- Explain step by step if relevant.");
        blocks.push("- Include examples, reasoning, and background.");
        blocks.push("- You can use longer paragraphs and bullet lists.");
        break;

      case "ACTION_ONLY":
        blocks.push("- The user wants action steps only.");
        blocks.push("- Give exact commands, steps, or instructions. No theory.");
        blocks.push("- Start with the first action immediately.");
        blocks.push("- Use numbered steps for commands.");
        break;
    }

    if (isWebSearch && !hasWeakEvidence) {
      blocks.push("- You have web evidence. Answer from it directly. No caveats.");
    }

    if (hasWeakEvidence) {
      blocks.push("- Evidence quality is limited. Acknowledge briefly if uncertain.");
    }

    blocks.push("- Use the user's language (Arabic or English).");
    blocks.push("- If Arabic: use natural, direct, everyday Arabic. Not formal/translated.");

    return blocks.join("\n");
  }
}
