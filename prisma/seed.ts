import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_BOOTSTRAP_EMAIL and an ADMIN_BOOTSTRAP_PASSWORD of at least 12 characters.");
  }

  await prisma.user.upsert({
    where: { email },
    update: { name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Store Owner", role: UserRole.OWNER, status: "ACTIVE" },
    create: {
      email,
      name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Store Owner",
      passwordHash: await hash(password, 12),
      role: UserRole.OWNER,
    },
  });
}

main()
  .then(() => console.info("Admin bootstrap user is ready."))
  .finally(async () => prisma.$disconnect());
