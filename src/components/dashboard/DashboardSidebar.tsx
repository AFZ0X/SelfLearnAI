"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface DashboardSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  isAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◉" },
  { href: "/dashboard/chat", label: "Chat", icon: "💬" },
  { href: "/dashboard/memory", label: "Memory", icon: "🧠" },
  { href: "/dashboard/learning", label: "Learning", icon: "📚" },
  { href: "/dashboard/feedback", label: "Feedback", icon: "⭐" },
  { href: "/dashboard/neural-activity", label: "Neural Activity", icon: "📊" },
  { href: "/dashboard/admin", label: "Admin", icon: "⚙️", adminOnly: true },
  { href: "/dashboard/warnings", label: "Warnings", icon: "⚠️" },
  { href: "/dashboard/account", label: "Account", icon: "👤" },
  { href: "/dashboard/settings", label: "Settings", icon: "🔧" },
];

export function DashboardSidebar({ userName, userEmail, isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside
      className="w-[200px] flex flex-col shrink-0"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      <div
        className="px-4 py-4"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <h1
          className="font-bold text-sm tracking-tight"
          style={{ color: "var(--sidebar-text)" }}
        >
          SelfLearn AI
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: isActive ? "var(--sidebar-active-bg)" : "transparent",
                color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
                  e.currentTarget.style.color = "var(--sidebar-hover-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--sidebar-text-muted)";
                }
              }}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="px-3 py-3 space-y-2"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--sidebar-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
            e.currentTarget.style.color = "var(--sidebar-hover-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--sidebar-text-muted)";
          }}
        >
          <span className="w-4 text-center text-xs">
            {theme === "dark" ? "☀️" : "🌙"}
          </span>
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--sidebar-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
            e.currentTarget.style.color = "var(--sidebar-hover-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--sidebar-text-muted)";
          }}
        >
          <span className="w-4 text-center text-xs">🚪</span>
          <span>Logout</span>
        </button>

        <div
          className="px-3 text-xs truncate"
          style={{ color: "var(--sidebar-text-muted)" }}
        >
          {userName || userEmail}
        </div>
      </div>
    </aside>
  );
}
