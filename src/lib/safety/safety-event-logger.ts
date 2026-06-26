import { redactSensitive } from "./redaction";

export type SafetyEventType =
  | "rate_limit_hit"
  | "blocked_secret_storage"
  | "prompt_injection_detected"
  | "unauthorized_admin_access"
  | "admin_destructive_action"
  | "web_fetch_blocked"
  | "unsafe_url_blocked"
  | "failed_auth_attempt"
  | "request_size_exceeded"
  | "role_change"
  | "memory_deleted_by_admin"
  | "candidate_deleted_by_admin";

export interface SafetyEvent {
  type: SafetyEventType;
  timestamp: string;
  userId?: string;
  ip?: string;
  route?: string;
  details?: string;
}

interface LogEntry {
  id: string;
  type: string;
  timestamp: string;
  userId?: string;
  ip?: string;
  route?: string;
  details?: string;
}

const MAX_LOG_ENTRIES = 500;
const logBuffer: LogEntry[] = [];
let logIdCounter = 0;

export function logSafetyEvent(event: SafetyEvent): void {
  const safe: SafetyEvent = {
    ...event,
    details: event.details ? redactSensitive(event.details) : undefined,
  };

  logBuffer.push({
    id: `log_${++logIdCounter}_${Date.now()}`,
    type: safe.type,
    timestamp: safe.timestamp,
    userId: safe.userId,
    ip: safe.ip,
    route: safe.route,
    details: safe.details,
  });

  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
  }

  const prefix = `[SAFETY:${safe.type}]`;
  const parts = [prefix];
  if (safe.userId) parts.push(`user=${safe.userId}`);
  if (safe.ip) parts.push(`ip=${safe.ip}`);
  if (safe.route) parts.push(`route=${safe.route}`);
  if (safe.details) parts.push(`details=${safe.details}`);
  console.log(parts.join(" "));
}

export function getLogEntries(type?: string, limit = 100): LogEntry[] {
  let entries = logBuffer;
  if (type) {
    entries = entries.filter((e) => e.type === type);
  }
  return entries.slice(-limit).reverse();
}
