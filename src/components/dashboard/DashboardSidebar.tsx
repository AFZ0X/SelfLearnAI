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

const icons = {
  overview: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  memory: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  learning: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  feedback: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  neural: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  admin: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  warnings: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  account: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
} as const;

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof icons;
  adminOnly?: boolean;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/chat", label: "Chat", icon: "chat" },
  { href: "/dashboard/memory", label: "Memory", icon: "memory" },
  { href: "/dashboard/learning", label: "Learning", icon: "learning" },
  { href: "/dashboard/feedback", label: "Feedback", icon: "feedback" },
  { href: "/dashboard/neural-activity", label: "Neural Activity", icon: "neural" },
];

const systemNav: NavItem[] = [
  { href: "/dashboard/warnings", label: "Warnings", icon: "warnings" },
  { href: "/dashboard/admin", label: "Admin", icon: "admin", adminOnly: true },
  { href: "/dashboard/account", label: "Account", icon: "account" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: keyof typeof icons }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d={icons[name]} />
    </svg>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
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
      aria-current={isActive ? "page" : undefined}
    >
      <NavIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}

export function DashboardSidebar({ userName, userEmail, isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const displayName = userName || userEmail || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-200"
      style={{
        width: "220px",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 shrink-0" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          S
        </div>
        <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--sidebar-text)" }}>
          SelfLearn
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sidebar-text-muted)" }}>
            Main
          </span>
        </div>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}

        <div className="pt-4 px-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sidebar-text-muted)" }}>
            System
          </span>
        </div>
        {systemNav
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
          ))}
      </nav>

      {/* User section */}
      <div className="px-2 py-3 shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-1"
          style={{ color: "var(--sidebar-text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)"; e.currentTarget.style.color = "var(--sidebar-hover-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--sidebar-text-muted)"; }}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            {theme === "dark" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-2"
          style={{ color: "var(--sidebar-text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)"; e.currentTarget.style.color = "var(--sidebar-hover-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--sidebar-text-muted)"; }}
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>

        {/* User avatar and name */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--sidebar-active-bg)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: "var(--sidebar-active-text)" }}>
              {displayName}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
