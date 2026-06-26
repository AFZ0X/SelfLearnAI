import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            Customize your application experience.
          </p>
        </div>
        <SettingsPageClient />
      </div>
    </div>
  );
}
