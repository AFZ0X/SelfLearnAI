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
  onToggleSidebar?: () => void;
}

export function ChatWindow({
  conversationId,
  provider,
  onConversationCreated,
  onToggleSidebar,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convTitle, setConvTitle] = useState("Chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          if (data) {
            setConvTitle(data.title || "Chat");
            if (data.messages) {
              setMessages(
                data.messages.map((m: Message) => ({
                  id: m.id,
                  role: m.role as "user" | "assistant",
                  content: m.content,
                }))
              );
            }
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
    } else {
      Promise.resolve().then(() => {
        setConvTitle("Chat");
        setMessages([]);
      });
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [input, adjustTextarea]);

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
  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: "var(--surface-bg)" }}>
      {/* Conversation Header */}
      <header
        className="flex items-center gap-3 px-6 h-14 shrink-0"
        style={{ borderBottom: "1px solid var(--header-border)", backgroundColor: "var(--header-bg)" }}
      >
        <button
          onClick={onToggleSidebar}
          className="md:hidden w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ color: "var(--muted-text)" }}
          aria-label="Toggle conversation list"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate" style={{ color: "var(--surface-text)" }}>
            {conversationId ? convTitle : "New conversation"}
          </h1>
        </div>
        {conversationId && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md" style={{ backgroundColor: "var(--subtle-bg)", color: "var(--muted-text)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--success-text)" }} />
              AI Ready
            </span>
            {provider && (
              <span className="text-[11px] px-2 py-1 rounded-md" style={{ backgroundColor: "var(--subtle-bg)", color: "var(--muted-text)" }}>
                {provider}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Message Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!hasMessages && !loading ? (
          <div className="flex flex-col items-center justify-center h-full mx-auto max-w-[760px] px-4" style={{ animation: "fade-in 0.2s ease" }}>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--subtle-bg)" }}
            >
              <svg className="w-6 h-6" style={{ color: "var(--muted-text)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "var(--muted-text)" }}>
              {conversationId ? "No messages yet" : "Start a conversation"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
              Send a message to begin chatting.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-[760px] px-4 py-6 space-y-4" style={{ animation: "fade-in 0.2s ease" }}>
            {messages.map((msg, i) => (
              <div key={msg.id || i} style={{ animation: "slide-up 0.15s ease" }}>
                <MessageBubble
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
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-5 py-4 text-sm"
                  style={{ backgroundColor: "var(--bubble-assistant-bg)", color: "var(--muted-text)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--muted-text)", animation: "pulse-dot 1.4s infinite" }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--muted-text)", animation: "pulse-dot 1.4s infinite", animationDelay: "0.2s" }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--muted-text)", animation: "pulse-dot 1.4s infinite", animationDelay: "0.4s" }} />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="shrink-0"
        style={{ borderTop: "1px solid var(--composer-border)", backgroundColor: "var(--composer-bg)" }}
      >
        <div className="mx-auto max-w-[760px] px-4 py-4">
          <div
            className="flex items-end gap-2 rounded-xl px-4 py-3 transition-all duration-150"
            style={{
              backgroundColor: "var(--input-bg)",
              border: "1px solid var(--input-border)",
            }}
          >
            {/* Attachment placeholder */}
            <button
              className="shrink-0 p-1 rounded-md transition-colors"
              style={{ color: "var(--muted-text)" }}
              disabled
              aria-label="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              maxLength={4000}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed min-h-[24px] max-h-[200px] disabled:opacity-50"
              style={{ color: "var(--input-text)" }}
            />

            <div className="flex items-center gap-1 shrink-0">
              <span
                className="text-[10px] hidden sm:block transition-opacity"
                style={{ color: "var(--muted-text)", opacity: loading ? 0 : input.trim() ? 0 : 1 }}
              >
                ↵
              </span>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-1.5 rounded-lg transition-all duration-150 disabled:opacity-30"
                style={{
                  backgroundColor: input.trim() && !loading ? "var(--btn-primary-bg)" : "transparent",
                  color: input.trim() && !loading ? "var(--btn-primary-text)" : "var(--muted-text)",
                }}
                aria-label="Send message"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isMock && (
            <p className="text-[11px] text-center mt-2" style={{ color: "var(--muted-text)" }}>
              Mock mode. Set AI_PROVIDER=openai or deepseek for real responses.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
