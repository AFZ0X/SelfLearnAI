import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <h2 className="text-2xl font-semibold" style={{ color: "var(--surface-text)" }}>Welcome, {user.name || user.email}</h2>
      <p className="mt-2" style={{ color: "var(--sidebar-text-muted)" }}>
        Chat, Memory, Learning, and Feedback are ready. Web search and sources features coming in future phases.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg w-full">
        <FeatureCard
          title="Chat"
          description="Conversational AI interface"
          comingSoon={false}
        />
        <FeatureCard
          title="Memory"
          description="Persistent knowledge storage"
          comingSoon={false}
        />
        <FeatureCard
          title="Web Search"
          description="Real-time information retrieval"
          comingSoon
        />
        <FeatureCard
          title="Learning"
          description="Self-improvement pipeline"
          comingSoon={false}
        />
        <FeatureCard
          title="Feedback"
          description="Rate and correct AI responses"
          comingSoon={false}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-1"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-medium" style={{ color: "var(--surface-text)" }}>{title}</h3>
        {comingSoon && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--sidebar-hover-bg)",
              color: "var(--sidebar-text-muted)",
            }}
          >
            Soon
          </span>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--sidebar-text-muted)" }}>{description}</p>
    </div>
  );
}
