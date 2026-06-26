"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const code = String(children).replace(/\n$/, "");
  return (
    <div
      className="rounded-lg my-2 overflow-hidden text-sm"
      style={{ backgroundColor: "var(--code-bg)", border: "1px solid var(--code-border)" }}
    >
      {className && (
        <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ backgroundColor: "var(--subtle-bg)", color: "var(--muted-text)", borderBottom: "1px solid var(--code-border)" }}>
          {className.replace("language-", "")}
        </div>
      )}
      <pre className="px-3 py-3 overflow-x-auto">
        <code style={{ color: "var(--code-text)" }}>{code}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-sm"
      style={{ backgroundColor: "var(--code-bg)", color: "var(--code-text)", border: "1px solid var(--code-border)" }}
    >
      {children}
    </code>
  );
}

function Table({ children }: { children?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto my-2">
      <table
        className="w-full text-sm border-collapse rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        {children}
      </table>
    </div>
  );
}

function TableCell({ children, isHeader }: { children?: React.ReactNode; isHeader?: boolean }) {
  const Tag = isHeader ? "th" : "td";
  return (
    <Tag
      className="px-3 py-2 text-left"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        borderRight: "1px solid var(--border-subtle)",
        fontWeight: isHeader ? 600 : 400,
        backgroundColor: isHeader ? "var(--subtle-bg)" : "transparent",
        color: isHeader ? "var(--surface-text)" : "var(--surface-text)",
      }}
    >
      {children}
    </Tag>
  );
}

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
      if (extra) Object.assign(body, extra);

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
  const showActions = !isUser && conversationId;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5"
        style={{
          backgroundColor: isUser ? "var(--bubble-user-bg)" : "var(--bubble-assistant-bg)",
          color: isUser ? "var(--bubble-user-text)" : "var(--bubble-assistant-text)",
          borderBottomRightRadius: isUser ? "4px" : undefined,
          borderBottomLeftRadius: !isUser ? "4px" : undefined,
        }}
      >
        <div dir="auto" className="leading-relaxed text-[15px] space-y-2 [&>p]:leading-relaxed [&>p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:opacity-80 [&_hr]:my-3 [&_hr]:opacity-30">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeStr = String(children);
                if (match || codeStr.includes("\n")) {
                  return <CodeBlock className={className}>{codeStr}</CodeBlock>;
                }
                return <InlineCode>{codeStr}</InlineCode>;
              },
              table({ children }) {
                return <Table>{children}</Table>;
              },
              th({ children }) {
                return <TableCell isHeader>{children}</TableCell>;
              },
              td({ children }) {
                return <TableCell>{children}</TableCell>;
              },
              a({ href, children }) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 hover:opacity-80">
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {showMeta && (
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {memoryUsed && (
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--muted-text)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Memory used
              </span>
            )}
            {memoriesUsed && memoriesUsed.length > 0 && (
              <details className="mt-1">
                <summary className="text-[11px] cursor-pointer" style={{ color: "var(--muted-text)" }}>
                  Show memories ({memoriesUsed.length})
                </summary>
                <ul className="mt-1 space-y-1">
                  {memoriesUsed.map((mu) => (
                    <li key={mu.id} className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                      {mu.summary}
                      <span className="ml-1 opacity-60">({mu.relevanceLabel})</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {webSearchUsed && (
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--muted-text)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Web search used
              </span>
            )}
            {citations && citations.length > 0 && (
              <details className="mt-1">
                <summary className="text-[11px] cursor-pointer" style={{ color: "var(--muted-text)" }}>
                  Sources ({citations.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {citations.map((c, i) => (
                    <li key={i} className="text-[11px]">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-1 underline-offset-2" style={{ color: "var(--info-text)" }}>
                        {c.title}
                      </a>
                      <span className="ml-1" style={{ color: "var(--muted-text)" }}>({safeHostname(c.url)})</span>
                      <p className="mt-0.5" style={{ color: "var(--muted-text)" }}>{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {(candidatesExtracted ?? 0) > 0 && (
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--muted-text)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Learned {candidatesExtracted} item{candidatesExtracted !== 1 ? "s" : ""}
              </span>
            )}

            {showActions && (
              <div className="flex items-center gap-1 pt-1.5">
                <button
                  onClick={() => feedback?.type === "THUMBS_UP" ? removeFeedback() : submitFeedback("THUMBS_UP")}
                  disabled={saving}
                  className="text-[11px] px-2 py-1 rounded-md transition-all duration-100"
                  style={{
                    backgroundColor: feedback?.type === "THUMBS_UP" ? "var(--btn-secondary-bg)" : "transparent",
                    color: feedback?.type === "THUMBS_UP" ? "var(--btn-secondary-text)" : "var(--muted-text)",
                  }}
                  onMouseEnter={(e) => { if (feedback?.type !== "THUMBS_UP") { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; e.currentTarget.style.color = "var(--btn-secondary-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "THUMBS_UP") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  aria-label="Thumbs up"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48a4.64 4.64 0 01-1.573-.272M6.633 10.5H4.5m2.133 0v5.25m0-5.25c0 .328-.053.64-.107.957a10.271 10.271 0 01-.527 1.906m0 0a5.158 5.158 0 01-.969 1.843m.969-1.843c.213-.008.428-.018.642-.027m0 0c.14.005.28.009.42.014M5.25 15.75a3.75 3.75 0 003.75 3.75M5.25 15.75a3.75 3.75 0 01-3.75-3.75m0 0c0-1.036.284-2.01.716-2.848" />
                  </svg>
                </button>
                <button
                  onClick={() => feedback?.type === "THUMBS_DOWN" ? removeFeedback() : submitFeedback("THUMBS_DOWN")}
                  disabled={saving}
                  className="text-[11px] px-2 py-1 rounded-md transition-all duration-100"
                  style={{
                    backgroundColor: feedback?.type === "THUMBS_DOWN" ? "var(--error-bg)" : "transparent",
                    color: feedback?.type === "THUMBS_DOWN" ? "var(--error-text)" : "var(--muted-text)",
                  }}
                  onMouseEnter={(e) => { if (feedback?.type !== "THUMBS_DOWN") { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; e.currentTarget.style.color = "var(--btn-secondary-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "THUMBS_DOWN") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  aria-label="Thumbs down"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 001.302-4.665c0-1.142-.194-2.238-.548-3.26.15-.344.216-.698.216-1.057 0-.54-.158-1.045-.425-1.469" />
                  </svg>
                </button>
                <button
                  onClick={() => { setShowWrongForm(!showWrongForm); setShowCorrection(false); }}
                  disabled={!conversationId}
                  className="text-[11px] px-2 py-1 rounded-md transition-all duration-100"
                  style={{
                    backgroundColor: feedback?.type === "WRONG_ANSWER" ? "var(--error-bg)" : "transparent",
                    color: feedback?.type === "WRONG_ANSWER" ? "var(--error-text)" : "var(--muted-text)",
                  }}
                  onMouseEnter={(e) => { if (feedback?.type !== "WRONG_ANSWER") { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; e.currentTarget.style.color = "var(--btn-secondary-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "WRONG_ANSWER") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  aria-label="Mark as wrong"
                >
                  Wrong
                </button>
                <button
                  onClick={() => { setShowCorrection(!showCorrection); setShowWrongForm(false); }}
                  disabled={!conversationId}
                  className="text-[11px] px-2 py-1 rounded-md transition-all duration-100"
                  style={{
                    backgroundColor: feedback?.type === "CORRECTION" ? "var(--btn-secondary-bg)" : "transparent",
                    color: feedback?.type === "CORRECTION" ? "var(--btn-secondary-text)" : "var(--muted-text)",
                  }}
                  onMouseEnter={(e) => { if (feedback?.type !== "CORRECTION") { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; e.currentTarget.style.color = "var(--btn-secondary-text)"; } }}
                  onMouseLeave={(e) => { if (feedback?.type !== "CORRECTION") { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--muted-text)"; } }}
                  aria-label="Submit correction"
                >
                  Fix
                </button>
              </div>
            )}

            {showWrongForm && (
              <div className="mt-2 space-y-2 rounded-xl p-3" style={{ backgroundColor: "var(--subtle-bg)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--surface-text)" }}>Why is this wrong?</p>
                <select
                  value={wrongReason}
                  onChange={(e) => setWrongReason(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
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
                    className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "var(--error-text)", color: "#fff" }}
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowWrongForm(false)}
                    className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={{ color: "var(--muted-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showCorrection && (
              <div className="mt-2 space-y-2 rounded-xl p-3" style={{ backgroundColor: "var(--subtle-bg)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--surface-text)" }}>What should the answer be?</p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="Enter the correct answer or note..."
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-lg px-2 py-1.5 text-xs resize-none outline-none"
                  style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitFeedback("CORRECTION", { correction: correctionText })}
                    disabled={saving || !correctionText.trim()}
                    className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "var(--warning-text)", color: "#fff" }}
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowCorrection(false)}
                    className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={{ color: "var(--muted-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-secondary-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs mt-1" style={{ color: "var(--error-text)" }}>{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
