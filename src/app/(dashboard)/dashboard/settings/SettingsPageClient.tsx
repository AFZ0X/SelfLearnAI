"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function SettingsPageClient() {
  const { theme, setTheme } = useTheme();

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
    </div>
  );
}
