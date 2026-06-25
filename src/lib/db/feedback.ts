import { prisma } from "./prisma";
import { SensitivityClassifier, isBlockedSensitivity } from "@/lib/ai/learning/SensitivityClassifier";

const classifier = new SensitivityClassifier();
const CORRECTION_MAX_LENGTH = 2000;

const VALID_TYPES = ["THUMBS_UP", "THUMBS_DOWN", "CORRECTION", "WRONG_ANSWER"] as const;
const VALID_REASONS = ["incorrect", "outdated", "irrelevant", "unsafe", "hallucinated", "ignored_memory", "bad_citation", "other"] as const;

type FeedbackType = (typeof VALID_TYPES)[number];
type FeedbackReason = (typeof VALID_REASONS)[number];

function ratingForType(type: FeedbackType): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  switch (type) {
    case "THUMBS_UP": return "POSITIVE";
    case "THUMBS_DOWN": return "NEGATIVE";
    case "WRONG_ANSWER": return "NEGATIVE";
    case "CORRECTION": return "NEUTRAL";
  }
}

export interface FeedbackCreateData {
  type: FeedbackType;
  conversationId: string;
  messageId: string;
  reason?: string;
  correction?: string;
}

export interface FeedbackUpdateData {
  type?: FeedbackType;
  reason?: string;
  correction?: string;
}

export interface FeedbackResponse {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  type: string;
  rating: string;
  reason: string | null;
  correction: string | null;
  createdAt: Date;
  updatedAt: Date;
  message?: {
    id: string;
    content: string;
    role: string;
    conversationId: string;
  };
}

function validateType(type: string): FeedbackType | null {
  if (VALID_TYPES.includes(type as FeedbackType)) return type as FeedbackType;
  return null;
}

function validateReason(reason: string): FeedbackReason | null {
  if (VALID_REASONS.includes(reason as FeedbackReason)) return reason as FeedbackReason;
  return null;
}

export async function createFeedback(
  userId: string,
  data: FeedbackCreateData
): Promise<FeedbackResponse> {
  const type = validateType(data.type);
  if (!type) throw new Error("Invalid feedback type.");

  if (type === "WRONG_ANSWER" && !data.reason) {
    throw new Error("Reason is required for wrong answer feedback.");
  }

  if (type === "CORRECTION") {
    if (!data.correction || data.correction.trim().length === 0) {
      throw new Error("Correction text is required for correction feedback.");
    }
    if (data.correction.length > CORRECTION_MAX_LENGTH) {
      throw new Error(`Correction must be ${CORRECTION_MAX_LENGTH} characters or fewer.`);
    }
    if (isBlockedSensitivity(classifier.classify(data.correction))) {
      throw new Error("Correction contains sensitive content and cannot be stored.");
    }
  }

  if (data.reason && type === "WRONG_ANSWER") {
    if (!validateReason(data.reason)) {
      throw new Error(`Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}`);
    }
    if (isBlockedSensitivity(classifier.classify(data.reason))) {
      throw new Error("Reason contains sensitive content and cannot be stored.");
    }
  }

  const rating = ratingForType(type);

  const existing = await prisma.feedback.findUnique({
    where: { userId_messageId: { userId, messageId: data.messageId } },
  });

  if (existing) {
    return prisma.feedback.update({
      where: { id: existing.id },
      data: {
        type,
        rating,
        reason: data.reason?.trim() || null,
        correction: data.correction?.trim() || null,
      },
      select: {
        id: true, userId: true, conversationId: true, messageId: true,
        type: true, rating: true, reason: true, correction: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  return prisma.feedback.create({
    data: {
      userId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      type,
      rating,
      reason: data.reason?.trim() || null,
      correction: data.correction?.trim() || null,
    },
    select: {
      id: true, userId: true, conversationId: true, messageId: true,
      type: true, rating: true, reason: true, correction: true,
      createdAt: true, updatedAt: true,
    },
  });
}

export async function listFeedback(
  userId: string,
  conversationId?: string
): Promise<FeedbackResponse[]> {
  const where: Record<string, unknown> = { userId };
  if (conversationId) {
    where.conversationId = conversationId;
  }
  return prisma.feedback.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, userId: true, conversationId: true, messageId: true,
      type: true, rating: true, reason: true, correction: true,
      createdAt: true, updatedAt: true,
      message: {
        select: { id: true, content: true, role: true, conversationId: true },
      },
    },
  });
}

export async function updateFeedback(
  feedbackId: string,
  userId: string,
  data: FeedbackUpdateData
): Promise<FeedbackResponse | null> {
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) return null;

  const updateData: Record<string, unknown> = {};

  if (data.type !== undefined) {
    const type = validateType(data.type);
    if (!type) throw new Error("Invalid feedback type.");
    updateData.type = type;
    updateData.rating = ratingForType(type);
  }

  if (data.reason !== undefined) {
    if (data.reason && !validateReason(data.reason)) {
      throw new Error(`Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}`);
    }
    if (data.reason && isBlockedSensitivity(classifier.classify(data.reason))) {
      throw new Error("Reason contains sensitive content.");
    }
    updateData.reason = data.reason?.trim() || null;
  }

  if (data.correction !== undefined) {
    if (data.correction && data.correction.length > CORRECTION_MAX_LENGTH) {
      throw new Error(`Correction must be ${CORRECTION_MAX_LENGTH} characters or fewer.`);
    }
    if (data.correction && isBlockedSensitivity(classifier.classify(data.correction))) {
      throw new Error("Correction contains sensitive content.");
    }
    updateData.correction = data.correction?.trim() || null;
  }

  return prisma.feedback.update({
    where: { id: feedbackId },
    data: updateData,
    select: {
      id: true, userId: true, conversationId: true, messageId: true,
      type: true, rating: true, reason: true, correction: true,
      createdAt: true, updatedAt: true,
    },
  });
}

export async function deleteFeedback(
  feedbackId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) return false;
  await prisma.feedback.delete({ where: { id: feedbackId } });
  return true;
}
