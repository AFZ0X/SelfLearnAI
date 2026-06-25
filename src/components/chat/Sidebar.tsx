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
    <aside className="w-[280px] flex flex-col bg-zinc-950 border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800">
        <button
          onClick={onNew}
          className="w-full px-3 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 transition-colors"
        >
          + New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-sm text-zinc-500 text-center">
            No conversations yet.
          </p>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-1 px-3 py-3 cursor-pointer text-sm border-l-[3px] ${
              activeId === conv.id
                ? "border-zinc-100 bg-zinc-900 text-zinc-100"
                : "border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
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
                className="flex-1 px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{conv.title}</span>
            )}

            {activeId === conv.id && editingId !== conv.id && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(conv);
                  }}
                  className="px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800"
                >
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-300 rounded hover:bg-zinc-800"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
