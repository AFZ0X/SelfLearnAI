"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function SettingsPageClient() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-lg space-y-6">
      <div
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="font-medium mb-1" style={{ color: "var(--surface-text)" }}>Appearance</h3>
        <p className="text-sm mb-4" style={{ color: "var(--sidebar-text-muted)" }}>Choose your preferred theme for the application.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("dark")}
            className="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors"
            style={{
              borderColor: theme === "dark" ? "var(--input-border)" : "var(--card-border)",
              backgroundColor: theme === "dark" ? "var(--sidebar-active-bg)" : "transparent",
              color: theme === "dark" ? "var(--sidebar-active-text)" : "var(--sidebar-text-muted)",
            }}
          >
            <span className="block text-lg mb-1">🌙</span>
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors"
            style={{
              borderColor: theme === "light" ? "var(--input-border)" : "var(--card-border)",
              backgroundColor: theme === "light" ? "var(--sidebar-active-bg)" : "transparent",
              color: theme === "light" ? "var(--sidebar-active-text)" : "var(--sidebar-text-muted)",
            }}
          >
            <span className="block text-lg mb-1">☀️</span>
            Light
          </button>
        </div>
      </div>
    </div>
  );
}
