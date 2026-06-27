"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export function AccountPageClient() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
          setName(d.user.name || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to update.");
        return;
      }
      setUser(data.user);
      setMsg("Profile updated.");
    } catch {
      setMsg("Failed to connect to server.");
    } finally {
      setSaving(false);
    }
  }, [saving, name]);

  const handleChangePassword = useCallback(async () => {
    if (pwSaving) return;
    setPwSaving(true);
    setPwMsg(null);
    setPwError(false);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg(data.error || "Failed to change password.");
        setPwError(true);
        return;
      }
      setPwMsg("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
    } catch {
      setPwMsg("Failed to connect to server.");
      setPwError(true);
    } finally {
      setPwSaving(false);
    }
  }, [pwSaving, currentPw, newPw]);

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: "var(--subtle-bg)" }} />)}</div>;
  }

  if (!user) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Failed to load profile.</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Profile section */}
      <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
        <h3 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--surface-text-secondary)" }}>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl px-3.5 py-2.5 text-sm opacity-60 cursor-not-allowed"
              style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--surface-text-secondary)" }}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-150"
              style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted-text)" }}>Role</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{
                backgroundColor: user.role === "ADMIN" ? "var(--warning-bg)" : "var(--subtle-bg)",
                color: user.role === "ADMIN" ? "var(--warning-text)" : "var(--muted-text)",
              }}>
                {user.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted-text)" }}>Status</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{
                backgroundColor: user.status === "BANNED" ? "var(--error-bg)" : "var(--success-bg)",
                color: user.status === "BANNED" ? "var(--error-text)" : "var(--success-text)",
              }}>
                {user.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {msg && (
              <span className="text-xs" style={{ color: "var(--success-text)" }}>{msg}</span>
            )}
          </div>
        </div>
      </div>

      {/* Password section */}
      <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
        <h3 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--surface-text-secondary)" }}>Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-150"
              style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--surface-text-secondary)" }}>New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              minLength={8}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-150"
              style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !currentPw || !newPw}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-hover-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--btn-primary-bg)"; }}
            >
              {pwSaving ? "Changing..." : "Change Password"}
            </button>
            {pwMsg && (
              <span className={`text-xs ${pwError ? "text-red-500" : "text-green-600"}`}>{pwMsg}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions section */}
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
        <h3 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/account/export"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150"
            style={{ borderColor: "var(--input-border)", color: "var(--surface-text)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--subtle-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            Export My Data
          </a>
          <button
            onClick={async () => {
              await signOut({ redirect: false, callbackUrl: "/login" });
              window.location.href = "/login";
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
