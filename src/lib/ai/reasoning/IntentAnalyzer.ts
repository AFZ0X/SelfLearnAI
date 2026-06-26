export type UserGoal =
  | "ASK_FACT"
  | "ASK_CURRENT"
  | "ASK_PERSONAL"
  | "ASK_ACTION"
  | "ASK_EXPLANATION"
  | "ASK_CODE"
  | "ASK_CREATIVE"
  | "ASK_SUMMARY"
  | "ASK_TRANSLATION"
  | "ASK_ADVICE"
  | "ASK_PLANNING"
  | "ASK_TROUBLESHOOT"
  | "GREETING"
  | "SAVE_MEMORY"
  | "CHANGE_SETTING"
  | "UNKNOWN";

export interface IntentResult {
  goal: UserGoal;
  language: "ar" | "en";
  urgency: "LOW" | "MEDIUM" | "HIGH";
  requiresFollowUpContext: boolean;
}

const EXPLANATION_PATTERNS = [
  /^(why|how|what\s+is|what\s+are|explain|describe|define)/i,
  /^((what|how|why)\s+does|what\s+is\s+the\s+difference)/i,
  /^(اشرح|عرفني|معنى|ما\s+هو|ما\s+هي|كيف\s+يعمل|ليه|لما)/i,
];

const CURRENT_PATTERNS = [
  /temperature|weather|current|today|news|latest|price|stock|score|result/i,
  /(now|right\s+now|today|هلا|الآن|الحين|اليوم|السعر|درجة\s+الحرارة|الطقس|النتيجة|الخبر|أخبار)/i,
];

const ACTION_PATTERNS = [
  /^(show|list|find|give|tell|search|bring|run|execute|open|start|create|make|build|generate|write|edit|update|delete|remove|install|set|configure)/i,
  /^(عطني|عطيني|ورني|ابحث|شوف|اطلع|فعل|شغل|حملي|حمل|افتح|أنشئ|اصنع|اكتب|عدل|حدث|احذف|نصب|ركب|اضبط)/i,
];

const CODE_PATTERNS = [
  /^(write|create|make|generate|implement|code|program|function|script)\s+(a\s+|an\s+)?(function|program|script|code|app|class|component|api)/i,
  /^(how\s+to\s+code|how\s+to\s+program|code\s+a|write\s+a\s+function|implement\s+a)/i,
  /^(ابرمج|اكتب\s+كود|كود|دالة|دالة|برنامج|سكريبت)/i,
];

const CREATIVE_PATTERNS = [
  /^(write|create|make|compose|draft)\s+(a\s+|an\s+)?(poem|story|song|joke|essay|article|blog|tweet|caption|description|tagline|slogan)/i,
  /^(اكتب|أنشئ|ألف|صمم)\s+(قصيدة|قصة|أغنية|نكتة|مقال|وصف|شعار)/i,
];

const SUMMARY_PATTERNS = [
  /^(summarize|summarise|sum up|brief|tl;?dr|خلاصة|لخص|موجز|باختصار|الزبدة)/i,
];

const TRANSLATION_PATTERNS = [
  /^(translate|ترجم)\s+/i,
  /^(how\s+do\s+you\s+say|what\s+is\s+the\s+(arabic|english)\s+(word|translation))/i,
];

const ADVICE_PATTERNS = [
  /^(should\s+i|what\s+should\s+io|advise|recommend|opinion|suggestion|what\s+do\s+you\s+think|what\s+would\s+you\s+(do|recommend))/i,
  /^(اش\s+رايك|وش\s+رأيك|تنصحني|شو\s+الحل|ايش\s+الحل)/i,
];

const PLANNING_PATTERNS = [
  /^(plan|planning|roadmap|strategy|outline|schedule|timeline|steps\s+to|process\s+for|طريقة|خطة|خطوات|مخطط)/i,
];

