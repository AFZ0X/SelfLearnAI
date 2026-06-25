"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface WarningItem {
  id: string;
  reason: string;
  note: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  admin: { name: string | null; email: string | null };
}

export function WarningBanner() {
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/warnings")
      .then((r) => (r.ok ? r.json() : { warnings: [] }))
      .then((d) => setWarnings(d.warnings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unacknowledged = warnings.filter((w) => !w.acknowledgedAt);
  const latest = unacknowledged[0];

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

  if (loading || !latest) return null;

  return (
    <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Warning
            </span>
            <span className="text-xs text-amber-500 dark:text-amber-500">
              {new Date(latest.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {latest.reason}
          </p>
          {latest.note && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              {latest.note}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => handleAcknowledge(latest.id)}
              disabled={acknowledging === latest.id}
              className="text-xs px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {acknowledging === latest.id ? "..." : "Acknowledge"}
            </button>
            {unacknowledged.length > 1 && (
              <Link
                href="/dashboard/warnings"
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
              >
                View all ({unacknowledged.length}) warnings
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
