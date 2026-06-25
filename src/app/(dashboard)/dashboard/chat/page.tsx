import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { listConversations } from "@/lib/db/conversations";
import { ChatPage } from "@/components/chat/ChatPage";

export default async function ChatPageServer() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const conversations = await listConversations(session.user.id);

  const serialized = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <ChatPage
      provider={process.env.AI_PROVIDER || "mock"}
      initialConversations={serialized}
    />
  );
}
