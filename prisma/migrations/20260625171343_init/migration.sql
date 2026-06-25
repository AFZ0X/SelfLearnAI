-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SensitivityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'SECRET');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION', 'WRONG_ANSWER');

-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('USER', 'PROJECT', 'GENERAL', 'WEB_RESEARCH');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "ActivationFunction" AS ENUM ('SIGMOID', 'TANH', 'RELU', 'LINEAR');

CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL DEFAULT 'USER',
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "confidence" DOUBLE PRECISION,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryEmbedding" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "embedding" vector(1536),
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "summary" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningCandidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "sensitivity" "SensitivityLevel" NOT NULL DEFAULT 'LOW',
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoStoreLow" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxCandidates" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "reason" TEXT,
    "correction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeuralExperiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Experiment',
    "datasetName" TEXT NOT NULL,
    "architecture" JSONB NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeuralExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'IDLE',
    "currentEpoch" INTEGER NOT NULL DEFAULT 0,
    "maxEpochs" INTEGER NOT NULL DEFAULT 100,
    "architecture" JSONB NOT NULL,
    "lossHistory" JSONB NOT NULL DEFAULT '[]',
    "accuracyHistory" JSONB NOT NULL DEFAULT '[]',
    "logs" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "trainingRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "architecture" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEmbedding_memoryId_key" ON "MemoryEmbedding"("memoryId");

-- CreateIndex
CREATE INDEX "MemoryEmbedding_memoryId_idx" ON "MemoryEmbedding"("memoryId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WebSource_userId_idx" ON "WebSource"("userId");

-- CreateIndex
CREATE INDEX "WebSource_conversationId_idx" ON "WebSource"("conversationId");

-- CreateIndex
CREATE INDEX "LearningCandidate_userId_status_idx" ON "LearningCandidate"("userId", "status");

-- CreateIndex
CREATE INDEX "LearningCandidate_userId_createdAt_idx" ON "LearningCandidate"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningConfig_userId_key" ON "LearningConfig"("userId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_conversationId_idx" ON "Feedback"("conversationId");

-- CreateIndex
CREATE INDEX "Feedback_messageId_idx" ON "Feedback"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_userId_messageId_key" ON "Feedback"("userId", "messageId");

-- CreateIndex
CREATE INDEX "NeuralExperiment_userId_idx" ON "NeuralExperiment"("userId");

-- CreateIndex
CREATE INDEX "NeuralExperiment_userId_createdAt_idx" ON "NeuralExperiment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingRun_userId_idx" ON "TrainingRun"("userId");

-- CreateIndex
CREATE INDEX "TrainingRun_experimentId_idx" ON "TrainingRun"("experimentId");

-- CreateIndex
CREATE INDEX "TrainingRun_userId_createdAt_idx" ON "TrainingRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelSnapshot_userId_idx" ON "ModelSnapshot"("userId");

-- CreateIndex
CREATE INDEX "ModelSnapshot_experimentId_idx" ON "ModelSnapshot"("experimentId");

-- CreateIndex
CREATE INDEX "ModelSnapshot_trainingRunId_idx" ON "ModelSnapshot"("trainingRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEmbedding" ADD CONSTRAINT "MemoryEmbedding_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSource" ADD CONSTRAINT "WebSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSource" ADD CONSTRAINT "WebSource_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningCandidate" ADD CONSTRAINT "LearningCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningConfig" ADD CONSTRAINT "LearningConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeuralExperiment" ADD CONSTRAINT "NeuralExperiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRun" ADD CONSTRAINT "TrainingRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRun" ADD CONSTRAINT "TrainingRun_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "NeuralExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSnapshot" ADD CONSTRAINT "ModelSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSnapshot" ADD CONSTRAINT "ModelSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "NeuralExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSnapshot" ADD CONSTRAINT "ModelSnapshot_trainingRunId_fkey" FOREIGN KEY ("trainingRunId") REFERENCES "TrainingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
