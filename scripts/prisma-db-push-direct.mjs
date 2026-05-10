/**
 * `prisma db push` z DATABASE_URL = DIRECT_URL (omija zawieszenie na poolerze :6543).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
    console.error("[prisma-db-push-direct] Brak pliku .env.");
    process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
    ) {
        val = val.slice(1, -1);
    }
    env[key] = val;
}

if (!env.DIRECT_URL) {
    console.error("[prisma-db-push-direct] Ustaw DIRECT_URL w .env.");
    process.exit(1);
}

if (String(env.DIRECT_URL).includes(":6543")) {
    console.error(
        "[prisma-db-push-direct] DIRECT_URL nie może używać portu 6543 — `db push` się zawiesi. Użyj portu 5432 (session / direct) z panelu Supabase.",
    );
    process.exit(1);
}

env.DATABASE_URL = env.DIRECT_URL;
console.log("[prisma-db-push-direct] DATABASE_URL = DIRECT_URL → db push");

const r = spawnSync("npx", ["prisma", "db", "push"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
});

process.exit(typeof r.status === "number" ? r.status : 1);
