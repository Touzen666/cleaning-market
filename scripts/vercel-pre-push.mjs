/**
 * Husky pre-push: production deploy via Vercel CLI.
 * - Runs only on branches listed in VERCEL_PUSH_BRANCHES (default: main).
 * - Set SKIP_VERCEL_PUSH=1 to skip (e.g. broken Vercel auth).
 * - Requires: npx vercel (login or VERCEL_TOKEN in env).
 * - If the project also uses Git integration on Vercel, you may get two builds; disable one or skip this hook.
 */
import { execSync } from "node:child_process";

if (process.env.SKIP_VERCEL_PUSH === "1") {
  process.exit(0);
}

const branches = (process.env.VERCEL_PUSH_BRANCHES ?? "main")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

let branch;
try {
  branch = execSync("git branch --show-current", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch {
  process.exit(0);
}

if (!branch || !branches.includes(branch)) {
  process.exit(0);
}

console.log(`[husky] Vercel deploy --prod (branch: ${branch})…`);
execSync("npx vercel deploy --prod --yes", { stdio: "inherit" });
