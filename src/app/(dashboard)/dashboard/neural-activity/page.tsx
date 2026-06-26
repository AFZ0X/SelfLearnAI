import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { NeuralActivityClient } from "@/components/neural-activity/NeuralActivityClient";

export default async function NeuralActivityPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--surface-text)" }}>
            Neural Activity
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--surface-text-secondary)" }}>
            Live pipeline visualization showing how each message is processed.
          </p>
        </div>
        <NeuralActivityClient />
      </div>
    </div>
  );
}
