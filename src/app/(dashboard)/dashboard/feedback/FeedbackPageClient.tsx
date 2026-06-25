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

const TYPE_COLORS: Record<string, string> = {
  THUMBS_UP: "bg-green-100 text-green-800",
  THUMBS_DOWN: "bg-red-100 text-red-800",
  WRONG_ANSWER: "bg-red-100 text-red-800",
  CORRECTION: "bg-amber-100 text-amber-800",
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
      <div className="flex items-center justify-center h-64 text-zinc-400">
        Loading feedback...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <p className="text-lg font-medium">No feedback yet</p>
        <p className="text-sm mt-1">Rate AI responses in the chat to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((fb) => (
        <div key={fb.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[fb.type] || "bg-zinc-100 text-zinc-600"}`}>
              {TYPE_LABELS[fb.type] || fb.type}
            </span>
            <span className="text-xs text-zinc-400">
              {new Date(fb.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-zinc-600 bg-zinc-50 rounded p-2">
            {fb.message.content.length > 200
              ? fb.message.content.slice(0, 200) + "..."
              : fb.message.content}
          </div>
          {fb.reason && (
            <div className="text-xs text-zinc-500">
              <span className="font-medium">Reason:</span> {fb.reason}
            </div>
          )}
          {fb.correction && (
            <div className="text-xs text-zinc-500 bg-amber-50 rounded p-2">
              <span className="font-medium">Correction:</span> {fb.correction}
            </div>
          )}
          <a
            href={`/dashboard/chat/${fb.message.conversationId}`}
            className="text-xs text-blue-600 hover:underline inline-block"
          >
            View conversation &rarr;
          </a>
        </div>
      ))}
    </div>
  );
}
