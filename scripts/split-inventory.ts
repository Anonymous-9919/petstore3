import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function main() {
  const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { legacyId: "asc" }, select: { id: true, name: true } });
  if (branches.length !== 2) throw new Error(`Expected exactly two active branches; found ${branches.length}.`);

  // The source has one stock total per product. Calculate both branch levels in
  // PostgreSQL so the operation stays atomic and does not time out over the network.
  await prisma.$executeRaw`
    WITH totals AS (
      SELECT "productId", SUM("quantity")::integer AS quantity
      FROM "InventoryLevel"
      GROUP BY "productId"
    ), allocation AS (
      SELECT ${branches[0].id}::uuid AS "branchId", "productId", CEIL(quantity / 2.0)::integer AS quantity FROM totals
      UNION ALL
      SELECT ${branches[1].id}::uuid AS "branchId", "productId", FLOOR(quantity / 2.0)::integer AS quantity FROM totals
    )
    INSERT INTO "InventoryLevel" ("id", "branchId", "productId", "quantity", "reserved", "lowStockAt", "updatedAt")
    SELECT gen_random_uuid(), "branchId", "productId", quantity, 0, 0, NOW() FROM allocation
    ON CONFLICT ("branchId", "productId") DO UPDATE
    SET "quantity" = EXCLUDED."quantity", "reserved" = 0, "updatedAt" = NOW()
  `;

  console.info(`Split inventory across ${branches.map((branch) => branch.name).join(" and ")}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
