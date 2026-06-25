import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { NeuralActivityClient } from "@/components/neural-activity/NeuralActivityClient";

export default async function NeuralActivityPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--surface-text)" }}>
        Neural Activity
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--sidebar-text-muted)" }}>
        Live pipeline visualization showing how each message is processed
      </p>
      <NeuralActivityClient />
    </div>
  );
}
