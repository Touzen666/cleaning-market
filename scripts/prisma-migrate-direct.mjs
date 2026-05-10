/**
 * Uruchamia `prisma migrate deploy` z DATABASE_URL = DIRECT_URL,
 * żeby ominąć Supabase PgBouncer (port 6543), który często zawiesza migracje / db push.
 *
 * W .env musi być DIRECT_URL wskazujący na sesję bez poolera, np.:
 * postgresql://postgres.[ref]:[pass]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
 * lub host db.[project].supabase.co:5432 — zgodnie z panelem Supabase → Database → Connection string → URI (direct).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
    console.error("[prisma-migrate-direct] Brak pliku .env w katalogu projektu.");
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
    console.error(
        "[prisma-migrate-direct] Ustaw DIRECT_URL w .env (Supabase → Settings → Database → Connection string → URI, tryb sesji lub direct, zwykle port 5432).",
    );
    process.exit(1);
}

if (String(env.DIRECT_URL).includes(":6543")) {
    console.error(
        "[prisma-migrate-direct] DIRECT_URL wskazuje na port 6543 (transaction pooler). Migracje się na tym wiszą.\n" +
            "Użyj w DIRECT_URL hosta poolera z portem 5432 (session pooler) albo hosta db.*.supabase.co:5432 z panelu Supabase.",
    );
    process.exit(1);
}

env.DATABASE_URL = env.DIRECT_URL;
console.log("[prisma-migrate-direct] Tymczasowo DATABASE_URL = DIRECT_URL → migrate deploy");

const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
});

process.exit(typeof r.status === "number" ? r.status : 1);
