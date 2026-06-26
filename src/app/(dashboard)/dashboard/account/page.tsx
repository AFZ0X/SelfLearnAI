import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AccountPageClient } from "./AccountPageClient";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <AccountPageClient />;
}
