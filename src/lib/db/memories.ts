import { prisma } from "./prisma";
import type { MemoryType } from "../../../generated/prisma/enums";

const MEMORY_TEXT_MAX_LENGTH = 5000;

export interface MemoryResponse {
  id: string;
  userId: string;
  type: string;
  text: string;
  summary: string | null;
  source: string | null;
  confidence: number | null;
  visibility: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryCreateData {
  type?: string;
  text: string;
  summary?: string;
  source?: string;
  confidence?: number;
  visibility?: string;
  tags?: string[];
}

export function validateMemoryText(text: string): string | null {
  if (typeof text !== "string" || text.trim().length === 0) {
    return "Memory text is required.";
  }
  if (text.length > MEMORY_TEXT_MAX_LENGTH) {
    return `Memory text must be ${MEMORY_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

const VALID_TYPES = ["USER", "PROJECT", "GENERAL", "WEB_RESEARCH"];

const SENSITIVE_PATTERNS = [
  /password/i,
  /api.?key/i,
  /secret/i,
  /private.?key/i,
  /token/i,
  /auth.?token/i,
  /bearer\s+\S+/i,
  /sk-[a-zA-Z0-9]{20,}/i,
];

function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export async function listMemories(userId: string): Promise<MemoryResponse[]> {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      type: true,
      text: true,
      summary: true,
      source: true,
      confidence: true,
      visibility: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createMemory(
  userId: string,
  data: MemoryCreateData
): Promise<MemoryResponse> {
  const textError = validateMemoryText(data.text);
  if (textError) {
    throw new Error(textError);
  }

  if (containsSensitiveData(data.text)) {
    throw new Error(
      "Memory text appears to contain sensitive data (API keys, passwords, tokens). Please remove it and try again."
    );
  }

  const type = data.type && VALID_TYPES.includes(data.type) ? data.type : "USER";

  return prisma.memory.create({
    data: {
      userId,
      type: type as MemoryType,
      text: data.text.trim(),
      summary: data.summary?.trim() || null,
      source: data.source?.trim() || null,
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      visibility: data.visibility || "private",
      tags: Array.isArray(data.tags) ? data.tags : [],
    },
    select: {
      id: true,
      userId: true,
      type: true,
      text: true,
      summary: true,
      source: true,
      confidence: true,
      visibility: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getMemory(
  memoryId: string,
  userId: string
): Promise<MemoryResponse | null> {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    select: {
      id: true,
      userId: true,
      type: true,
      text: true,
      summary: true,
      source: true,
      confidence: true,
      visibility: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!memory || memory.userId !== userId) {
    return null;
  }

  return memory;
}

export async function deleteMemory(
  memoryId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.memory.findUnique({
    where: { id: memoryId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await prisma.memory.delete({ where: { id: memoryId } });
  return true;
}
