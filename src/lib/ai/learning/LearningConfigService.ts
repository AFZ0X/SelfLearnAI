import { prisma } from "@/lib/db/prisma";

export interface LearningConfigData {
  learningEnabled?: boolean;
  autoStoreLow?: boolean;
  requireApproval?: boolean;
  maxCandidates?: number;
}

export interface LearningConfigResponse {
  id: string;
  userId: string;
  learningEnabled: boolean;
  autoStoreLow: boolean;
  requireApproval: boolean;
  maxCandidates: number;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningConfigService {
  async getConfig(userId: string): Promise<LearningConfigResponse> {
    const existing = await prisma.learningConfig.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return prisma.learningConfig.create({
      data: { userId },
    });
  }

  async updateConfig(
    userId: string,
    data: LearningConfigData
  ): Promise<LearningConfigResponse> {
    const existing = await prisma.learningConfig.findUnique({
      where: { userId },
    });
    if (!existing) {
      return prisma.learningConfig.create({
        data: { userId, ...data },
      });
    }
    return prisma.learningConfig.update({
      where: { userId },
      data,
    });
  }
}
