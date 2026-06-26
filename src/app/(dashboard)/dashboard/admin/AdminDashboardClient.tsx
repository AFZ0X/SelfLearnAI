"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateSafe } from "@/lib/format/date";

type TabId =
  | "overview"
  | "users"
  | "conversations"
  | "warnings"
  | "audit-log"
  | "memories"
  | "learning"
  | "feedback"
  | "sources"
  | "health"
  | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "conversations", label: "Conversations" },
  { id: "warnings", label: "Warnings" },
  { id: "audit-log", label: "Audit Log" },
  { id: "logs", label: "Logs" },
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
  status: string;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    conversations: number;
    memories: number;
    feedback: number;
    warningsReceived: number;
  };
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

interface WarningItem {
  id: string;
  reason: string;
  note: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  admin: { id: string; email: string; name: string | null };
  user?: { id: string; email: string; name: string | null };
}

interface AuditLogItem {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  admin: { id: string; email: string; name: string | null };
  targetUser?: { id: string; email: string; name: string | null } | null;
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

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}
    >
      {text}
    </span>
  );
}

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [candidates, setCandidates] = useState<LearningCandidate[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [sources, setSources] = useState<WebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null);
  const [banConfirm, setBanConfirm] = useState<string | null>(null);
  const [banReasons, setBanReasons] = useState<Record<string, string>>({});
  const [unbanConfirm, setUnbanConfirm] = useState<string | null>(null);
  const [warnUserId, setWarnUserId] = useState<string | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [warnNote, setWarnNote] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"ALL" | "ACTIVE" | "BANNED">("ALL");

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

  useEffect(() => {
    if (activeTab === "warnings") {
      apiFetch("/api/admin/users?all_warnings=1")
        .then(() => {})
        .catch(() => {});
    }
  }, [activeTab, apiFetch]);

  useEffect(() => {
    if (activeTab === "warnings") {
      Promise.all(
        users.map((u) =>
          apiFetch(`/api/admin/users/${u.id}/warnings`)
            .then((d) => d.warnings || [])
            .catch(() => [] as WarningItem[])
        )
      ).then((nested) => {
        setWarnings(nested.flat().sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      });
    }
  }, [activeTab, users, apiFetch]);

  useEffect(() => {
    if (activeTab === "audit-log") {
      apiFetch("/api/admin/audit-log")
        .then((d) => { if (d.logs) setAuditLogs(d.logs); })
        .catch(() => {});
    }
  }, [activeTab, apiFetch]);

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

  async function handleBan(userId: string) {
    const reason = banReasons[userId];
    if (!reason?.trim()) {
      setActionMsg("Ban reason is required.");
      return;
    }
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ban failed.");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      setActionMsg("User banned.");
      setBanConfirm(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Ban failed.");
    }
  }

  async function handleUnban(userId: string) {
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unban failed.");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      setActionMsg("User unbanned.");
      setUnbanConfirm(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Unban failed.");
    }
  }

  async function handleWarn(userId: string) {
    if (!warnReason.trim()) {
      setActionMsg("Warning reason is required.");
      return;
    }
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/warnings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: warnReason.trim(),
          note: warnNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Warning failed.");
      setActionMsg("Warning issued.");
      setWarnUserId(null);
      setWarnReason("");
      setWarnNote("");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Warning failed.");
    }
  }

  const filteredUsers = users.filter((u) => {
    if (userFilter === "ACTIVE" && u.status !== "ACTIVE") return false;
    if (userFilter === "BANNED" && u.status !== "BANNED") return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !(u.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--muted-text)" }}>
        Loading admin panel...
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>Admin Dashboard</h2>
        <Badge text="Admin Only" bg="var(--warning-bg)" color="var(--warning-text)" />
      </div>

      {actionMsg && (
        <div className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: "var(--info-bg)", border: "1px solid var(--info-border)", color: "var(--info-text)" }}>
          {actionMsg}
        </div>
      )}

      <div className="border-b" style={{ borderColor: "var(--card-border)" }}>
        <nav className="flex gap-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="text-sm pb-2 border-b-2 transition-colors whitespace-nowrap"
              style={{
                borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "var(--surface-text)" : "var(--muted-text)",
                fontWeight: activeTab === tab.id ? 500 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && <OverviewTab health={health} />}
      {activeTab === "users" && (
        <UsersTab
          users={filteredUsers}
          roleChangeId={roleChangeId}
          setRoleChangeId={setRoleChangeId}
          onRoleChange={handleRoleChange}
          banConfirm={banConfirm}
          setBanConfirm={setBanConfirm}
          banReasons={banReasons}
          setBanReasons={setBanReasons}
          onBan={handleBan}
          unbanConfirm={unbanConfirm}
          setUnbanConfirm={setUnbanConfirm}
          onUnban={handleUnban}
          warnUserId={warnUserId}
          setWarnUserId={setWarnUserId}
          warnReason={warnReason}
          setWarnReason={setWarnReason}
          warnNote={warnNote}
          setWarnNote={setWarnNote}
          onWarn={handleWarn}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
        />
      )}
      {activeTab === "conversations" && <ConversationsTab conversations={conversations} />}
      {activeTab === "warnings" && <WarningsTab warnings={warnings} />}
      {activeTab === "audit-log" && <AuditLogTab logs={auditLogs} />}
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
      {activeTab === "feedback" && <FeedbackTab feedback={feedback} />}
      {activeTab === "sources" && <SourcesTab sources={sources} />}
      {activeTab === "logs" && <LogsTab />}
      {activeTab === "health" && <HealthTab health={health} />}
    </div>
  );
}

