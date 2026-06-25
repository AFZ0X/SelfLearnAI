"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";

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

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  memoryUsed?: boolean;
  memoriesUsed?: MemoryUsedInfo[];
  webSearchUsed?: boolean;
  citations?: Citation[];
  candidatesExtracted?: number;
  conversationId?: string;
  feedback?: FeedbackState | null;
}

interface ChatWindowProps {
  conversationId: string | null;
  provider?: string;
  onConversationCreated?: (id: string) => void;
}

export function ChatWindow({
  conversationId,
  provider,
  onConversationCreated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleFeedbackChange = useCallback((messageId: string, fb: FeedbackState | null) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: fb } : m))
    );
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.messages) {
            setMessages(
              data.messages.map((m: Message) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
              }))
            );
          }
        });

      fetch(`/api/feedback?conversationId=${conversationId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.feedback) {
            setMessages((prev) =>
              prev.map((m) => {
                const fb = data.feedback.find((f: { messageId: string }) => f.messageId === m.id);
                return fb ? { ...m, feedback: { type: fb.type, reason: fb.reason, correction: fb.correction } } : m;
              })
            );
          }
        });
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ensureConversation(): Promise<string | null> {
    if (conversationId) return conversationId;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.conversation?.id) {
        onConversationCreated?.(data.conversation.id);
        return data.conversation.id;
      }
    } catch {
      // fall through
    }
    return null;
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput("");
    setError(null);

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      activeConversationId = await ensureConversation();
      if (!activeConversationId) {
        setError("Failed to create conversation.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: trimmed }],
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant",
          content: data.content,
          memoryUsed: data.memoryUsed || false,
          memoriesUsed: data.memoriesUsed || undefined,
          webSearchUsed: data.webSearchUsed || false,
          citations: data.citations || undefined,
          candidatesExtracted: data.candidatesExtracted || undefined,
          conversationId: data.conversationId || activeConversationId,
        },
      ]);
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isMock = provider === "mock";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-[760px] py-6 space-y-5">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-zinc-400">
                {conversationId ? "No messages yet" : "Start a conversation"}
              </p>
              <p className="text-sm mt-1 text-zinc-500">
                Send a message to begin chatting with the AI.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id || i}
              id={msg.id}
              role={msg.role}
              content={msg.content}
              memoryUsed={msg.memoryUsed}
              memoriesUsed={msg.memoriesUsed}
              webSearchUsed={msg.webSearchUsed}
              citations={msg.citations}
              candidatesExtracted={msg.candidatesExtracted}
              conversationId={msg.conversationId || conversationId}
              feedback={msg.feedback ?? null}
              onFeedbackChange={handleFeedbackChange}
            />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-zinc-800 text-zinc-400 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950">
        <div className="mx-auto max-w-[760px]">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              maxLength={4000}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent disabled:opacity-50 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          {isMock && (
            <p className="text-xs text-zinc-600 text-center mt-2">
              Mock mode — no real AI connected. Set AI_PROVIDER=openai or deepseek for real responses.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
