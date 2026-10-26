import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { createTRPCRouter } from "./cleaning-qa-trpc.mjs";
import { memoryDatabase } from "./cleaning-memory-db.mjs";
const project = fileURLToPath(new URL("../..", import.meta.url));
process.chdir(project);
const port = 3101,
  hostname = "127.0.0.1",
  origin = `http://${hostname}:${port}`;
const nonce = randomBytes(20).toString("hex"),
  secret = randomBytes(48).toString("hex");
process.env.NODE_ENV = "development";
process.env.CLEANING_QA_SECRET = secret;
process.env.CLEANING_JWT_SECRET = secret;
process.env.DATABASE_URL = "postgresql://qa:qa@127.0.0.1:1/isolated";
process.env.DIRECT_URL = process.env.DATABASE_URL;
nextEnv.loadEnvConfig(project, true);
const { cleaningWorkforceRouter } = await import(
  new URL("../../src/server/api/routers/cleaning-workforce.ts", import.meta.url)
);
const { cleaningAuthRouter } = await import(
  new URL("../../src/server/api/routers/cleaning-auth.ts", import.meta.url)
);
const { cleaningAccess } = await import(
  new URL(
    "../../src/server/api/routers/cleaning-candidates.ts",
    import.meta.url,
  )
);
const { listCleaningOverview } = await import(
  new URL("../../src/server/api/routers/cleaning-overview.ts", import.meta.url)
);
const { localIso } = await import(
  new URL("../../src/server/cleaning/candidates.ts", import.meta.url)
);
const day = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Warsaw",
}).format(new Date());
globalThis.__cleaningQaNow = localIso(day + "T10:30");
const router = createTRPCRouter({
  cleaningAuth: cleaningAuthRouter,
  cleaning: createTRPCRouter({
    access: cleaningAccess,
    listOverview: listCleaningOverview,
    workforce: cleaningWorkforceRouter,
  }),
});
const db = memoryDatabase();
const { default: next } = await import("next");
const app = next({
  dev: true,
  dir: project,
  hostname,
  port,
  conf: { distDir: ".next-cleaning-qa" },
});
await app.prepare();
const handler = app.getRequestHandler(),
  bootstrap = `/__cleaning_workforce_qa/${nonce}`;
const token = (id, role) =>
  jwt.sign({ sub: String(id), role }, secret, { expiresIn: "2h" });
const html = () =>
  `<!doctype html><html lang="pl"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cleaning QA — pamięć, bez bazy</title><style>body{font:16px system-ui;padding:25px;max-width:650px;margin:auto;background:#f6f8fa}a,button{display:block;padding:16px;margin:14px 0;border-radius:12px;background:#115e59;color:white;text-decoration:none;border:0;font:inherit}</style><h1>Izolowany test cleaning</h1><p>Dane fikcyjne w pamięci. Brak połączenia z bazą i iDoBooking. Nic nie jest wysyłane.</p>${[
    [1, "MANAGER", "Koordynator"],
    [2, "CLEANER", "Anna Testowa"],
    [3, "CLEANER", "Ola Testowa"],
  ]
    .map(
      ([id, role, name]) =>
        `<button data-token="${token(id, role)}">${name}</button>`,
    )
    .join(
      "",
    )}<p>Zegar testowy: <span id="clock">${globalThis.__cleaningQaNow}</span></p>${["10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "14:00"].map((t) => `<a href="${bootstrap}/clock/${t}">${t}</a>`).join("")}<script>document.querySelectorAll('button[data-token]').forEach(b=>b.onclick=()=>{localStorage.setItem('cleaningAuthToken',b.dataset.token);location.href='/cleaningService'});</script></html>`;
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (
    req.headers.host !== `${hostname}:${port}` ||
    !["127.0.0.1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
  ) {
    res.writeHead(403).end();
    return;
  }
  const url = new URL(req.url, origin);
  if (url.pathname === bootstrap) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html());
    return;
  }
  if (url.pathname.startsWith(bootstrap + "/clock/")) {
    const t = decodeURIComponent(url.pathname.split("/").at(-1));
    if (!/^1[0-4]:[03]0$/.test(t)) {
      res.writeHead(400).end();
      return;
    }
    globalThis.__cleaningQaNow = localIso(day + "T" + t);
    res.writeHead(302, { Location: bootstrap }).end();
    return;
  }
  if (url.pathname === "/api/auth/session") {
    res.setHeader("Content-Type", "application/json");
    res.end("null");
    return;
  }
  if (url.pathname.startsWith("/api/trpc/")) {
    await nodeHTTPRequestHandler({
      req,
      res,
      path: decodeURIComponent(url.pathname.slice("/api/trpc/".length)),
      router,
      createContext: async () => {
        let cleaningAuth;
        try {
          const p = jwt.verify(
            (req.headers.authorization ?? "").replace(/^Bearer /, ""),
            secret,
          );
          cleaningAuth = {
            userId: p.sub,
            role: p.role,
            credentialVersion: p.cv ?? 0,
          };
        } catch {}
        return { db, cleaningAuth, session: null, headers: new Headers() };
      },
    });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(403).end("QA blocks every other API");
    return;
  }
  if (
    ["/cleaningService", "/cleaningService/login", "/favicon.ico"].includes(
      url.pathname,
    ) ||
    url.pathname.startsWith("/_next/")
  ) {
    await handler(req, res);
    return;
  }
  res.writeHead(403).end();
});
server.on("upgrade", (req, socket, head) => {
  if (
    req.headers.host === `${hostname}:${port}` &&
    req.url?.startsWith("/_next/")
  )
    void app.getUpgradeHandler()(req, socket, head);
  else socket.destroy();
});
server.listen(port, hostname, () =>
  console.log(`WORKFORCE_QA_URL=${origin}${bootstrap}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
