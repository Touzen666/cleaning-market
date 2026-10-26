// Applies ONLY the additive cleaning migration. Never runs the repository's older pending migrations.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const name = "20261025194000_cleaning_workforce";
const sql = readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
try {
  const result = await db.$transaction(async tx => {
    const existing = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('CleaningProfile','CleaningWorkspace','CleaningAsset','CleaningAuditEvent','CleaningNotification')`;
    const applied = await tx.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${name} AND finished_at IS NOT NULL`;
    if (applied.length && existing.length === 5) return "already-applied";
    if (existing.length) throw new Error("Partial cleaning schema exists; refusing to overwrite it");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (${randomUUID()}, ${createHash("sha256").update(sql).digest("hex")}, ${name}, NOW(), NOW(), 1)`;
    return "applied-five-new-cleaning-tables";
  }, { maxWait: 10000, timeout: 30000 });
  console.log(JSON.stringify({ migration: name, result }));
} catch (error) {
  console.error(error instanceof Error && !error.message.includes("postgres") ? error.message : "Cleaning migration failed; no credentials printed");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
