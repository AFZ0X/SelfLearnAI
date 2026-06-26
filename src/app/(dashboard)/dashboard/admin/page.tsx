import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            System management and moderation controls.
          </p>
        </div>
        <AdminDashboardClient />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
