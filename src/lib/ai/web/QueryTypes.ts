export type QueryType =
  | "WEATHER"
  | "NEWS"
  | "VERSION"
  | "SPORTS_RESULT"
  | "COMPANY_INFO"
  | "GENERAL";

export interface QueryClassification {
  type: QueryType;
  isTimeSensitive: boolean;
  needsOfficialSource: boolean;
  maxSourceAgeDays: number;
  requiresExactDate: boolean;
}

const WEATHER_PATTERNS = [
  /\b(weather|temperature|forecast|طقس|حرارة|درجة\s*الحرارة|الطقس|الأرصاد)\b/i,
  /\b(today|now|current|اليوم|الآن|حاليا|الحالي)\b/i,
];

const NEWS_PATTERNS = [
  /\b(news|أخبار|آخر|مستجدات|جديد)\b/i,
  /\b(today|اليوم|هذا\s+الشهر|هذا\s+الأسبوع)\b/i,
];

const VERSION_PATTERNS = [
  /\b(version|release|latest|update|إصدار|آخر\s+إصدار|نسخة|تحديث)\b/i,
  /\b(next\.?js|react|node|npm|angular|vue)\b/i,
];

const SPORTS_PATTERNS = [
  /\b(match|result|score|game|مباراة|نتيجة|فوز|خسارة|تعادل|هدف)\b/i,
  /\b(cup|world\s+cup|tournament|league|كأس|دوري|بطولة)\b/i,
];

const COMPANY_PATTERNS = [
  /\b(aramco|أرامكو|saudi\s+aramco)\b/i,
  /\b(stc|sab|sabb|alrajhi|الراجحي)\b/i,
  /\b(program|training|internship|برنامج|تدرج|تدريب|itc)\b/i,
];

export function classifyQuery(query: string): QueryClassification {
  if (!query?.trim()) {
    return { type: "GENERAL", isTimeSensitive: false, needsOfficialSource: false, maxSourceAgeDays: 365, requiresExactDate: false };
  }

  const weatherScore = countPatternMatches(query, WEATHER_PATTERNS);
  const newsScore = countPatternMatches(query, NEWS_PATTERNS);
  const versionScore = countPatternMatches(query, VERSION_PATTERNS);
  const sportsScore = countPatternMatches(query, SPORTS_PATTERNS);
  const companyScore = countPatternMatches(query, COMPANY_PATTERNS);

  const scores = [
    { type: "WEATHER" as QueryType, score: weatherScore, timeSensitive: true, official: false, maxAge: 1, exactDate: true },
    { type: "NEWS" as QueryType, score: newsScore, timeSensitive: true, official: false, maxAge: 1, exactDate: true },
    { type: "VERSION" as QueryType, score: versionScore, timeSensitive: false, official: true, maxAge: 90, exactDate: false },
    { type: "SPORTS_RESULT" as QueryType, score: sportsScore, timeSensitive: true, official: true, maxAge: 7, exactDate: true },
    { type: "COMPANY_INFO" as QueryType, score: companyScore, timeSensitive: false, official: true, maxAge: 365, exactDate: false },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score === 0) {
    return { type: "GENERAL", isTimeSensitive: false, needsOfficialSource: false, maxSourceAgeDays: 365, requiresExactDate: false };
  }

  return {
    type: best.type,
    isTimeSensitive: best.timeSensitive,
    needsOfficialSource: best.official,
    maxSourceAgeDays: best.maxAge,
    requiresExactDate: best.exactDate,
  };
}

function countPatternMatches(query: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    const matches = query.match(p);
    if (matches) count += matches.length;
  }
  return count;
}
