import { auth } from "@/lib/auth/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { WarningBanner } from "@/components/dashboard/WarningBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar
        userName={user?.name || user?.email}
        userEmail={user?.email}
        isAdmin={user?.role === "ADMIN"}
      />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <WarningBanner />
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
