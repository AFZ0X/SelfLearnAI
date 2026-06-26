"use client";

import { useEffect, useState } from "react";

interface FeedbackItem {
  id: string;
  type: string;
  rating: string;
  reason: string | null;
  correction: string | null;
  createdAt: string;
  message: {
    id: string;
    content: string;
    role: string;
    conversationId: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  THUMBS_UP: "Thumbs Up",
  THUMBS_DOWN: "Thumbs Down",
  WRONG_ANSWER: "Wrong Answer",
  CORRECTION: "Correction",
};

export function FeedbackPageClient() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.feedback) {
          setFeedback(data.feedback);
        }
      })
      .catch(() => setError("Failed to load feedback."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: "var(--subtle-bg)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
        {error}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--muted-text)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--subtle-bg)" }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <p className="text-base font-medium">No feedback yet</p>
        <p className="text-sm mt-1">Rate AI responses in the chat to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((fb) => (
        <div key={fb.id} className="rounded-xl border p-5 space-y-3" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: fb.type === "THUMBS_UP" ? "var(--success-bg)" : "var(--error-bg)",
                color: fb.type === "THUMBS_UP" ? "var(--success-text)" : "var(--error-text)",
              }}
            >
              {TYPE_LABELS[fb.type] || fb.type}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-text)" }}>
              {new Date(fb.createdAt).toLocaleString()}
            </span>
          </div>
          <div
            className="text-sm rounded-xl p-3"
            style={{ color: "var(--surface-text-secondary)", backgroundColor: "var(--subtle-bg)" }}
          >
            {fb.message.content.length > 200
              ? fb.message.content.slice(0, 200) + "..."
              : fb.message.content}
          </div>
          {fb.reason && (
            <div className="text-xs" style={{ color: "var(--muted-text)" }}>
              <span className="font-medium">Reason:</span> {fb.reason}
            </div>
          )}
          {fb.correction && (
            <div className="text-xs rounded-xl p-3" style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning-text)" }}>
              <span className="font-medium">Correction:</span> {fb.correction}
            </div>
          )}
          <a
            href={`/dashboard/chat/${fb.message.conversationId}`}
            className="text-xs inline-flex items-center gap-1 transition-colors"
            style={{ color: "var(--info-text)" }}
          >
            View conversation
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}