function OverviewTab({ health }: { health: HealthData | null }) {
  if (!health?.counts) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Health data not available.</p>;
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
          <div key={card.label} className="rounded-lg border p-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>{card.label}</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: "var(--surface-text)" }}>{card.value}</p>
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
  banConfirm,
  setBanConfirm,
  banReasons,
  setBanReasons,
  onBan,
  unbanConfirm,
  setUnbanConfirm,
  onUnban,
  warnUserId,
  setWarnUserId,
  warnReason,
  setWarnReason,
  warnNote,
  setWarnNote,
  onWarn,
  userSearch,
  setUserSearch,
  userFilter,
  setUserFilter,
}: {
  users: User[];
  roleChangeId: string | null;
  setRoleChangeId: (id: string | null) => void;
  onRoleChange: (userId: string, role: string) => void;
  banConfirm: string | null;
  setBanConfirm: (id: string | null) => void;
  banReasons: Record<string, string>;
  setBanReasons: (r: Record<string, string>) => void;
  onBan: (userId: string) => void;
  unbanConfirm: string | null;
  setUnbanConfirm: (id: string | null) => void;
  onUnban: (userId: string) => void;
  warnUserId: string | null;
  setWarnUserId: (id: string | null) => void;
  warnReason: string;
  setWarnReason: (r: string) => void;
  warnNote: string;
  setWarnNote: (n: string) => void;
  onWarn: (userId: string) => void;
  userSearch: string;
  setUserSearch: (s: string) => void;
  userFilter: "ALL" | "ACTIVE" | "BANNED";
  setUserFilter: (f: "ALL" | "ACTIVE" | "BANNED") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="flex-1 max-w-xs rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
        />
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value as "ALL" | "ACTIVE" | "BANNED")}
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
        </select>
      </div>

      {users.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Conversations</th>
                <th className="pb-2 pr-4 font-medium">Warnings</th>
                <th className="pb-2 pr-4 font-medium">Created</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{u.email}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{u.name || "-"}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      text={u.role}
                      bg={u.role === "ADMIN" ? "var(--warning-bg)" : "var(--subtle-bg)"}
                      color={u.role === "ADMIN" ? "var(--warning-text)" : "var(--muted-text)"}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Badge
                      text={u.status}
                      bg={u.status === "BANNED" ? "var(--error-bg)" : "var(--success-bg)"}
                      color={u.status === "BANNED" ? "var(--error-text)" : "var(--success-text)"}
                    />
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--muted-text)" }}>{u._count?.conversations ?? "-"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--muted-text)" }}>{u._count?.warningsReceived ?? 0}</td>
                  <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted-text)" }}>
                    {formatDateSafe(u.createdAt)}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1 flex-wrap">
                      {roleChangeId === u.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onRoleChange(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
                            className="text-xs px-2 py-1 rounded transition-colors"
                            style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                          >
                            {u.role === "ADMIN" ? "Demote" : "Promote"}
                          </button>
                          <button
                            onClick={() => setRoleChangeId(null)}
                            className="text-xs px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--muted-text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRoleChangeId(u.id)}
                          className="text-xs px-2 py-1 rounded border transition-colors"
                          style={{ borderColor: "var(--card-border)", color: "var(--surface-text)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          Role
                        </button>
                      )}

                      {u.status === "BANNED" ? (
                        unbanConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => onUnban(u.id)}
                              className="text-xs px-2 py-1 rounded transition-colors"
                              style={{ backgroundColor: "var(--success-bg)", color: "var(--success-text)" }}
                            >
                              Confirm Unban
                            </button>
                            <button
                              onClick={() => setUnbanConfirm(null)}
                              className="text-xs px-2 py-1 rounded transition-colors"
                              style={{ color: "var(--muted-text)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setUnbanConfirm(u.id)}
                            className="text-xs px-2 py-1 rounded border transition-colors"
                            style={{ borderColor: "var(--card-border)", color: "var(--success-text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--success-bg)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            Unban
                          </button>
                        )
                      ) : (
                        banConfirm === u.id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="Ban reason..."
                              value={banReasons[u.id] || ""}
                              onChange={(e) => setBanReasons({ ...banReasons, [u.id]: e.target.value })}
                              className="text-xs px-2 py-1 rounded outline-none w-40"
                              style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => onBan(u.id)}
                                className="text-xs px-2 py-1 rounded transition-colors"
                                style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
                              >
                                Confirm Ban
                              </button>
                              <button
                                onClick={() => setBanConfirm(null)}
                                className="text-xs px-2 py-1 rounded transition-colors"
                                style={{ color: "var(--muted-text)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setBanConfirm(u.id)}
                            className="text-xs px-2 py-1 rounded border transition-colors"
                            style={{ borderColor: "var(--card-border)", color: "var(--error-text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--error-bg)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            Ban
                          </button>
                        )
                      )}

                      {warnUserId === u.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Warning reason..."
                            value={warnReason}
                            onChange={(e) => setWarnReason(e.target.value)}
                            className="text-xs px-2 py-1 rounded outline-none w-40"
                            style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
                          />
                          <textarea
                            placeholder="Note (optional)"
                            value={warnNote}
                            onChange={(e) => setWarnNote(e.target.value)}
                            className="text-xs px-2 py-1 rounded outline-none w-40 resize-none"
                            style={{ border: "1px solid var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
                            rows={2}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => onWarn(u.id)}
                              className="text-xs px-2 py-1 rounded transition-colors"
                              style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning-text)" }}
                            >
                              Issue Warning
                            </button>
                            <button
                              onClick={() => { setWarnUserId(null); setWarnReason(""); setWarnNote(""); }}
                              className="text-xs px-2 py-1 rounded transition-colors"
                              style={{ color: "var(--muted-text)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setWarnUserId(u.id); setWarnReason(""); setWarnNote(""); }}
                          className="text-xs px-2 py-1 rounded border transition-colors"
                          style={{ borderColor: "var(--card-border)", color: "var(--warning-text)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--warning-bg)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          Warn
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConversationsTab({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No conversations found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Title</th>
            <th className="pb-2 pr-4 font-medium">User ID</th>
            <th className="pb-2 pr-4 font-medium">Messages</th>
            <th className="pb-2 pr-4 font-medium">Created</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((c) => (
            <tr key={c.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: "var(--surface-text)" }}>{c.title}</td>
              <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--muted-text)" }}>{c.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{c._count.messages}</td>
              <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted-text)" }}>
                {formatDateSafe(c.createdAt)}
              </td>
              <td className="py-2">
                <a
                  href={`/dashboard/admin/conversations/${c.id}`}
                  className="text-xs px-2 py-1 rounded border transition-colors"
                  style={{ borderColor: "var(--card-border)", color: "var(--surface-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarningsTab({ warnings }: { warnings: WarningItem[] }) {
  if (warnings.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No warnings issued.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">User</th>
            <th className="pb-2 pr-4 font-medium">Admin</th>
            <th className="pb-2 pr-4 font-medium">Reason</th>
            <th className="pb-2 pr-4 font-medium">Note</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {warnings.map((w) => (
            <tr key={w.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{w.user?.email || w.admin?.email || "-"}</td>
              <td className="py-2 pr-4" style={{ color: "var(--muted-text)" }}>{w.admin?.email || "-"}</td>
              <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: "var(--surface-text)" }}>{w.reason}</td>
              <td className="py-2 pr-4 max-w-[150px] truncate" style={{ color: "var(--muted-text)" }}>{w.note || "-"}</td>
              <td className="py-2 pr-4">
                <span className="text-xs" style={{ color: w.acknowledgedAt ? "var(--success-text)" : "var(--warning-text)" }}>
                  {w.acknowledgedAt ? "Acknowledged" : "Active"}
                </span>
              </td>
              <td className="py-2 text-xs" style={{ color: "var(--muted-text)" }}>
                {formatDateSafe(w.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTab({ logs }: { logs: AuditLogItem[] }) {
  if (logs.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No audit log entries.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Admin</th>
            <th className="pb-2 pr-4 font-medium">Action</th>
            <th className="pb-2 pr-4 font-medium">Target</th>
            <th className="pb-2 pr-4 font-medium">Details</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{l.admin?.email || "-"}</td>
              <td className="py-2 pr-4">
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "var(--subtle-bg)", color: "var(--muted-text)" }}>
                  {l.action}
                </span>
              </td>
              <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted-text)" }}>
                {String(l.targetUser?.email ?? "") || String((l.metadata as Record<string, string>)?.targetUserId ?? "") || "-"}
              </td>
              <td className="py-2 pr-4 max-w-[200px] truncate text-xs" style={{ color: "var(--muted-text)" }}>
                {JSON.stringify(l.metadata)}
              </td>
              <td className="py-2 text-xs" style={{ color: "var(--muted-text)" }}>
                {formatDateSafe(l.createdAt)}
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
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No memories found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Summary</th>
            <th className="pb-2 pr-4 font-medium">User ID</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Tags</th>
            <th className="pb-2 pr-4 font-medium">Confidence</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {memories.map((m) => (
            <tr key={m.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: "var(--surface-text)" }}>{m.summary || "(no summary)"}</td>
              <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--muted-text)" }}>{m.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--subtle-bg)", color: "var(--muted-text)" }}>{m.type}</span>
              </td>
              <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted-text)" }}>
                {m.tags.length > 0 ? m.tags.join(", ") : "-"}
              </td>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{m.confidence?.toFixed(2) ?? "-"}</td>
              <td className="py-2">
                {deleteConfirm === m.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: "var(--muted-text)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(m.id)}
                    className="text-xs px-2 py-1 rounded border transition-colors"
                    style={{ borderColor: "var(--card-border)", color: "var(--error-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--error-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No learning candidates found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Summary</th>
            <th className="pb-2 pr-4 font-medium">User ID</th>
            <th className="pb-2 pr-4 font-medium">Sensitivity</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Confidence</th>
            <th className="pb-2 pr-4 font-medium">Created</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: "var(--surface-text)" }}>{c.summary || "(no summary)"}</td>
              <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--muted-text)" }}>{c.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">
                <SensitivityBadge level={c.sensitivity} />
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{c.confidence?.toFixed(2) ?? "-"}</td>
              <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted-text)" }}>
                {formatDateSafe(c.createdAt)}
              </td>
              <td className="py-2">
                {deleteConfirm === c.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: "var(--muted-text)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="text-xs px-2 py-1 rounded border transition-colors"
                    style={{ borderColor: "var(--card-border)", color: "var(--error-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--error-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No feedback records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Rating</th>
            <th className="pb-2 pr-4 font-medium">User ID</th>
            <th className="pb-2 pr-4 font-medium">Reason</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {feedback.map((f) => (
            <tr key={f.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}><span className="text-xs font-medium">{f.type}</span></td>
              <td className="py-2 pr-4" style={{ color: "var(--surface-text)" }}>{f.rating}</td>
              <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--muted-text)" }}>{f.userId.slice(0, 12)}...</td>
              <td className="py-2 pr-4 max-w-[150px] truncate text-xs" style={{ color: "var(--muted-text)" }}>
                {f.reason || "-"}
              </td>
              <td className="py-2 text-xs" style={{ color: "var(--muted-text)" }}>
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
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No web sources found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
            <th className="pb-2 pr-4 font-medium">Title</th>
            <th className="pb-2 pr-4 font-medium">URL</th>
            <th className="pb-2 pr-4 font-medium">Provider</th>
            <th className="pb-2 pr-4 font-medium">User ID</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
              <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: "var(--surface-text)" }}>{s.title || "(no title)"}</td>
              <td className="py-2 pr-4 max-w-[200px] truncate text-xs" style={{ color: "var(--info-text)" }}>
                {s.url}
              </td>
              <td className="py-2 pr-4 text-xs" style={{ color: "var(--surface-text)" }}>{s.provider}</td>
              <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--muted-text)" }}>{s.userId.slice(0, 12)}...</td>
              <td className="py-2 text-xs" style={{ color: "var(--muted-text)" }}>
                {formatDateSafe(s.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<Array<{ id: string; type: string; timestamp: string; source: string; details?: string; adminEmail?: string; targetEmail?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Loading logs...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>No log entries found.</p>;
  }

  return (
    <div className="space-y-2">
      {logs.slice(0, 100).map((log) => (
        <div
          key={log.id}
          className="rounded border p-3 text-sm"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: log.source === "admin" ? "var(--warning-bg)" : "var(--subtle-bg)",
                color: log.source === "admin" ? "var(--warning-text)" : "var(--muted-text)",
              }}
            >
              {log.type}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-text)" }}>
              {formatDateSafe(log.timestamp)}
            </span>
          </div>
          {log.details && (
            <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
              {log.details.slice(0, 200)}
            </p>
          )}
          {log.adminEmail && (
            <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
              Admin: {log.adminEmail}
              {log.targetEmail && ` → ${log.targetEmail}`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function HealthTab({ health }: { health: HealthData | null }) {
  if (!health) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Health data not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: health.status === "healthy" ? "var(--success-text)" : "var(--error-text)" }} />
        <span className="font-medium capitalize" style={{ color: "var(--surface-text)" }}>{health.status}</span>
        <span className="text-xs" style={{ color: "var(--muted-text)" }}>
          {new Date(health.timestamp).toLocaleString()}
        </span>
      </div>

      {health.error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}>
          {health.error}
        </div>
      )}

      {health.counts && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(health.counts).map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
              <p className="text-xs capitalize" style={{ color: "var(--muted-text)" }}>
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="text-xl font-semibold mt-1" style={{ color: "var(--surface-text)" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border p-4 text-sm space-y-1" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)", color: "var(--surface-text-secondary)" }}>
        <p className="font-medium" style={{ color: "var(--surface-text)" }}>System Info</p>
        <p>Database: PostgreSQL 18 with pgvector</p>
        <p>Framework: Next.js 16.2.9 (Turbopack)</p>
        <p>Auth: NextAuth v5 (JWT strategy)</p>
      </div>
    </div>
  );
}

function SensitivityBadge({ level }: { level: string }) {
  const style: Record<string, { bg: string; text: string }> = {
    LOW: { bg: "var(--success-bg)", text: "var(--success-text)" },
    MEDIUM: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
    HIGH: { bg: "var(--error-bg)", text: "var(--error-text)" },
    SECRET: { bg: "var(--error-bg)", text: "var(--error-text)" },
  };
  const s = style[level] || { bg: "var(--subtle-bg)", text: "var(--muted-text)" };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: "var(--info-bg)", text: "var(--info-text)" },
    APPROVED: { bg: "var(--success-bg)", text: "var(--success-text)" },
    REJECTED: { bg: "var(--subtle-bg)", text: "var(--muted-text)" },
  };
  const s = style[status] || { bg: "var(--subtle-bg)", text: "var(--muted-text)" };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
      {status}
    </span>
  );
}
