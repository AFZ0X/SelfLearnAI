export interface MemoryAuditEvent {
  type: "memoryExtracted" | "memorySaved" | "memoryUpdated" | "memoryConflictResolved" | "memoryRetrieved" | "memoryDeduplicated" | "memoryDeleted" | "memoryCleared";
  key?: string;
  memoryType?: string;
  retrievalMode?: string;
  confidence?: number;
  superseded?: boolean;
  deduplicated?: boolean;
  oldValue?: string;
  memoryKeysUsed?: string[];
  supersededCount?: number;
  timestamp: string;
}

export class MemoryAuditService {
  private events: MemoryAuditEvent[] = [];

  record(event: Omit<MemoryAuditEvent, "timestamp">): void {
    this.events.push({ ...event, timestamp: new Date().toISOString() });
  }

  getEvents(): MemoryAuditEvent[] {
    return [...this.events];
  }

  getSafeMetadata(): Record<string, unknown> {
    const safe: Record<string, unknown> = {};

    const extracted = this.events.filter((e) => e.type === "memoryExtracted").length;
    const saved = this.events.filter((e) => e.type === "memorySaved").length;
    const updated = this.events.filter((e) => e.type === "memoryUpdated").length;
    const conflicts = this.events.filter((e) => e.type === "memoryConflictResolved").length;
    const retrievals = this.events.filter((e) => e.type === "memoryRetrieved").length;

    if (extracted > 0) safe.memoryExtracted = extracted;
    if (saved > 0) safe.memorySaved = saved;
    if (updated > 0) safe.memoryUpdated = updated;
    if (conflicts > 0) safe.memoryConflictResolved = conflicts;
    if (retrievals > 0) safe.memoryRetrieved = retrievals;

    const lastRetrieval = this.events.filter((e) => e.type === "memoryRetrieved").pop();
    if (lastRetrieval?.retrievalMode) safe.retrievalMode = lastRetrieval.retrievalMode;

    return safe;
  }

  clear(): void {
    this.events = [];
  }
}
