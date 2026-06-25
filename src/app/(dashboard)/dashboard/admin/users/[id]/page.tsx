import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      bannedAt: true,
      bannedReason: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          conversations: true,
          memories: true,
          feedback: true,
          warningsReceived: true,
        },
      },
      warningsReceived: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          reason: true,
          note: true,
          acknowledgedAt: true,
          createdAt: true,
          admin: {
            select: { email: true, name: true },
          },
        },
      },
      conversations: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      },
    },
  });

  if (!user) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6">
        <h2 className="text-2xl font-semibold">User not found</h2>
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

      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-semibold">{user.name || user.email}</h2>
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>{user.email}</p>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">Account Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-500">Role:</span>{" "}
              <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                user.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"
              }`}>
                {user.role}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                user.status === "BANNED" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}>
                {user.status}
              </span>
            </div>
            {user.bannedAt && (
              <div>
                <span className="text-zinc-500">Banned at:</span>{" "}
                <span className="text-sm">{new Date(user.bannedAt).toLocaleString()}</span>
              </div>
            )}
            {user.bannedReason && (
              <div className="col-span-2">
                <span className="text-zinc-500">Ban reason:</span>{" "}
                <span className="text-sm">{user.bannedReason}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500">Created:</span>{" "}
              <span className="text-sm">{new Date(user.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Content Summary</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded bg-zinc-50 p-2">
              <div className="text-lg font-semibold">{user._count.conversations}</div>
              <div className="text-xs text-zinc-500">Conversations</div>
            </div>
            <div className="rounded bg-zinc-50 p-2">
              <div className="text-lg font-semibold">{user._count.memories}</div>
              <div className="text-xs text-zinc-500">Memories</div>
            </div>
            <div className="rounded bg-zinc-50 p-2">
              <div className="text-lg font-semibold">{user._count.feedback}</div>
              <div className="text-xs text-zinc-500">Feedback</div>
            </div>
            <div className="rounded bg-zinc-50 p-2">
              <div className="text-lg font-semibold">{user._count.warningsReceived}</div>
              <div className="text-xs text-zinc-500">Warnings</div>
            </div>
          </div>
        </div>

        {user.conversations.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">Recent Conversations</h3>
            <div className="space-y-1">
              {user.conversations.map((c) => (
                <a
                  key={c.id}
                  href={`/dashboard/admin/conversations/${c.id}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50 text-sm"
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    {c._count.messages} messages
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {user.warningsReceived.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">Warning History</h3>
            <div className="space-y-2">
              {user.warningsReceived.map((w) => (
                <div key={w.id} className="rounded bg-zinc-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{w.reason}</span>
                    <span className="text-xs text-zinc-500">{new Date(w.createdAt).toLocaleString()}</span>
                  </div>
                  {w.note && (
                    <p className="text-xs text-zinc-500 mt-1">{w.note}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">
                    By: {w.admin?.name || w.admin?.email || "Unknown"}
                  </p>
                  {w.acknowledgedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Acknowledged on {new Date(w.acknowledgedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!w.acknowledgedAt && (
                    <p className="text-xs text-amber-600 mt-1">Not acknowledged</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
