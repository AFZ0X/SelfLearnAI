"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatPageProps {
  provider?: string;
  initialConversations: Conversation[];
}

export function ChatPage({ provider, initialConversations }: ChatPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // ignore
    }
  }

  const handleNew = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const empty = conversations.find(
        (c) => c.messageCount === 0 && c.title === "New conversation"
      );
      if (empty) {
        setActiveId(empty.id);
        return;
      }
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
          setActiveId(conv.id);
        }
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }, [creating, conversations]);

  async function handleRename(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 200) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
        );
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => {
          const remaining = prev.filter((c) => c.id !== id);
          if (activeId === id) {
            const next = remaining[0];
            setActiveId(next ? next.id : null);
          }
          return remaining;
        });
      }
    } catch {
      // ignore
    }
  }

  async function handleConversationCreated(id: string) {
    setActiveId(id);
    await fetchConversations();
  }

  return (
    <div
      className="flex flex-1"
      style={{ backgroundColor: "var(--surface-bg)", color: "var(--surface-text)" }}
    >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onRename={handleRename}
        onDelete={handleDelete}
        creating={creating}
      />
      <div className="flex flex-1 flex-col min-h-0">
        <header
          className="h-14 px-6 flex items-center shrink-0"
          style={{
            backgroundColor: "var(--header-bg)",
            borderBottom: "1px solid var(--header-border)",
          }}
        >
          <div>
            <h1 className="font-semibold text-base" style={{ color: "var(--surface-text)" }}>Chat</h1>
            <p className="text-xs leading-none mt-0.5" style={{ color: "var(--sidebar-text-muted)" }}>AI conversation workspace</p>
          </div>
        </header>
        <ChatWindow
          conversationId={activeId}
          provider={provider}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
