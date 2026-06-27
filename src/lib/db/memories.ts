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
  memoryKey: string | null;
  status: string;
  supersededById: string | null;
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
  memoryKey?: string;
  status?: string;
  supersededById?: string;
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

export interface ListMemoriesOptions {
  page?: number;
  limit?: number;
  status?: string;
  memoryKey?: string;
}

export interface PaginatedMemories {
  memories: MemoryResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listMemories(userId: string, options: ListMemoriesOptions = {}): Promise<PaginatedMemories> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (options.status) where.status = options.status;
  if (options.memoryKey) where.memoryKey = options.memoryKey;

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
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
        memoryKey: true,
        status: true,
        supersededById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.memory.count({ where }),
  ]);

  return { memories, total, page, totalPages: Math.ceil(total / limit) };
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
      memoryKey: data.memoryKey?.trim() || null,
      status: data.status || "ACTIVE",
      supersededById: data.supersededById || null,
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
      memoryKey: true,
      status: true,
      supersededById: true,
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
      memoryKey: true,
      status: true,
      supersededById: true,
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
  try {
    const result = await prisma.memory.deleteMany({
      where: { id: memoryId, userId },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}
