"use client";

import { useState, useCallback } from "react";

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/me/export");
      if (!res.ok) {
        setError("Failed to export data.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selflearn-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export data.");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
      <div className="mb-4">
        <a href="/dashboard/account" className="text-sm" style={{ color: "var(--muted-text)" }}>
          &larr; Back to account
        </a>
      </div>

      <h2 className="text-2xl font-semibold mb-6" style={{ color: "var(--surface-text)" }}>Export My Data</h2>

      <div className="max-w-lg space-y-6">
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--muted-text)" }}>
            Export all your data as a JSON file. This includes:
          </p>
          <ul className="text-sm space-y-1 mb-4" style={{ color: "var(--muted-text)" }}>
            <li>• Profile information</li>
            <li>• Conversations and messages</li>
            <li>• Memories</li>
            <li>• Learning candidates</li>
            <li>• Feedback history</li>
            <li>• Warnings received</li>
          </ul>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            Note: Password hashes, session tokens, and API keys are not included.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              {exporting ? "Exporting..." : "Download Export"}
            </button>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
