"use client";

import { useState } from "react";

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface MemoryUsedInfo {
  id: string;
  summary: string;
  relevanceLabel: string;
}

interface Citation {
  title: string;
  url: string;
  snippet: string;
}

interface FeedbackState {
  type: string;
  reason?: string;
  correction?: string;
}

interface MessageBubbleProps {
  id?: string;
  role: "user" | "assistant";
  content: string;
  memoryUsed?: boolean;
  memoriesUsed?: MemoryUsedInfo[];
  webSearchUsed?: boolean;
  citations?: Citation[];
  candidatesExtracted?: number;
  conversationId?: string | null;
  feedback?: FeedbackState | null;
  onFeedbackChange?: (messageId: string, feedback: FeedbackState | null) => void;
}

const WRONG_ANSWER_REASONS = [
  "incorrect", "outdated", "irrelevant", "unsafe",
  "hallucinated", "ignored_memory", "bad_citation", "other",
];

export function MessageBubble({
  id,
  role,
  content,
  memoryUsed,
  memoriesUsed,
  webSearchUsed,
  citations,
  candidatesExtracted,
  conversationId,
  feedback,
  onFeedbackChange,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [showWrongForm, setShowWrongForm] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [wrongReason, setWrongReason] = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback(type: string, extra?: Record<string, string>) {
    if (!id || !conversationId || saving) return;
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { conversationId, messageId: id, type };
      if (extra) {
        Object.assign(body, extra);
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save feedback.");
        return;
      }

      onFeedbackChange?.(id, { type, ...extra });
      setShowWrongForm(false);
      setShowCorrection(false);
      setWrongReason("");
      setCorrectionText("");
    } catch {
      setError("Failed to save feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function removeFeedback() {
    if (!id || !feedback || saving) return;
    setSaving(true);
    setError(null);

    try {
      const toggleType = feedback.type === "THUMBS_UP" ? "THUMBS_DOWN" : "THUMBS_UP";
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messageId: id, type: toggleType }),
      });
      if (res.ok) {
        const data = await res.json();
        onFeedbackChange?.(id, { type: toggleType, reason: data.feedback?.reason, correction: data.feedback?.correction });
      }
    } catch {
      setError("Failed to update feedback.");
    } finally {
      setSaving(false);
    }
  }

  const showMeta = !isUser && (memoryUsed || webSearchUsed || (candidatesExtracted ?? 0) > 0 || feedback);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={{
          backgroundColor: isUser ? "var(--bubble-user-bg)" : "var(--bubble-assistant-bg)",
          color: isUser ? "var(--bubble-user-text)" : "var(--bubble-assistant-text)",
        }}
      >
        <div dir="auto" className="leading-relaxed text-[15px]">
          {content}
        </div>

        {showMeta && (
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {memoryUsed && (
              <span className="text-xs font-medium block" style={{ color: "var(--muted-text)" }}>Memory used</span>
            )}
            {memoriesUsed && memoriesUsed.length > 0 && (
              <details className="mt-1">
                <summary
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--muted-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--conv-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-text)"; }}
                >
                  Show memories ({memoriesUsed.length})
                </summary>
                <ul className="mt-1 space-y-1">
                  {memoriesUsed.map((mu) => (
                    <li key={mu.id} className="text-xs" style={{ color: "var(--muted-text)" }}>
                      {mu.summary}
                      <span className="ml-1" style={{ color: "var(--muted-text)" }}>({mu.relevanceLabel})</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {webSearchUsed && (
              <span className="text-xs font-medium block" style={{ color: "var(--muted-text)" }}>Web search used</span>
            )}
            {citations && citations.length > 0 && (
              <details className="mt-1">
                <summary
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--muted-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--conv-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-text)"; }}
                >
                  Sources ({citations.length})
                </summary>
                <ul className="mt-1 space-y-2">
                  {citations.map((c, i) => (
                    <li key={i} className="text-xs">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">{c.title}</a>
                      <span className="ml-1" style={{ color: "var(--muted-text)" }}>({safeHostname(c.url)})</span>
                      <p className="mt-0.5" style={{ color: "var(--muted-text)" }}>{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {(candidatesExtracted ?? 0) > 0 && (
              <span className="text-xs font-medium block" style={{ color: "var(--muted-text)" }}>
                Learned {candidatesExtracted} item{candidatesExtracted !== 1 ? "s" : ""}
              </span>
            )}

            {!isUser && (
              <div className="flex items-center gap-1 pt-1">
                <button
                  onClick={() => feedback?.type === "THUMBS_UP" ? removeFeedback() : submitFeedback("THUMBS_UP")}
                  disabled={saving || !conversationId}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: feedback?.type === "THUMBS_UP" ? "var(--subtle-bg)" : "transparent",
                    color: feedback?.type === "THUMBS_UP" ? "var(--conv-text)" : "var(--muted-text)",
                  }}
                  onMouseEnter={(e) => { if (feedback?.type !== "THUMBS_UP") { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; e.currentTarget.style.color = "var(--conv-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "THUMBS_UP") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  title="Thumbs up"
                >
                  +1
                </button>
                <button
                  onClick={() => feedback?.type === "THUMBS_DOWN" ? removeFeedback() : submitFeedback("THUMBS_DOWN")}
                  disabled={saving || !conversationId}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={feedback?.type === "THUMBS_DOWN" ? { backgroundColor: "var(--error-bg)", color: "var(--error-text)" } : { color: "var(--muted-text)" }}
                  onMouseEnter={(e) => { if (feedback?.type !== "THUMBS_DOWN") { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; e.currentTarget.style.color = "var(--conv-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "THUMBS_DOWN") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  title="Thumbs down"
                >
                  -1
                </button>
                <button
                  onClick={() => { setShowWrongForm(!showWrongForm); setShowCorrection(false); }}
                  disabled={!conversationId}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={feedback?.type === "WRONG_ANSWER" ? { backgroundColor: "var(--error-bg)", color: "var(--error-text)" } : { color: "var(--muted-text)" }}
                  onMouseEnter={(e) => { if (feedback?.type !== "WRONG_ANSWER") { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; e.currentTarget.style.color = "var(--conv-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "WRONG_ANSWER") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  title="Mark as wrong"
                >
                  Wrong
                </button>
                <button
                  onClick={() => { setShowCorrection(!showCorrection); setShowWrongForm(false); }}
                  disabled={!conversationId}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={feedback?.type === "CORRECTION" ? { backgroundColor: "var(--subtle-bg)", color: "var(--surface-text)" } : { color: "var(--muted-text)" }}
                  onMouseEnter={(e) => { if (feedback?.type !== "CORRECTION") { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; e.currentTarget.style.color = "var(--conv-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "CORRECTION") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  title="Submit correction"
                >
                  Fix
                </button>
              </div>
            )}

            {showWrongForm && (
              <div
                className="mt-2 space-y-2 rounded-xl p-3"
                style={{
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--subtle-bg)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--conv-text)" }}>Why is this wrong?</p>
                <select
                  value={wrongReason}
                  onChange={(e) => setWrongReason(e.target.value)}
                  className="w-full rounded px-2 py-1 text-xs"
                  style={{
                    border: "1px solid var(--input-border)",
                    backgroundColor: "var(--input-bg)",
                    color: "var(--input-text)",
                  }}
                >
                  <option value="">Select a reason...</option>
                  {WRONG_ANSWER_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => submitFeedback("WRONG_ANSWER", { reason: wrongReason })}
                    disabled={saving || !wrongReason}
                    className="px-3 py-1 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: "var(--error-bg, #b91c1c)", color: "#fff" }}
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowWrongForm(false)}
                    className="px-3 py-1 text-xs rounded"
                    style={{ color: "var(--muted-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showCorrection && (
              <div
                className="mt-2 space-y-2 rounded-xl p-3"
                style={{
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--subtle-bg)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--conv-text)" }}>What should the answer be?</p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="Enter the correct answer or note..."
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded px-2 py-1 text-xs resize-none"
                  style={{
                    border: "1px solid var(--input-border)",
                    backgroundColor: "var(--input-bg)",
                    color: "var(--input-text)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitFeedback("CORRECTION", { correction: correctionText })}
                    disabled={saving || !correctionText.trim()}
                    className="px-3 py-1 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: "var(--btn-primary-bg, #b45309)", color: "var(--btn-primary-text, #fff)" }}
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowCorrection(false)}
                    className="px-3 py-1 text-xs rounded"
                    style={{ color: "var(--muted-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
