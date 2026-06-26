"use client";

import { useState } from "react";
import { formatDateSafe } from "@/lib/format/date";

/**
 * A 'partial' or 'fuzzy' match from the API.
 */
interface MemorySearchResult {
  id: string;
  text: string;
  keywords: string[];
  tags: string[];
  category: "memory" | "knowledge";
  createdAt: Date;
  _score?: number;
}

interface MemoryPageClientProps {
  initialMemories: MemorySearchResult[];
  error?: string | null;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  memory: { bg: "var(--info-bg)", text: "var(--info-text)" },
  knowledge: { bg: "var(--success-bg)", text: "var(--success-text)" },
};

export function MemoryPageClient({ initialMemories, error: initialError }: MemoryPageClientProps) {
  const [selected, setSelected] = useState<MemorySearchResult | null>(null);
  const [error, setError] = useState<string | null>(initialError || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[]>(initialMemories);
  const [searching, setSearching] = useState(false);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const q = searchQuery.trim();
      if (!q) {
        setResults(initialMemories);
        return;
      }
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setError("Search failed.");
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this memory?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Delete failed.");
        return;
      }
      setResults((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      setError("Delete failed.");
    }
  }

  return (
    <div className="flex flex-1 gap-6 p-6 overflow-y-auto">
      <div className="w-96 flex-shrink-0 space-y-4">
        <form onSubmit={doSearch} className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            style={{ color: "var(--muted-text)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l4.5 4.5m-4.5-4.5a7.5 7.5 0 1 0-10.607 0 7.5 7.5 0 0 0 10.607 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-all duration-150"
            style={{
              border: "1px solid var(--input-border)",
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
            }}
          />
        </form>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
            {error}
          </div>
        )}

        <div className="space-y-2">
          {results.length === 0 && !searching && (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--muted-text)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--subtle-bg)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
                </svg>
              </div>
              <p className="text-base font-medium">No memories found</p>
              <p className="text-sm mt-1">Memories extracted from conversations will appear here.</p>
            </div>
          )}

          {searching && (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--muted-text)" }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3" style={{ borderColor: "var(--muted-text)", borderTopColor: "transparent" }} />
              <p className="text-sm">Searching...</p>
            </div>
          )}

          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="w-full text-left rounded-xl border p-3 transition-all duration-150"
              style={{
                borderColor: selected?.id === m.id ? "var(--accent)" : "var(--card-border)",
                backgroundColor: selected?.id === m.id ? "var(--accent-bg)" : "var(--card-bg)",
              }}
            >
              <p className="text-sm line-clamp-2" style={{ color: "var(--surface-text)" }}>
                {m.text}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: CATEGORY_STYLES[m.category]?.bg || "var(--subtle-bg)",
                    color: CATEGORY_STYLES[m.category]?.text || "var(--muted-text)",
                  }}
                >
                  {m.category}
                </span>
                {m._score !== undefined && (
                  <span className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                    {Math.round(m._score * 100)}%
                  </span>
                )}
                <span className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                  {formatDateSafe(m.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--muted-text)" }}>
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
            </svg>
            <p className="text-base font-medium">Select a memory</p>
            <p className="text-sm mt-1">Choose an item from the list to view details.</p>
          </div>
        )}

        {selected && (
          <div className="rounded-xl border p-6" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: "var(--surface-text)" }}>Memory Details</h2>
              <button
                onClick={() => handleDelete(selected.id)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150"
                style={{ color: "var(--error-text)", border: "1px solid var(--error-border)", backgroundColor: "var(--error-bg)" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Delete
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Text</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--surface-text)" }}>{selected.text}</p>
              </div>

              {selected.keywords.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.keywords.map((kw, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "var(--info-bg)", color: "var(--info-text)" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.tags.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((t, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: "var(--success-bg)", color: "var(--success-text)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-text)" }}>
                <span
                  className="px-2 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: CATEGORY_STYLES[selected.category]?.bg || "var(--subtle-bg)",
                    color: CATEGORY_STYLES[selected.category]?.text || "var(--muted-text)",
                  }}
                >
                  {selected.category}
                </span>
                <span>{formatDateSafe(selected.createdAt)}</span>
                {selected._score !== undefined && (
                  <span>{Math.round(selected._score * 100)}% match</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
