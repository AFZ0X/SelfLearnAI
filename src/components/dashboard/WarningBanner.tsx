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
    <div className="mx-4 mt-4 rounded-lg border p-4" style={{ backgroundColor: "var(--warning-bg)", borderColor: "var(--warning-border)" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--warning-text)" }}>
              Warning
            </span>
            <span className="text-xs" style={{ color: "var(--muted-text)" }}>
              {new Date(latest.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
            {latest.reason}
          </p>
          {latest.note && (
            <p className="text-sm mt-0.5" style={{ color: "var(--warning-text)" }}>
              {latest.note}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => handleAcknowledge(latest.id)}
              disabled={acknowledging === latest.id}
              className="text-xs px-2.5 py-1 rounded disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              {acknowledging === latest.id ? "..." : "Acknowledge"}
            </button>
            {unacknowledged.length > 1 && (
              <Link
                href="/dashboard/warnings"
                className="text-xs hover:underline" style={{ color: "var(--warning-text)" }}
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
