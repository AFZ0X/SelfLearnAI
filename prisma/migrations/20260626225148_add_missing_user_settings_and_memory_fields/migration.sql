-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "memoryKey" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "supersededById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Memory_userId_memoryKey_status_idx" ON "Memory"("userId", "memoryKey", "status");
