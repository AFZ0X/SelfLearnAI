"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  userId?: string;
  route?: string;
  details?: string;
  adminEmail?: string;
  targetEmail?: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = filter ? `/api/admin/logs?type=${filter}` : "/api/admin/logs";
    fetch(url)
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => { if (!cancelled) setLogs(data.logs || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
      <div className="mb-4">
        <a href="/dashboard/admin" className="text-sm" style={{ color: "var(--muted-text)" }}>
          &larr; Back to admin dashboard
        </a>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: "var(--surface-text)" }}>System Logs</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm border"
          style={{ borderColor: "var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
        >
          <option value="">All Types</option>
          <option value="rate_limit_hit">Rate Limit</option>
          <option value="blocked_secret_storage">Blocked Secret</option>
          <option value="failed_auth_attempt">Auth Failure</option>
          <option value="unsafe_url_blocked">URL Blocked</option>
          <option value="request_size_exceeded">Size Exceeded</option>
          <option value="role_change">Role Change</option>
          <option value="memory_deleted_by_admin">Memory Deleted</option>
          <option value="candidate_deleted_by_admin">Candidate Deleted</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>No log entries found.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: log.source === "admin" ? "var(--warning-bg)" : "var(--subtle-bg)",
                    color: log.source === "admin" ? "var(--warning-text)" : "var(--muted-text)",
                  }}
                >
                  {log.type}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                {log.route && (
                  <span className="text-xs font-mono" style={{ color: "var(--muted-text)" }}>
                    {log.route}
                  </span>
                )}
              </div>
              {log.details && (
                <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
                  {log.details}
                </p>
              )}
              {log.adminEmail && (
                <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
                  Admin: {log.adminEmail}
                  {log.targetEmail && ` → ${log.targetEmail}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
