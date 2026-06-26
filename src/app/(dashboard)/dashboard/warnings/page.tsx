"use client";

import { useEffect, useState, useCallback } from "react";

interface WarningItem {
  id: string;
  reason: string;
  note: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  admin: { name: string | null; email: string | null };
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/warnings")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Please log in to view your warnings.");
          throw new Error("Failed to load warnings.");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setWarnings(data.warnings || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load warnings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleAcknowledge = useCallback(async (id: string) => {
    setAcknowledging(id);
    try {
      const res = await fetch(`/api/me/warnings/${id}/acknowledge`, {
        method: "PATCH",
      });
      if (res.ok) {
        setWarnings((prev) =>
          prev.map((w) =>
            w.id === id ? { ...w, acknowledgedAt: new Date().toISOString() } : w
          )
        );
      }
    } catch {
    } finally {
      setAcknowledging(null);
    }
  }, []);

  const unacknowledged = warnings.filter((w) => !w.acknowledgedAt);
  const acknowledged = warnings.filter((w) => w.acknowledgedAt);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>My Warnings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            View and acknowledge warnings issued by administrators.
          </p>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "var(--subtle-bg)" }} />
            ))}
          </div>
        )}

        {!loading && warnings.length === 0 && (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: "var(--card-border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "var(--subtle-bg)" }}>
              <svg className="w-5 h-5" style={{ color: "var(--muted-text)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "var(--surface-text)" }}>No warnings</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
              You have no warnings on your account.
            </p>
          </div>
        )}

        {unacknowledged.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-text)" }}>
              Unacknowledged ({unacknowledged.length})
            </h2>
            <div className="space-y-3">
              {unacknowledged.map((w) => (
                <WarningCard
                  key={w.id}
                  warning={w}
                  acknowledging={acknowledging === w.id}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
            </div>
          </div>
        )}

        {acknowledged.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-text)" }}>
              Acknowledged ({acknowledged.length})
            </h2>
            <div className="space-y-3">
              {acknowledged.map((w) => (
                <WarningCard
                  key={w.id}
                  warning={w}
                  acknowledging={false}
                  onAcknowledge={() => {}}
                  acknowledged
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WarningCard({
  warning,
  acknowledging,
  onAcknowledge,
  acknowledged = false,
}: {
  warning: WarningItem;
  acknowledging: boolean;
  onAcknowledge: (id: string) => void;
  acknowledged?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-5 transition-all duration-200"
      style={{
        borderColor: acknowledged ? "var(--card-border)" : "var(--warning-border)",
        backgroundColor: acknowledged ? "var(--card-bg)" : "var(--warning-bg)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: acknowledged ? "var(--muted-text)" : "var(--warning-text)" }}>
              {acknowledged ? "Acknowledged" : "Warning"}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-text)" }}>
              {new Date(warning.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
            {warning.reason}
          </p>
          {warning.note && (
            <p className="text-sm mt-0.5" style={{ color: acknowledged ? "var(--muted-text)" : "var(--warning-text)" }}>
              {warning.note}
            </p>
          )}
          <p className="text-xs mt-1.5" style={{ color: "var(--muted-text)" }}>
            Issued by {warning.admin?.name || warning.admin?.email || "Admin"}
          </p>
          {warning.acknowledgedAt && (
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
              Acknowledged on {new Date(warning.acknowledgedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {!acknowledged && (
          <button
            onClick={() => onAcknowledge(warning.id)}
            disabled={acknowledging}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-all duration-150"
            style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            {acknowledging ? "Acknowledging..." : "Acknowledge"}
          </button>
        )}
      </div>
    </div>
  );
}
