import { auth } from "./auth";
import type { UserRole } from "../../../generated/prisma/enums";
import { logSafetyEvent } from "@/lib/safety/safety-event-logger";

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
  };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AdminAuthError("Authentication required.", 401);
  }

  if (session.user.role !== "ADMIN") {
    throw new AdminAuthError("Forbidden. Admin access required.", 403);
  }

  return session as unknown as AdminSession;
}

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export function adminErrorResponse(error: unknown, route?: string): Response {
  if (error instanceof AdminAuthError) {
    if (error.status === 403) {
      logSafetyEvent({
        type: "unauthorized_admin_access",
        timestamp: new Date().toISOString(),
        route: route || "unknown",
        details: "Non-admin user attempted to access admin route",
      });
    }
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Access denied." }, { status: 403 });
}
