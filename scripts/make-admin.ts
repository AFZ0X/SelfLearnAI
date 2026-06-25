import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <user@example.com>");
  process.exit(1);
}

if (!email.includes("@") || !email.includes(".")) {
  console.error("Error: Please provide a valid email address.");
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`Error: No user found with email "${email}".`);
      console.error("Make sure the user has registered before running this script.");
      process.exit(1);
    }

    if (user.role === "ADMIN") {
      console.log(`User "${email}" is already an admin.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log(`Success: User "${email}" has been promoted to ADMIN.`);
    console.log("The Admin link will now appear in the dashboard sidebar.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : "Unknown error");
  process.exit(1);
});
