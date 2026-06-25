import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { listMemories } from "@/lib/db/memories";
import { MemoryPageClient } from "@/components/memory/MemoryPageClient";

export default async function MemoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const memories = await listMemories(session.user.id);

  const serialized = memories.map((m) => ({
    id: m.id,
    type: m.type,
    text: m.text,
    summary: m.summary,
    source: m.source,
    tags: m.tags,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col" style={{ backgroundColor: "var(--surface-bg)" }}>
      <header className="px-6 py-3" style={{ borderBottom: "1px solid var(--header-border)" }}>
        <h1 className="font-semibold text-lg" style={{ color: "var(--surface-text)" }}>Memory</h1>
      </header>
      <MemoryPageClient initialMemories={serialized} />
    </div>
  );
}
