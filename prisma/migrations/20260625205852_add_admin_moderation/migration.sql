-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "TraceStatus" AS ENUM ('RUNNING', 'COMPLETED', 'ERROR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedReason" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "AdminWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTrace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" "TraceStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDurationMs" INTEGER,
    "stepsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTraceStep" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" "TraceStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "ActivityTraceStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminWarning_userId_idx" ON "AdminWarning"("userId");

-- CreateIndex
CREATE INDEX "AdminWarning_adminId_idx" ON "AdminWarning"("adminId");

-- CreateIndex
CREATE INDEX "AdminWarning_createdAt_idx" ON "AdminWarning"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_idx" ON "AdminActionLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetUserId_idx" ON "AdminActionLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityTrace_userId_createdAt_idx" ON "ActivityTrace"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityTrace_conversationId_idx" ON "ActivityTrace"("conversationId");

-- CreateIndex
CREATE INDEX "ActivityTraceStep_traceId_idx" ON "ActivityTraceStep"("traceId");

-- AddForeignKey
ALTER TABLE "AdminWarning" ADD CONSTRAINT "AdminWarning_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminWarning" ADD CONSTRAINT "AdminWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTrace" ADD CONSTRAINT "ActivityTrace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTraceStep" ADD CONSTRAINT "ActivityTraceStep_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "ActivityTrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
