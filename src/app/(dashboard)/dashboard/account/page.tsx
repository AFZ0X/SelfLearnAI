import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AccountPageClient } from "./AccountPageClient";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>Account Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            Manage your profile, password, and account actions.
          </p>
        </div>
        <AccountPageClient />
      </div>
    </div>
  );
}
