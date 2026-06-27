import { prisma } from "@/lib/db/prisma";
import { ProfileFactExtractor, type ProfileKey, type ProfileFact, type ProfileQuery } from "./ProfileFactExtractor";
import { MemoryConflictResolver } from "./MemoryConflictResolver";
import { MemoryWriteService } from "./MemoryWriteService";
import { MemoryUpdateService } from "./MemoryUpdateService";
import { MemoryDeduplicationService } from "./MemoryDeduplicationService";
import { MemoryAuditService } from "./MemoryAuditService";

export interface ProfileMemoryResult {
  action: "saved" | "found" | "not_found" | "none";
  key: ProfileKey | null;
  value: string | null;
  memoryId: string | null;
  conflictResolved: boolean;
  oldValueSuperseded: string | null;
}

export interface ProfileFactData {
  id: string;
  text: string;
  summary: string | null;
  tags: string[];
  memoryKey: string | null;
  status: string;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileMemoryService {
  private extractor = new ProfileFactExtractor();
  private resolver = new MemoryConflictResolver();
  private writeService = new MemoryWriteService();
  private updateService = new MemoryUpdateService();
  private dedupService = new MemoryDeduplicationService();
  private audit = new MemoryAuditService();

  async process(
    userId: string,
    userMessage: string
  ): Promise<ProfileMemoryResult> {
    const fact = this.extractor.extract(userMessage);
    if (fact) {
      return this.saveProfileFact(userId, fact);
    }

    const query = this.extractor.detectQuery(userMessage);
    if (query) {
      return this.resolveProfileQuery(userId, query);
    }

    return { action: "none", key: null, value: null, memoryId: null, conflictResolved: false, oldValueSuperseded: null };
  }

  private async saveProfileFact(
    userId: string,
    fact: ProfileFact
  ): Promise<ProfileMemoryResult> {
    const existing = await this.resolver.getActive(userId, fact.key);

    if (existing && existing.text.normalize("NFC") === fact.value.normalize("NFC")) {
      await this.updateService.touch(existing.id);
      this.audit.record({ type: "memoryUpdated", key: fact.key, memoryType: "PROFILE_FACT" });
      return {
        action: "found",
        key: fact.key,
        value: fact.value,
        memoryId: existing.id,
        conflictResolved: false,
        oldValueSuperseded: null,
      };
    }

    const writeResult = await this.writeService.write({
      userId,
      key: fact.key,
      value: fact.value,
      text: fact.text,
      source: "chat",
      confidence: fact.confidence,
      tags: ["profile", fact.key],
    });

    if (writeResult.superseded) {
      this.audit.record({ type: "memoryConflictResolved", key: fact.key, memoryType: "PROFILE_FACT", superseded: true, oldValue: writeResult.oldValue || undefined });
    }

    this.audit.record({ type: writeResult.deduplicated ? "memoryUpdated" : "memorySaved", key: fact.key });

    return {
      action: writeResult.deduplicated ? "found" : "saved",
      key: fact.key as ProfileKey,
      value: fact.value,
      memoryId: writeResult.memoryId,
      conflictResolved: writeResult.superseded,
      oldValueSuperseded: writeResult.oldValue,
    };
  }

  private async resolveProfileQuery(
    userId: string,
    query: ProfileQuery
  ): Promise<ProfileMemoryResult> {
    const active = await this.resolver.getActive(userId, query.key);
    if (active) {
      this.audit.record({ type: "memoryRetrieved", key: query.key, retrievalMode: "exact" });
      return {
        action: "found",
        key: query.key,
        value: active.text,
        memoryId: active.id,
        conflictResolved: false,
        oldValueSuperseded: null,
      };
    }

    return {
      action: "not_found",
      key: query.key,
      value: null,
      memoryId: null,
      conflictResolved: false,
      oldValueSuperseded: null,
    };
  }

  async getActiveFact(userId: string, key: string): Promise<ProfileFactData | null> {
    const memory = await prisma.memory.findFirst({
      where: { userId, memoryKey: key, status: "ACTIVE" },
      select: {
        id: true, text: true, summary: true, tags: true,
        memoryKey: true, status: true, confidence: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return memory;
  }

  async getAllActiveFacts(userId: string): Promise<ProfileFactData[]> {
    const memories = await prisma.memory.findMany({
      where: { userId, memoryKey: { not: null }, status: "ACTIVE" },
      select: {
        id: true, text: true, summary: true, tags: true,
        memoryKey: true, status: true, confidence: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return memories;
  }

  getAuditEvents() {
    return this.audit.getEvents();
  }

  getSafeAuditMetadata(): Record<string, unknown> {
    return this.audit.getSafeMetadata();
  }

  clearAudit(): void {
    this.audit.clear();
  }
}
