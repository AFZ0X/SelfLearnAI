import { prisma } from "@/lib/db/prisma";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.adminActionLog.create({
    data: {
      adminId,
      targetUserId,
      action,
      metadata: (metadata ?? {}) as never,
    },
  });
}
