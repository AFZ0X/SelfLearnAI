import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { LearningCandidateService } from "@/lib/ai/learning/LearningCandidateService";
import { LearningConfigService } from "@/lib/ai/learning/LearningConfigService";
import { LearningPageClient } from "@/components/learning/LearningPageClient";

const candidateService = new LearningCandidateService();
const configService = new LearningConfigService();

export default async function LearningPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [candidates, config] = await Promise.all([
    candidateService.list(userId),
    configService.getConfig(userId),
  ]);

  const serialized = candidates.map((c) => ({
    id: c.id,
    text: c.text,
    summary: c.summary,
    source: c.source,
    sensitivity: c.sensitivity,
    status: c.status,
    confidence: c.confidence,
    tags: c.tags,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col" style={{ backgroundColor: "var(--surface-bg)" }}>
      <header className="px-6 py-3" style={{ borderBottom: "1px solid var(--header-border)" }}>
        <h1 className="font-semibold text-lg" style={{ color: "var(--surface-text)" }}>Learning</h1>
        <p className="text-sm" style={{ color: "var(--sidebar-text-muted)" }}>
          Review and manage knowledge candidates extracted from your conversations.
        </p>
      </header>
      <LearningPageClient initialCandidates={serialized} initialConfig={config} />
    </div>
  );
}
