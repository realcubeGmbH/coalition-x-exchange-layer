/**
 * Bootstrap script for Coalition X schema registry.
 * Inserts the v0.9.2 schema and marks previous versions inactive.
 *
 * Usage: npx tsx prisma/bootstrap.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

async function main() {
  const schemaPath = resolve(
    __dirname,
    "../.cursor/rules/schema_v_0_9_2.json",
  );
  const schemaJson = JSON.parse(readFileSync(schemaPath, "utf-8"));

  // Deactivate any existing schema versions
  await prisma.schemaRegistry.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Upsert v0.9.2
  await prisma.schemaRegistry.upsert({
    where: { version: "0.9.2" },
    update: {
      schema: schemaJson,
      isActive: true,
      name: "CoalitionX Basic Set of KPIs v0.9.2",
    },
    create: {
      version: "0.9.2",
      schema: schemaJson,
      isActive: true,
      name: "CoalitionX Basic Set of KPIs v0.9.2",
    },
  });

  console.log("Schema registry bootstrapped: v0.9.2 is now active.");
}

main()
  .catch((e) => {
    console.error("Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
