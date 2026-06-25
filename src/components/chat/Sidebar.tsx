"use client";

import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startRename(conv: Conversation) {
    setEditingId(conv.id);
    setEditValue(conv.title);
  }

  function submitRename() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }

  return (
    <aside
      className="w-[280px] flex flex-col"
      style={{ backgroundColor: "var(--conv-bg)", borderRight: "1px solid var(--conv-border)" }}
    >
      <div className="p-3" style={{ borderBottom: "1px solid var(--conv-border)" }}>
        <button
          onClick={onNew}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
        >
          + New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: "var(--conv-text-muted)" }}
          >
            No conversations yet.
          </p>
        )}

        {conversations.map((conv) => {
          const isActive = activeId === conv.id;
          return (
          <div
            key={conv.id}
            className="group flex items-center gap-1 px-3 py-3 cursor-pointer text-sm border-l-[3px]"
            style={{
              borderLeftColor: isActive ? "var(--conv-item-active-border)" : "transparent",
              backgroundColor: isActive ? "var(--conv-item-active-bg)" : "transparent",
              color: isActive ? "var(--conv-text)" : "var(--conv-text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "var(--conv-item-hover-bg)";
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
          >
            {editingId === conv.id ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 px-1 py-0.5 rounded text-sm focus:outline-none focus:ring-1"
                style={{
                  border: "1px solid var(--conv-border)",
                  backgroundColor: "var(--subtle-bg)",
                  color: "var(--conv-text)",
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{conv.title}</span>
            )}

            {isActive && editingId !== conv.id && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(conv); }}
                  className="px-1.5 py-0.5 text-xs rounded"
                  style={{ color: "var(--conv-text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--conv-item-hover-bg)"; e.currentTarget.style.color = "var(--conv-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--conv-text-muted)"; }}
                >
                  Rename
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-300 rounded"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--conv-item-hover-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </aside>
  );
}