const TROUBLESHOOT_PATTERNS = [
  /(error|bug|issue|problem|fail|crash|not\s+working|broken|doesn'?t\s+work|server\s+error|500|404|exception|خطأ|مشكلة|عطل|لا\s+يعمل|bug|issue)/i,
  /(how\s+to\s+fix|how\s+to\s+resolve|how\s+to\s+solve|how\s+can\s+i\s+(fix|resolve)|help\s+me\s+(fix|resolve))/i,
  /(وش\s+اسوي|كيف\s+احل|كيف\s+أصلح|شو\s+الحل|مشكلة|عطل)/i,
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|yh|ya|مرحبا|اهلا|السلام|مساء|صباح|هاي|هلا)\b/i,
];

const SAVE_MEMORY_PATTERNS = [
  /احفظ\s+هذي|تذكر\s+هذا|خزن|save\s+this|remember\s+that/i,
];

const NAME_QUERY_PATTERNS = [
  /وش\s+اسمي/i,
  /ما\s+اسمي/i,
  /شو\s+اسمي/i,
  /ايش\s+اسمي/i,
  /what(?:'s| is)\s+my\s+name/i,
  /do\s+you\s+(?:know|remember)\s+my\s+name/i,
  /اسمي\s+/i,
  /نادني\s+/i,
  /ناديني\s+/i,
];

const PROFILE_QUERY_PATTERNS = [
  /كم\s+عمري/i,
  /عمر\s+كم/i,
  /how\s+old\s+am\s+i/i,
  /what(?:'s| is)\s+my\s+age/i,
  /وين\s+ساكن/i,
  /أين\s+أسكن/i,
  /where\s+do\s+i\s+live/i,
  /وش\s+أحب/i,
  /ما\s+هدفي/i,
  /وش\s+هدفي/i,
  /what(?:'s| is)\s+my\s+goal/i,
  /وش\s+أشتغل/i,
  /what(?:'s| is)\s+my\s+job/i,
];

const ARABIC_DETECT = /[\u0600-\u06FF]/;

export class IntentAnalyzer {
  analyze(text: string): IntentResult {
    const t = text?.trim() || "";
    const language = ARABIC_DETECT.test(t) ? "ar" : "en";

    if (!t) {
      return { goal: "UNKNOWN", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (SAVE_MEMORY_PATTERNS.some((p) => p.test(t))) {
      return { goal: "SAVE_MEMORY", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (NAME_QUERY_PATTERNS.some((p) => p.test(t)) || PROFILE_QUERY_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_PERSONAL", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (GREETING_PATTERNS.some((p) => p.test(t))) {
      return { goal: "GREETING", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (TROUBLESHOOT_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_TROUBLESHOOT", language, urgency: "HIGH", requiresFollowUpContext: true };
    }

    if (PLANNING_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_PLANNING", language, urgency: "MEDIUM", requiresFollowUpContext: false };
    }

    if (ADVICE_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_ADVICE", language, urgency: "MEDIUM", requiresFollowUpContext: true };
    }

    if (TRANSLATION_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_TRANSLATION", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (SUMMARY_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_SUMMARY", language, urgency: "MEDIUM", requiresFollowUpContext: false };
    }

    if (CREATIVE_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_CREATIVE", language, urgency: "LOW", requiresFollowUpContext: false };
    }

    if (CODE_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_CODE", language, urgency: "MEDIUM", requiresFollowUpContext: true };
    }

    if (EXPLANATION_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_EXPLANATION", language, urgency: "MEDIUM", requiresFollowUpContext: false };
    }

    if (ACTION_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_ACTION", language, urgency: "MEDIUM", requiresFollowUpContext: false };
    }

    if (CURRENT_PATTERNS.some((p) => p.test(t))) {
      return { goal: "ASK_CURRENT", language, urgency: "HIGH", requiresFollowUpContext: false };
    }

    return { goal: "ASK_FACT", language, urgency: "LOW", requiresFollowUpContext: false };
  }
}
