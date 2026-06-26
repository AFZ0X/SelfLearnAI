"use client";

import { useState, useMemo, useRef, useEffect } from "react";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ConvSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  creating?: boolean;
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) return "Today";
  if (diff < 2 * dayMs) return "Yesterday";
  if (diff < 7 * dayMs) return "Previous 7 days";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 7 * dayMs) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  creating = false,
}: ConvSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  function startRename(conv: Conversation) {
    setEditingId(conv.id);
    setEditValue(conv.title);
    setContextMenu(null);
  }

  function submitRename() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, Conversation[]> = {};
    for (const conv of filtered) {
      const group = getDateGroup(conv.updatedAt || conv.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(conv);
    }
    return groups;
  }, [filtered]);

  const groupOrder = useMemo(() => {
    const priority = ["Today", "Yesterday", "Previous 7 days"];
    const keys = Object.keys(grouped);
    const ordered: string[] = [];
    for (const p of priority) {
      if (keys.includes(p)) {
        ordered.push(p);
        keys.splice(keys.indexOf(p), 1);
      }
    }
    ordered.push(...keys.sort());
    return ordered;
  }, [grouped]);

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: "320px",
        backgroundColor: "var(--conv-bg)",
        borderRight: "1px solid var(--conv-border)",
      }}
    >
      {/* Header with new button */}
      <div className="flex items-center gap-2 px-3 h-14 shrink-0" style={{ borderBottom: "1px solid var(--conv-border)" }}>
        <button
          onClick={onNew}
          disabled={creating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40"
          style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          onMouseEnter={(e) => { if (!creating) e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {creating ? "Creating..." : "New chat"}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ backgroundColor: "var(--conv-search-bg)" }}
        >
          <svg className="w-4 h-4 shrink-0" style={{ color: "var(--conv-text-muted)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--conv-text)", placeholderColor: "var(--conv-text-muted)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-xs" style={{ color: "var(--conv-text-muted)" }} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {creating && conversations.length === 0 && (
          <div className="space-y-2 px-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: "var(--conv-hover-bg)" }} />
            ))}
          </div>
        )}

        {!creating && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            {searchQuery ? (
              <>
                <p className="text-sm font-medium" style={{ color: "var(--conv-text)" }}>No results</p>
                <p className="text-xs mt-1" style={{ color: "var(--conv-text-muted)" }}>
                  No conversations matching "{searchQuery}"
                </p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--conv-hover-bg)" }}>
                  <svg className="w-5 h-5" style={{ color: "var(--conv-text-muted)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--conv-text)" }}>No conversations</p>
                <p className="text-xs mt-1" style={{ color: "var(--conv-text-muted)" }}>
                  Start a new chat to begin.
                </p>
              </>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-4">
            {groupOrder.map((group) => (
              <div key={group}>
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--conv-text-muted)" }}>
                    {group}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {grouped[group].map((conv) => {
                    const isActive = activeId === conv.id;
                    return (
                      <div key={conv.id} className="relative">
                        <button
                          className="group flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150"
                          style={{
                            backgroundColor: isActive ? "var(--conv-active-bg)" : "transparent",
                            color: isActive ? "var(--conv-active-text)" : "var(--conv-text-muted)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = "var(--conv-hover-bg)";
                              e.currentTarget.style.color = "var(--conv-text)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "var(--conv-text-muted)";
                            }
                          }}
                          onClick={() => onSelect(conv.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ id: conv.id, x: e.clientX, y: e.clientY });
                          }}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <svg className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--conv-text)" : "var(--conv-text-muted)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {editingId === conv.id ? (
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={submitRename}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitRename();
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 px-1.5 py-0.5 rounded text-sm outline-none"
                              style={{
                                backgroundColor: "var(--input-bg)",
                                color: "var(--input-text)",
                                border: "1px solid var(--input-border)",
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="flex-1 truncate text-left">{conv.title}</span>
                          )}
                          <span className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--conv-text-muted)" }}>
                            {formatTime(conv.updatedAt || conv.createdAt)}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg border py-1 shadow-lg min-w-[140px]"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const conv = conversations.find((c) => c.id === contextMenu.id);
            if (!conv) return null;
            return (
              <>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "var(--surface-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--conv-hover-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  onClick={() => startRename(conv)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Rename
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "var(--error-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--error-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  onClick={() => {
                    if (window.confirm("Delete this conversation?")) {
                      onDelete(conv.id);
                    }
                    setContextMenu(null);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}
    </aside>
  );
}
