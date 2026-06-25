"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateSafe } from "@/lib/format/date";

type TabId =
  | "overview"
  | "users"
  | "conversations"
  | "memories"
  | "learning"
  | "feedback"
  | "sources"
  | "health";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "conversations", label: "Conversations" },
  { id: "memories", label: "Memories" },
  { id: "learning", label: "Learning" },
  { id: "feedback", label: "Feedback" },
  { id: "sources", label: "Sources" },
  { id: "health", label: "Health" },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface MemoryItem {
  id: string;
  userId: string;
  type: string;
  summary: string | null;
  tags: string[];
  confidence: number | null;
  visibility: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LearningCandidate {
  id: string;
  userId: string;
  conversationId: string | null;
  summary: string | null;
  sensitivity: string;
  status: string;
  confidence: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface FeedbackItem {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  type: string;
  rating: string;
  reason: string | null;
  createdAt: string;
}

interface WebSource {
  id: string;
  userId: string;
  conversationId: string | null;
  url: string;
  title: string | null;
  snippet: string | null;
  provider: string;
  createdAt: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  counts: {
    users: number;
    conversations: number;
    memories: number;
    learningCandidates: number;
    feedback: number;
    webSources: number;
  } | null;
  error?: string;
}

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [candidates, setCandidates] = useState<LearningCandidate[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [sources, setSources] = useState<WebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null);

  const apiFetch = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return res.json();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch("/api/admin/health").then((d) => { if (!cancelled) setHealth(d); }).catch(() => {}),
      apiFetch("/api/admin/users").then((d) => { if (!cancelled && d.users) setUsers(d.users); }).catch(() => {}),
      apiFetch("/api/admin/conversations").then((d) => { if (!cancelled && d.conversations) setConversations(d.conversations); }).catch(() => {}),
      apiFetch("/api/admin/memories").then((d) => { if (!cancelled && d.memories) setMemories(d.memories); }).catch(() => {}),
      apiFetch("/api/admin/learning-candidates").then((d) => { if (!cancelled && d.candidates) setCandidates(d.candidates); }).catch(() => {}),
      apiFetch("/api/admin/feedback").then((d) => { if (!cancelled && d.feedback) setFeedback(d.feedback); }).catch(() => {}),
      apiFetch("/api/admin/web-sources").then((d) => { if (!cancelled && d.sources) setSources(d.sources); }).catch(() => {}),
    ])
      .catch(() => { if (!cancelled) setError("Failed to load admin data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiFetch]);

  async function handleDelete(type: "memories" | "learning-candidates", id: string) {
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      if (type === "memories") {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
      }
      setActionMsg("Deleted successfully.");
      setDeleteConfirm(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Role update failed.");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setActionMsg(`Role changed to ${newRole}.`);
      setRoleChangeId(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Role update failed.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--muted-text)" }}>
        Loading admin panel...
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">
          Admin Only
        </span>
      </div>

      {actionMsg && (
        <div className="rounded-lg px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          {actionMsg}
        </div>
      )}

      <div className="border-b">
        <nav className="flex gap-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm pb-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900 font-medium"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <OverviewTab health={health} />
      )}
      {activeTab === "users" && (
        <UsersTab
          users={users}
          roleChangeId={roleChangeId}
          setRoleChangeId={setRoleChangeId}
          onRoleChange={handleRoleChange}
        />
      )}
      {activeTab === "conversations" && (
        <ConversationsTab conversations={conversations} />
      )}
      {activeTab === "memories" && (
        <MemoriesTab
          memories={memories}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          onDelete={(id) => handleDelete("memories", id)}
        />
      )}
      {activeTab === "learning" && (
        <LearningTab
          candidates={candidates}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          onDelete={(id) => handleDelete("learning-candidates", id)}
        />
      )}
      {activeTab === "feedback" && (
        <FeedbackTab feedback={feedback} />
      )}
      {activeTab === "sources" && (
        <SourcesTab sources={sources} />
      )}
      {activeTab === "health" && (
        <HealthTab health={health} />
      )}
    </div>
  );
}

function OverviewTab({ health }: { health: HealthData | null }) {
  if (!health?.counts) {
    return <p className="text-zinc-500 text-sm">Health data not available.</p>;
  }

  const { counts } = health;
  const cards = [
    { label: "Total Users", value: counts.users },
    { label: "Conversations", value: counts.conversations },
    { label: "Memories", value: counts.memories },
    { label: "Learning Candidates", value: counts.learningCandidates },
    { label: "Feedback Records", value: counts.feedback },
    { label: "Web Sources", value: counts.webSources },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border p-4">
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="text-2xl font-semibold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{ color: "var(--muted-text)" }}>
        Status: {health.status} &middot; Last updated:{" "}
        {new Date(health.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

function UsersTab({
  users,
  roleChangeId,
  setRoleChangeId,
  onRoleChange,
}: {
  users: User[];
  roleChangeId: string | null;
  setRoleChangeId: (id: string | null) => void;
  onRoleChange: (userId: string, role: string) => void;
}) {
  if (users.length === 0) {
    return <p className="text-zinc-500 text-sm">No users found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Email</th>
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Role</th>
            <th className="pb-2 pr-4">Created</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{u.email}</td>
              <td className="py-2 pr-4">{u.name || "-"}</td>
              <td className="py-2 pr-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.role === "ADMIN"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="py-2 pr-4 text-zinc-500">
                {formatDateSafe(u.createdAt)}
              </td>
              <td className="py-2">
                {roleChangeId === u.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onRoleChange(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
                    >
                      {u.role === "ADMIN" ? "Demote to USER" : "Promote to ADMIN"}
                    </button>
                    <button
                      onClick={() => setRoleChangeId(null)}
                      className="text-xs px-2 py-1 rounded text-zinc-500 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRoleChangeId(u.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-zinc-50"
                  >
                    Change Role
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConversationsTab({
  conversations,
}: {
  conversations: Conversation[];
}) {
  if (conversations.length === 0) {
    return <p className="text-zinc-500 text-sm">No conversations found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Title</th>
            <th className="pb-2 pr-4">User ID</th>
            <th className="pb-2 pr-4">Messages</th>
            <th className="pb-2 pr-4">Created</th>
            <th className="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 pr-4 max-w-[200px] truncate">{c.title}</td>
              <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{c.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">{c._count.messages}</td>
              <td className="py-2 pr-4 text-zinc-500">
                {formatDateSafe(c.createdAt)}
              </td>
              <td className="py-2 text-zinc-500">
                {formatDateSafe(c.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemoriesTab({
  memories,
  deleteConfirm,
  setDeleteConfirm,
  onDelete,
}: {
  memories: MemoryItem[];
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  if (memories.length === 0) {
    return <p className="text-zinc-500 text-sm">No memories found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Summary</th>
            <th className="pb-2 pr-4">User ID</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Tags</th>
            <th className="pb-2 pr-4">Confidence</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {memories.map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2 pr-4 max-w-[200px] truncate">{m.summary || "(no summary)"}</td>
              <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{m.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100">{m.type}</span>
              </td>
              <td className="py-2 pr-4 text-xs text-zinc-500">
                {m.tags.length > 0 ? m.tags.join(", ") : "-"}
              </td>
              <td className="py-2 pr-4">{m.confidence?.toFixed(2) ?? "-"}</td>
              <td className="py-2">
                {deleteConfirm === m.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded text-zinc-500 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(m.id)}
                    className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearningTab({
  candidates,
  deleteConfirm,
  setDeleteConfirm,
  onDelete,
}: {
  candidates: LearningCandidate[];
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return <p className="text-zinc-500 text-sm">No learning candidates found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Summary</th>
            <th className="pb-2 pr-4">User ID</th>
            <th className="pb-2 pr-4">Sensitivity</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Confidence</th>
            <th className="pb-2 pr-4">Created</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 pr-4 max-w-[200px] truncate">{c.summary || "(no summary)"}</td>
              <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{c.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">
                <SensitivityBadge level={c.sensitivity} />
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-2 pr-4">{c.confidence?.toFixed(2) ?? "-"}</td>
              <td className="py-2 pr-4 text-zinc-500 text-xs">
                {formatDateSafe(c.createdAt)}
              </td>
              <td className="py-2">
                {deleteConfirm === c.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded text-zinc-500 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackTab({ feedback }: { feedback: FeedbackItem[] }) {
  if (feedback.length === 0) {
    return <p className="text-zinc-500 text-sm">No feedback records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Rating</th>
            <th className="pb-2 pr-4">User ID</th>
            <th className="pb-2 pr-4">Reason</th>
            <th className="pb-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {feedback.map((f) => (
            <tr key={f.id} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <span className="text-xs font-medium">{f.type}</span>
              </td>
              <td className="py-2 pr-4">{f.rating}</td>
              <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{f.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4 max-w-[150px] truncate text-xs text-zinc-500">
                {f.reason || "-"}
              </td>
              <td className="py-2 text-zinc-500 text-xs">
                {formatDateSafe(f.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcesTab({ sources }: { sources: WebSource[] }) {
  if (sources.length === 0) {
    return <p className="text-zinc-500 text-sm">No web sources found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 pr-4">Title</th>
            <th className="pb-2 pr-4">URL</th>
            <th className="pb-2 pr-4">Provider</th>
            <th className="pb-2 pr-4">User ID</th>
            <th className="pb-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="py-2 pr-4 max-w-[200px] truncate">{s.title || "(no title)"}</td>
              <td className="py-2 pr-4 max-w-[200px] truncate text-xs text-blue-600">
                {s.url}
              </td>
              <td className="py-2 pr-4 text-xs">{s.provider}</td>
              <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{s.userId.slice(0, 12)}...</td>
              <td className="py-2 text-zinc-500 text-xs">
                {formatDateSafe(s.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthTab({ health }: { health: HealthData | null }) {
  if (!health) {
    return <p className="text-zinc-500 text-sm">Health data not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            health.status === "healthy" ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="font-medium capitalize">{health.status}</span>
        <span className="text-xs" style={{ color: "var(--muted-text)" }}>
          {new Date(health.timestamp).toLocaleString()}
        </span>
      </div>

      {health.error && (
        <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {health.error}
        </div>
      )}

      {health.counts && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(health.counts).map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3">
              <p className="text-xs text-zinc-500 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="text-xl font-semibold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border p-4 text-sm text-zinc-600 space-y-1">
        <p className="font-medium">System Info</p>
        <p>Database: PostgreSQL 18 with pgvector</p>
        <p>Framework: Next.js 16.2.9 (Turbopack)</p>
        <p>Auth: NextAuth v5 (JWT strategy)</p>
      </div>
    </div>
  );
}

function SensitivityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-red-100 text-red-800",
    SECRET: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full ${colors[level] || "bg-zinc-100"}`}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full ${colors[status] || "bg-zinc-100"}`}
    >
      {status}
    </span>
  );
}
