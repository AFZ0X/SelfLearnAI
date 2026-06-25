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
    <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">My Warnings</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
          View and acknowledge warnings issued by administrators.
        </p>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>Loading warnings...</p>
      )}

      {!loading && warnings.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-lg" style={{ color: "var(--muted-text)" }}>No warnings</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
            You have no warnings on your account.
          </p>
        </div>
      )}

      {unacknowledged.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: "var(--muted-text)" }}>
            Unacknowledged ({unacknowledged.length})
          </h3>
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
          <h3 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: "var(--muted-text)" }}>
            Acknowledged ({acknowledged.length})
          </h3>
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
      className={`rounded-lg border p-4 ${
        acknowledged
          ? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                acknowledged
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {acknowledged ? "Acknowledged" : "Warning"}
            </span>
            <span className="text-xs text-zinc-400">
              {new Date(warning.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p
            className={`text-sm font-medium ${
              acknowledged
                ? "text-zinc-600 dark:text-zinc-300"
                : "text-amber-900 dark:text-amber-100"
            }`}
          >
            {warning.reason}
          </p>
          {warning.note && (
            <p
              className={`text-sm mt-0.5 ${
                acknowledged
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {warning.note}
            </p>
          )}
          <p className="text-xs mt-1 text-zinc-400">
            Issued by {warning.admin?.name || warning.admin?.email || "Admin"}
          </p>
          {warning.acknowledgedAt && (
            <p className="text-xs mt-0.5 text-zinc-400">
              Acknowledged on {new Date(warning.acknowledgedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {!acknowledged && (
          <button
            onClick={() => onAcknowledge(warning.id)}
            disabled={acknowledging}
            className="shrink-0 text-xs px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {acknowledging ? "..." : "Acknowledge"}
          </button>
        )}
      </div>
    </div>
  );
}
