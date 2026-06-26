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
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-4">
          <a href="/dashboard/admin" className="text-sm inline-flex items-center gap-1 mb-3" style={{ color: "var(--muted-text)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to admin dashboard
          </a>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>System Logs</h1>
              <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
                Monitor system events and safety incidents.
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
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
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--subtle-bg)" }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: "var(--card-border)" }}>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>No log entries found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border p-4 text-sm transition-all duration-150"
                style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md"
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
                  <p className="text-xs mt-1.5" style={{ color: "var(--surface-text-secondary)" }}>
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
    </div>
  );
}
