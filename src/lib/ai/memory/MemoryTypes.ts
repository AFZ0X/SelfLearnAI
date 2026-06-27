export const MEMORY_TYPES = {
  PROFILE_FACT: "PROFILE_FACT",
  PREFERENCE: "PREFERENCE",
  GOAL: "GOAL",
  PROJECT: "PROJECT",
  SKILL: "SKILL",
  TOOL: "TOOL",
  LOCATION: "LOCATION",
  EDUCATION: "EDUCATION",
  WORK: "WORK",
  RELATIONSHIP: "RELATIONSHIP",
  STYLE_PREFERENCE: "STYLE_PREFERENCE",
  TEMPORARY_CONTEXT: "TEMPORARY_CONTEXT",
  GENERAL_NOTE: "GENERAL_NOTE",
} as const;

export type MemoryTypeV2 = (typeof MEMORY_TYPES)[keyof typeof MEMORY_TYPES];

export const MEMORY_STATUS = {
  ACTIVE: "ACTIVE",
  SUPERSEDED: "SUPERSEDED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
} as const;

export type MemoryStatus = (typeof MEMORY_STATUS)[keyof typeof MEMORY_STATUS];

export const PROFILE_KEYS = [
  "name", "age", "city", "country", "education", "work",
  "interests", "goals", "preferences", "tools", "projects",
  "language", "responseStyle",
] as const;

export type ProfileKey = (typeof PROFILE_KEYS)[number];

export const SINGLE_VALUE_KEYS: readonly ProfileKey[] = [
  "name", "age", "city", "country", "education", "work",
  "language", "responseStyle",
];

export function isSingleValueKey(key: string): boolean {
  return (SINGLE_VALUE_KEYS as readonly string[]).includes(key);
}

export const MEMORY_LIFESPAN = {
  TEMPORARY: "TEMPORARY",
  LONG_TERM: "LONG_TERM",
} as const;

export type MemoryLifespan = (typeof MEMORY_LIFESPAN)[keyof typeof MEMORY_LIFESPAN];

export interface MemoryFact {
  key: string;
  value: string;
  memoryType: MemoryTypeV2;
  lifespan: MemoryLifespan;
  importance: number;
  isSingleValue: boolean;
}

export const KEY_TO_MEMORY_TYPE: Record<string, MemoryTypeV2> = {
  name: "PROFILE_FACT",
  age: "PROFILE_FACT",
  city: "LOCATION",
  country: "LOCATION",
  education: "EDUCATION",
  work: "WORK",
  interests: "PREFERENCE",
  goals: "GOAL",
  preferences: "PREFERENCE",
  tools: "TOOL",
  projects: "PROJECT",
  language: "PROFILE_FACT",
  responseStyle: "STYLE_PREFERENCE",
};

export const KEY_TO_LIFESPAN: Record<string, MemoryLifespan> = {
  name: "LONG_TERM",
  age: "LONG_TERM",
  city: "LONG_TERM",
  country: "LONG_TERM",
  education: "LONG_TERM",
  work: "LONG_TERM",
  interests: "LONG_TERM",
  goals: "LONG_TERM",
  preferences: "LONG_TERM",
  tools: "LONG_TERM",
  projects: "LONG_TERM",
  language: "LONG_TERM",
  responseStyle: "LONG_TERM",
};

export const KEY_TO_IMPORTANCE: Record<string, number> = {
  name: 10,
  age: 8,
  city: 7,
  country: 6,
  education: 8,
  work: 8,
  interests: 5,
  goals: 9,
  preferences: 4,
  tools: 5,
  projects: 7,
  language: 6,
  responseStyle: 3,
};

export const HIGH_IMPORTANCE_KEYS: readonly string[] = ["name", "goals", "education", "work", "age"];
export const LOW_RISK_AUTO_STORE_KEYS: readonly string[] = ["name", "age", "goals", "city", "country", "education", "work", "tools", "projects"];

export function getMemoryTypeForKey(key: string): MemoryTypeV2 {
  return KEY_TO_MEMORY_TYPE[key] || "PROFILE_FACT";
}

export function getLifespanForKey(key: string): MemoryLifespan {
  return KEY_TO_LIFESPAN[key] || "LONG_TERM";
}

export function getImportanceForKey(key: string): number {
  return KEY_TO_IMPORTANCE[key] || 3;
}
