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
    <div className="flex-1 flex flex-col px-6 py-6">
      <AdminDashboardClient />
    </div>
  );
}

export const dynamic = "force-dynamic";
