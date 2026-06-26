import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { isSearchConfigured } from "@/lib/ai/search/SearchProvider";

const features = [
  {
    title: "Chat",
    description: "Conversational AI interface with memory and web search.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    href: "/dashboard/chat",
  },
  {
    title: "Memory",
    description: "Persistent knowledge storage for personalized AI.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    href: "/dashboard/memory",
  },
  {
    title: "Learning",
    description: "Self-improvement pipeline from conversation insights.",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    href: "/dashboard/learning",
  },
  {
    title: "Feedback",
    description: "Rate, correct, and improve AI responses.",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    href: "/dashboard/feedback",
  },
  {
    title: "Neural Activity",
    description: "Live pipeline visualization with step-by-step timing.",
    icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    href: "/dashboard/neural-activity",
  },
  {
    title: "Web Search",
    description: "Real-time information retrieval from the web.",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    href: "/dashboard/chat",
  },
];

function FeatureCard({
  title,
  description,
  icon,
  href,
  badge,
}: {
  title: string;
  description: string;
  icon: string;
  href?: string;
  badge?: { text: string; color: string; bg: string };
}) {
  const content = (
    <div
      className="rounded-xl border p-5 transition-all duration-200 h-full flex flex-col feature-card-hover"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "var(--subtle-bg)" }}
        >
          <svg className="w-[18px] h-[18px]" style={{ color: "var(--surface-text)" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>
            {badge.text}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--surface-text)" }}>{title}</h3>
      <p className="text-xs flex-1" style={{ color: "var(--surface-text-secondary)" }}>{description}</p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block group">
        <div className="transition-all duration-200 group-hover:scale-[1.02]">
          {content}
        </div>
      </a>
    );
  }

  return content;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const searchConfigured = isSearchConfigured();

  const webSearchBadge = searchConfigured
    ? { text: "Active", color: "var(--success-text)", bg: "var(--success-bg)" }
    : { text: "Setup Required", color: "var(--warning-text)", bg: "var(--warning-bg)" };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-8" style={{ animation: "fade-in 0.2s ease" }}>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--surface-text)" }}>
            Welcome, {user.name || user.email}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--surface-text-secondary)" }}>
            Chat, Memory, Learning, Feedback, and Web Search are ready to use.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {features.map((feature) => (
            <div key={feature.title} style={{ animation: "slide-up 0.2s ease" }}>
              <FeatureCard
                {...feature}
                badge={feature.title === "Web Search" ? webSearchBadge : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
