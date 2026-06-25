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

const SENSITIVITY_COLORS: Record<string, string> = {
  LOW: "bg-green-50 text-green-700 border-green-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  SECRET: "bg-red-50 text-red-700 border-red-200",
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
          <div className="rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
            Learning is disabled. New candidates will not be created from chat.
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="font-medium text-sm">Learning Settings</h2>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.learningEnabled}
              onChange={(e) =>
                setConfig({ ...config, learningEnabled: e.target.checked })
              }
              className="rounded border-zinc-300"
            />
            <span>Enable learning from conversations</span>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoStoreLow}
              onChange={(e) =>
                setConfig({ ...config, autoStoreLow: e.target.checked })
              }
              className="rounded border-zinc-300"
            />
            <span>Auto-store LOW sensitivity candidates</span>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireApproval}
              onChange={(e) =>
                setConfig({ ...config, requireApproval: e.target.checked })
              }
              className="rounded border-zinc-300"
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
            className="w-full px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
          >
            Save Settings
          </button>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium text-sm">Filter</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <p className="text-lg font-medium">No learning candidates</p>
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
            className="rounded-lg border p-4 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    SENSITIVITY_COLORS[candidate.sensitivity] || "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {candidate.sensitivity}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    candidate.status === "PENDING"
                      ? "bg-blue-50 text-blue-600"
                      : candidate.status === "APPROVED"
                      ? "bg-green-50 text-green-600"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {candidate.status}
                </span>
                {candidate.confidence !== null && (
                  <span className="text-xs text-zinc-400">
                    {Math.round(candidate.confidence * 100)}% confidence
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  {formatDateSafe(candidate.createdAt)}
                </span>
              </div>

              <p className="text-sm text-zinc-900 whitespace-pre-wrap">
                {candidate.text}
              </p>

              {candidate.summary && (
                <p className="text-xs text-zinc-500 mt-1 italic">
                  {candidate.summary}
                </p>
              )}

              {candidate.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {candidate.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1 flex-shrink-0">
              {candidate.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handleAction(candidate.id, "approve")}
                    disabled={processing === candidate.id}
                    className="px-3 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 border border-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(candidate.id, "reject")}
                    disabled={processing === candidate.id}
                    className="px-3 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 border border-red-200"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(candidate.id)}
                disabled={processing === candidate.id}
                className="px-2 py-1 text-xs text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
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
