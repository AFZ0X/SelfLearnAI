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
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <a href="/dashboard/account" className="text-sm inline-flex items-center gap-1 mb-3" style={{ color: "var(--muted-text)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to account
          </a>
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>Export My Data</h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            Download all your data as a JSON file.
          </p>
        </div>

        <div className="max-w-lg">
          <div className="rounded-xl border p-6" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
            <p className="text-sm mb-4" style={{ color: "var(--surface-text-secondary)" }}>
              This export includes your profile, conversations, messages, memories, learning candidates, feedback, and warnings.
            </p>
            <ul className="text-sm space-y-1.5 mb-4" style={{ color: "var(--muted-text)" }}>
              {["Profile information", "Conversations and messages", "Memories", "Learning candidates", "Feedback history", "Warnings received"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--success-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs mb-5" style={{ color: "var(--muted-text)" }}>
              Password hashes, session tokens, and API keys are not included.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
              >
                {exporting ? "Exporting..." : "Download Export"}
              </button>
              {error && <span className="text-xs" style={{ color: "var(--error-text)" }}>{error}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
