import { prisma } from "@/lib/db/prisma";

export async function requireNotBanned(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.status === "BANNED") {
    throw new BanError();
  }
}

export class BanError extends Error {
  constructor() {
    super("Your account is restricted. Contact the administrator.");
    this.name = "BanError";
  }
}
