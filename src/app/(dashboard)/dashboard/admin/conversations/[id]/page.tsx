import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6">
        <h2 className="text-2xl font-semibold">Conversation not found</h2>
        <a href="/dashboard/admin" className="text-sm text-blue-600 hover:underline mt-2">
          Back to admin dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
      <div className="mb-4">
        <a href="/dashboard/admin" className="text-sm text-blue-600 hover:underline">
          &larr; Back to admin dashboard
        </a>
      </div>

      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-semibold">{conversation.title}</h2>
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>
            By {conversation.user?.name || conversation.user?.email || "Unknown"} &middot;{" "}
            {new Date(conversation.createdAt).toLocaleString()} &middot;{" "}
            {conversation.messages.length} messages
          </p>
        </div>

        <div className="space-y-3">
          {conversation.messages.length === 0 && (
            <p className="text-sm text-zinc-500">No messages in this conversation.</p>
          )}
          {conversation.messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`rounded-lg p-4 text-sm ${
                msg.role === "user"
                  ? "bg-zinc-100 ml-8"
                  : "bg-zinc-50 border mr-8"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    msg.role === "user"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {msg.role === "user" ? "User" : "Assistant"}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <div
                className="whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                dir="auto"
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
