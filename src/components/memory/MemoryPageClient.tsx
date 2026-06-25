"use client";

import { useState } from "react";
import { formatDateSafe } from "@/lib/format/date";

interface MemoryItem {
  id: string;
  type: string;
  text: string;
  summary: string | null;
  source: string | null;
  tags: string[];
  createdAt: string;
}

interface MemoryPageClientProps {
  initialMemories: MemoryItem[];
}

const MEMORY_TYPES = ["USER", "PROJECT", "GENERAL", "WEB_RESEARCH"] as const;

export function MemoryPageClient({ initialMemories }: MemoryPageClientProps) {
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories);
  const [text, setText] = useState("");
  const [type, setType] = useState<string>("USER");
  const [summary, setSummary] = useState("");
  const [source, setSource] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          type,
          summary: summary.trim() || undefined,
          source: source.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save memory.");
        return;
      }

      setMemories((prev) => [data.memory || data, ...prev]);
      setText("");
      setSummary("");
      setSource("");
      setTagsInput("");

      if (data.embeddingError) {
        setError(`Memory saved, but ${data.warning || "embedding failed."}`);
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      setError("Failed to delete memory.");
    }
  }

  return (
    <div className="flex flex-1 gap-6 p-6 overflow-y-auto">
      <div className="w-96 flex-shrink-0">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium text-sm">Add Memory</h2>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {MEMORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Text *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you want to remember?"
              rows={3}
              maxLength={5000}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
              style={{
                border: "1px solid var(--input-border)",
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>
              Summary <span style={{ color: "var(--muted-text)" }}>(optional)</span>
            </label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short summary..."
              maxLength={500}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid var(--input-border)",
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>
              Source <span style={{ color: "var(--muted-text)" }}>(optional)</span>
            </label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Where is this from?"
              maxLength={500}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid var(--input-border)",
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>
              Tags <span style={{ color: "var(--muted-text)" }}>(comma-separated)</span>
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="facts, preferences, ..."
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid var(--input-border)",
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            />
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
          >
            {saving ? "Saving..." : "Save Memory"}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {!initialMemories.length && memories.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-64"
            style={{ color: "var(--muted-text)" }}
          >
            <p className="text-lg font-medium">No memories yet</p>
            <p className="text-sm mt-1">
              Add your first memory using the form on the left.
            </p>
          </div>
        )}

        {memories.map((memory) => (
          <div
            key={memory.id}
            className="rounded-lg border p-4 flex items-start gap-3"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                  {memory.type}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                  {formatDateSafe(memory.createdAt)}
                </span>
                {memory.tags.length > 0 && (
                  <div className="flex gap-1">
                    {memory.tags.map((tag, i) => (
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
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                {memory.text}
              </p>
              {memory.summary && (
                <p className="text-xs mt-1 italic" style={{ color: "var(--muted-text)" }}>
                  {memory.summary}
                </p>
              )}
              {memory.source && (
                <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
                  Source: {memory.source}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(memory.id)}
              className="px-2 py-1 text-xs text-red-500 hover:text-red-700 rounded hover:bg-red-50 flex-shrink-0"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
