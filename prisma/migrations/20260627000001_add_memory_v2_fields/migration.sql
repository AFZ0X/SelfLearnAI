-- AlterTable
ALTER TABLE "Memory" 
  ADD COLUMN     "value" TEXT,
  ADD COLUMN     "importance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "memoryType" TEXT,
  ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN     "useCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "expiresAt" TIMESTAMP(3),
  ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Memory_userId_memoryType_idx" ON "Memory"("userId", "memoryType");
CREATE INDEX "Memory_userId_status_memoryKey_idx" ON "Memory"("userId", "status", "memoryKey");
