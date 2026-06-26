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
    keywords: [] as string[],
    category: "knowledge" as "memory" | "knowledge",
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: "var(--surface-bg)" }}>
      <MemoryPageClient initialMemories={serialized} />
    </div>
  );
}
