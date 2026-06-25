import { auth } from "@/lib/auth/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex flex-1">
      <DashboardSidebar
        userName={user?.name || user?.email}
        userEmail={user?.email}
        isAdmin={user?.role === "ADMIN"}
      />
      <div className="flex flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
