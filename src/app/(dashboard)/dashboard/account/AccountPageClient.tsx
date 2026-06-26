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
        setPwError(true);
        return;
      }
      setUser(data.user);
      setMsg("Profile updated.");
      setPwError(false);
    } catch {
      setMsg("Failed to connect to server.");
      setPwError(true);
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
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Loading...</p>;
  }

  if (!user) {
    return <p className="text-sm" style={{ color: "var(--muted-text)" }}>Failed to load profile.</p>;
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6" style={{ color: "var(--surface-text)" }}>Account Settings</h2>

      <div className="max-w-lg space-y-6">
        <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <h3 className="font-medium text-sm" style={{ color: "var(--surface-text)" }}>Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-lg px-3 py-2 text-sm border opacity-60 cursor-not-allowed"
                style={{ borderColor: "var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs" style={{ color: "var(--muted-text)" }}>Role: </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--muted-text)" }}>Status: </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.status === "BANNED" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {user.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {msg && (
                <span className={`text-xs ${pwError ? "text-red-500" : "text-green-600"}`}>{msg}</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <h3 className="font-medium text-sm" style={{ color: "var(--surface-text)" }}>Change Password</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--muted-text)" }}>New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={8}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--input-border)", backgroundColor: "var(--input-bg)", color: "var(--input-text)" }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPw || !newPw}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              >
                {pwSaving ? "Changing..." : "Change Password"}
              </button>
              {pwMsg && (
                <span className={`text-xs ${pwError ? "text-red-500" : "text-green-600"}`}>{pwMsg}</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}>
          <h3 className="font-medium text-sm" style={{ color: "var(--surface-text)" }}>Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = "/dashboard/account/export"}
              className="px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: "var(--input-border)", color: "var(--surface-text)" }}
            >
              Export My Data
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
