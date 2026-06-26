"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useState, useEffect } from "react";

type ResponseStyle = "SHORT" | "NORMAL" | "DETAILED";

const STYLE_LABELS: Record<ResponseStyle, string> = {
  SHORT: "Short (default)",
  NORMAL: "Normal",
  DETAILED: "Detailed",
};

const STYLE_DESCRIPTIONS: Record<ResponseStyle, string> = {
  SHORT: "Concise answers, 1–5 lines, direct to the point.",
  NORMAL: "Balanced answers with brief context.",
  DETAILED: "Full explanations when needed.",
};

export function SettingsPageClient() {
  const { theme, setTheme } = useTheme();
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("SHORT");
  const [providerName, setProviderName] = useState("Mock");
  const [providerConfigured, setProviderConfigured] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/web-search/status")
      .then((res) => res.json())
      .then((data) => {
        setProviderName(data.provider);
        setProviderConfigured(data.configured);
        if (typeof data.webSearchEnabled === "boolean") {
          setWebSearchEnabled(data.webSearchEnabled);
        }
        if (data.responseStyle && ["SHORT", "NORMAL", "DETAILED"].includes(data.responseStyle)) {
          setResponseStyle(data.responseStyle);
        }
      })
      .catch(() => {});
  }, []);

  async function toggleWebSearch(enabled: boolean) {
    setSaving(true);
    setWebSearchEnabled(enabled);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { webSearchEnabled: enabled } }),
      });
    } catch {
      setWebSearchEnabled(!enabled);
    } finally {
      setSaving(false);
    }
  }

  async function saveResponseStyle(style: ResponseStyle) {
    setSaving(true);
    setResponseStyle(style);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { responseStyle: style } }),
      });
    } catch {
      setResponseStyle(responseStyle);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--surface-text)" }}>Appearance</h3>
        <p className="text-sm mb-5" style={{ color: "var(--surface-text-secondary)" }}>Choose your preferred theme for the application.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("dark")}
            className="flex-1 px-4 py-4 rounded-xl border text-sm font-medium transition-all duration-200"
            style={{
              borderColor: theme === "dark" ? "var(--input-border)" : "var(--card-border)",
              backgroundColor: theme === "dark" ? "var(--sidebar-active-bg)" : "transparent",
              color: theme === "dark" ? "var(--sidebar-active-text)" : "var(--surface-text-secondary)",
            }}
          >
            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className="flex-1 px-4 py-4 rounded-xl border text-sm font-medium transition-all duration-200"
            style={{
              borderColor: theme === "light" ? "var(--input-border)" : "var(--card-border)",
              backgroundColor: theme === "light" ? "var(--sidebar-active-bg)" : "transparent",
              color: theme === "light" ? "var(--sidebar-active-text)" : "var(--surface-text-secondary)",
            }}
          >
            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            Light
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>Automatic Web Search</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={webSearchEnabled}
              onChange={(e) => toggleWebSearch(e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div
              className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
              style={{
                backgroundColor: webSearchEnabled ? "var(--info-text)" : "var(--border-subtle)",
              }}
            />
          </label>
        </div>
        <p className="text-sm" style={{ color: "var(--surface-text-secondary)" }}>
          When enabled, automatically searches the web when current or recent information is needed.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted-text)" }}>
            Provider: {providerName}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: providerConfigured ? "var(--success-bg)" : "var(--warning-bg)",
              color: providerConfigured ? "var(--success-text)" : "var(--warning-text)",
            }}
          >
            {providerConfigured ? "Configured" : "API key missing"}
          </span>
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--surface-text)" }}>Response Style</h3>
        <p className="text-sm mb-4" style={{ color: "var(--surface-text-secondary)" }}>Controls how concise or detailed the assistant&apos;s answers are.</p>
        <div className="flex gap-2">
          {(Object.entries(STYLE_LABELS) as [ResponseStyle, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => saveResponseStyle(key)}
              disabled={saving}
              className="flex-1 px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200"
              style={{
                borderColor: responseStyle === key ? "var(--input-border)" : "var(--card-border)",
                backgroundColor: responseStyle === key ? "var(--sidebar-active-bg)" : "transparent",
                color: responseStyle === key ? "var(--sidebar-active-text)" : "var(--surface-text-secondary)",
              }}
            >
              <div className="font-medium">{label}</div>
              <div className="text-[11px] mt-0.5 opacity-70">{STYLE_DESCRIPTIONS[key]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
