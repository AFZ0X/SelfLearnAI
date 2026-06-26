"use client";

import { useState } from "react";
import { formatDateSafe } from "@/lib/format/date";

interface CandidateItem {
  id: string;
  text: string;
  summary: string | null;
  source: string | null;
  sensitivity: string;
  status: string;
  confidence: number | null;
  tags: string[];
  createdAt: string;
}

interface LearningConfigItem {
  id: string;
  userId: string;
  learningEnabled: boolean;
  autoStoreLow: boolean;
  requireApproval: boolean;
  maxCandidates: number;
}

interface LearningPageClientProps {
  initialCandidates: CandidateItem[];
  initialConfig: LearningConfigItem;
}

const SENSITIVITY_STYLES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "var(--success-bg)", text: "var(--success-text)" },
  MEDIUM: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  HIGH: { bg: "var(--error-bg)", text: "var(--error-text)" },
  SECRET: { bg: "var(--error-bg)", text: "var(--error-text)" },
};

export function LearningPageClient({ initialCandidates, initialConfig }: LearningPageClientProps) {
  const [candidates, setCandidates] = useState<CandidateItem[]>(initialCandidates);
  const [config, setConfig] = useState<LearningConfigItem>(initialConfig);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessing(id);
    setError(null);
    try {
      const res = await fetch(`/api/learning/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed to ${action} candidate.`);
        return;
      }
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: action === "approve" ? "APPROVED" : "REJECTED" } : c
        )
      );
    } catch {
      setError(`Failed to ${action} candidate.`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(id: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/learning/candidates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      setError("Failed to delete candidate.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleConfigSave(updates: Partial<LearningConfigItem>) {
    setError(null);
    try {
      const res = await fetch("/api/learning/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save settings.");
        return;
      }
      const data = await res.json();
      setConfig(data.config);
    } catch {
      setError("Failed to save settings.");
    }
  }

  const filtered = candidates.filter(
    (c) => statusFilter === "ALL" || c.status === statusFilter
  );

  return (
    <div className="flex flex-1 gap-6 p-6 overflow-y-auto">
      <div className="w-96 flex-shrink-0 space-y-6">
        {!config.learningEnabled && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--warning-bg)", border: "1px solid var(--warning-border)", color: "var(--warning-text)" }}>
            Learning is disabled. New candidates will not be created from chat.
          </div>
        )}

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Learning Settings</h2>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: "var(--surface-text)" }}>
            <input
              type="checkbox"
              checked={config.learningEnabled}
              onChange={(e) =>
                setConfig({ ...config, learningEnabled: e.target.checked })
              }
              className="rounded"
              style={{ accentColor: "var(--btn-primary-bg)" }}
            />
            <span>Enable learning from conversations</span>
          </label>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: "var(--surface-text)" }}>
            <input
              type="checkbox"
              checked={config.autoStoreLow}
              onChange={(e) =>
                setConfig({ ...config, autoStoreLow: e.target.checked })
              }
              className="rounded"
              style={{ accentColor: "var(--btn-primary-bg)" }}
            />
            <span>Auto-store LOW sensitivity candidates</span>
          </label>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: "var(--surface-text)" }}>
            <input
              type="checkbox"
              checked={config.requireApproval}
              onChange={(e) =>
                setConfig({ ...config, requireApproval: e.target.checked })
              }
              className="rounded"
              style={{ accentColor: "var(--btn-primary-bg)" }}
            />
            <span>Require approval for all candidates</span>
          </label>

          <button
            onClick={() =>
              handleConfigSave({
                learningEnabled: config.learningEnabled,
                autoStoreLow: config.autoStoreLow,
                requireApproval: config.requireApproval,
              })
            }
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
          >
            Save Settings
          </button>
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Filter</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-150"
            style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--muted-text)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--subtle-bg)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-base font-medium">No learning candidates</p>
            <p className="text-sm mt-1">
              {config.learningEnabled
                ? "Candidates will appear here as you chat with the AI."
                : "Learning is disabled. Enable it in settings to start extracting candidates."}
            </p>
          </div>
        )}

        {filtered.map((candidate) => (
          <div
            key={candidate.id}
            className="rounded-xl border p-5 flex items-start gap-4"
            style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: SENSITIVITY_STYLES[candidate.sensitivity]?.bg || "var(--subtle-bg)",
                    color: SENSITIVITY_STYLES[candidate.sensitivity]?.text || "var(--muted-text)",
                  }}
                >
                  {candidate.sensitivity}
                </span>
                <span
                  className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: candidate.status === "PENDING" ? "var(--info-bg)" : candidate.status === "APPROVED" ? "var(--success-bg)" : "var(--subtle-bg)",
                    color: candidate.status === "PENDING" ? "var(--info-text)" : candidate.status === "APPROVED" ? "var(--success-text)" : "var(--muted-text)",
                  }}
                >
                  {candidate.status}
                </span>
                {candidate.confidence !== null && (
                  <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                    {Math.round(candidate.confidence * 100)}% confidence
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                  {formatDateSafe(candidate.createdAt)}
                </span>
              </div>

              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--surface-text)" }}>
                {candidate.text}
              </p>

              {candidate.summary && (
                <p className="text-xs mt-1 italic" style={{ color: "var(--muted-text)" }}>
                  {candidate.summary}
                </p>
              )}

              {candidate.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {candidate.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: "var(--info-bg)", color: "var(--info-text)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1.5 flex-shrink-0">
              {candidate.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handleAction(candidate.id, "approve")}
                    disabled={processing === candidate.id}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                    style={{ backgroundColor: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(candidate.id, "reject")}
                    disabled={processing === candidate.id}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                    style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)", border: "1px solid var(--error-border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(candidate.id)}
                disabled={processing === candidate.id}
                className="px-2 py-1.5 text-xs rounded-lg transition-all duration-150 disabled:opacity-50"
                style={{ color: "var(--muted-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; e.currentTarget.style.color = "var(--error-text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
