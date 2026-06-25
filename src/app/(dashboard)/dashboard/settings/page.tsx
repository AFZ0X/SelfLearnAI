import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <h2 className="text-2xl font-semibold mb-6" style={{ color: "var(--surface-text)" }}>Settings</h2>
      <SettingsPageClient />
    </div>
  );
}
