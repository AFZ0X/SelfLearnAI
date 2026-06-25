import { prisma } from "@/lib/db/prisma";
import type { TraceStatus } from "../../../../generated/prisma/enums";
import type { Prisma } from "../../../../generated/prisma/client";

export interface TraceStepMetadata {
  messageLength?: number;
  hasConversationId?: boolean;
  intentType?: string;
  intentConfidence?: number;
  memoriesFound?: number;
  memoryUsed?: boolean;
  queryLength?: number;
  resultsCount?: number;
  searchTriggered?: boolean;
  searchReason?: string;
  pagesFetched?: number;
  totalChars?: number;
  summariesCount?: number;
  candidatesExtracted?: number;
  feedbackApplied?: boolean;
  memoryContextChars?: number;
  webContextChars?: number;
  provider?: string;
  responseTimeMs?: number;
  responseLength?: number;
  totalDurationMs?: number;
  stepsCount?: number;
}

export class ActivityTraceService {
  async startTrace(userId: string, conversationId?: string) {
    try {
      return await prisma.activityTrace.create({
        data: {
          userId,
          conversationId: conversationId || null,
          status: "RUNNING" as TraceStatus,
        },
      });
    } catch {
      return null;
    }
  }

  async startStep(traceId: string, stepName: string) {
    try {
      return await prisma.activityTraceStep.create({
        data: {
          traceId,
          stepName,
          status: "RUNNING" as TraceStatus,
        },
      });
    } catch {
      return null;
    }
  }

  async completeStep(
    stepId: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      const now = new Date();
      const step = await prisma.activityTraceStep.findUnique({
        where: { id: stepId },
        select: { startedAt: true, traceId: true },
      });
      if (!step) return null;

      const durationMs = Math.round(
        now.getTime() - step.startedAt.getTime()
      );

      await prisma.activityTraceStep.update({
        where: { id: stepId },
        data: {
          status: "COMPLETED" as TraceStatus,
          completedAt: now,
          durationMs,
          metadata: (metadata || {}) as unknown as Prisma.InputJsonValue,
        },
      });

      await prisma.activityTrace.update({
        where: { id: step.traceId },
        data: { stepsCount: { increment: 1 } },
      });

      return { durationMs };
    } catch {
      return null;
    }
  }

  async failStep(stepId: string, errorMessage?: string) {
    try {
      const now = new Date();
      const step = await prisma.activityTraceStep.findUnique({
        where: { id: stepId },
        select: { startedAt: true, traceId: true },
      });
      if (!step) return null;

      const durationMs = Math.round(
        now.getTime() - step.startedAt.getTime()
      );

      await prisma.activityTraceStep.update({
        where: { id: stepId },
        data: {
          status: "ERROR" as TraceStatus,
          completedAt: now,
          durationMs,
          metadata: { error: errorMessage || "Unknown error" } as unknown as Prisma.InputJsonValue,
        },
      });

      return { durationMs };
    } catch {
      return null;
    }
  }

  async completeTrace(traceId: string) {
    try {
      const now = new Date();
      const trace = await prisma.activityTrace.findUnique({
        where: { id: traceId },
        select: { startedAt: true },
      });
      if (!trace) return null;

      const totalDurationMs = Math.round(
        now.getTime() - trace.startedAt.getTime()
      );

      return await prisma.activityTrace.update({
        where: { id: traceId },
        data: {
          status: "COMPLETED" as TraceStatus,
          completedAt: now,
          totalDurationMs,
        },
      });
    } catch {
      return null;
    }
  }

  async failTrace(traceId: string) {
    try {
      const now = new Date();
      const trace = await prisma.activityTrace.findUnique({
        where: { id: traceId },
        select: { startedAt: true },
      });
      if (!trace) return null;

      const totalDurationMs = Math.round(
        now.getTime() - trace.startedAt.getTime()
      );

      return await prisma.activityTrace.update({
        where: { id: traceId },
        data: {
          status: "ERROR" as TraceStatus,
          completedAt: now,
          totalDurationMs,
        },
      });
    } catch {
      return null;
    }
  }

  async getTrace(traceId: string, userId: string) {
    try {
      return await prisma.activityTrace.findFirst({
        where: { id: traceId, userId },
        include: {
          steps: {
            orderBy: { startedAt: "asc" },
          },
        },
      });
    } catch {
      return null;
    }
  }

  async getTraces(
    userId: string,
    options?: { limit?: number; offset?: number }
  ) {
    try {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const [traces, total] = await Promise.all([
        prisma.activityTrace.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            _count: { select: { steps: true } },
          },
        }),
        prisma.activityTrace.count({ where: { userId } }),
      ]);

      return { traces, total };
    } catch {
      return { traces: [], total: 0 };
    }
  }

  async getTracesByConversation(conversationId: string, userId: string) {
    try {
      return await prisma.activityTrace.findFirst({
        where: { conversationId, userId },
        include: {
          steps: {
            orderBy: { startedAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      return null;
    }
  }

  async getMetrics(userId: string) {
    try {
      const [traceStats, stepStats, recent] = await Promise.all([
        prisma.activityTrace.aggregate({
          where: { userId },
          _avg: { totalDurationMs: true },
          _count: true,
        }),
        prisma.activityTraceStep.findMany({
          where: {
            trace: { userId },
            status: "COMPLETED",
          },
          select: { stepName: true, durationMs: true },
        }),
        prisma.activityTrace.findMany({
          where: { userId, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { totalDurationMs: true },
        }),
      ]);

      const stepDurationMap = new Map<string, number[]>();
      for (const s of stepStats) {
        if (s.durationMs == null) continue;
        const arr = stepDurationMap.get(s.stepName) || [];
        arr.push(s.durationMs);
        stepDurationMap.set(s.stepName, arr);
      }

      const avgStepTimes: Record<string, number> = {};
      for (const [name, durations] of stepDurationMap) {
        avgStepTimes[name] = Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        );
      }

      return {
        totalTraces: traceStats._count,
        avgTotalDurationMs: Math.round(traceStats._avg.totalDurationMs ?? 0),
        avgStepTimes,
        recentTotalDurationMs: recent.map(
          (r) => r.totalDurationMs ?? 0
        ),
      };
    } catch {
      return null;
    }
  }
}
