import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { memoryDatabase } from "./cleaning-memory-db.mjs";
process.env.CLEANING_QA_SECRET = randomBytes(48).toString("hex");
const { cleaningWorkforceRouter: router } = await import(
  new URL("../../src/server/api/routers/cleaning-workforce.ts", import.meta.url)
);
const { localIso } = await import(
  new URL("../../src/server/cleaning/candidates.ts", import.meta.url)
);
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Warsaw",
}).format(new Date());
globalThis.__cleaningQaNow = localIso(today + "T10:30");
const db = memoryDatabase(),
  ctx = (id, role = "CLEANER") => ({
    db,
    cleaningAuth: { userId: String(id), role },
    session: null,
    headers: new Headers(),
  });
const manager = router.createCaller(ctx(1, "MANAGER")),
  anna = router.createCaller(ctx(2)),
  ola = router.createCaller(ctx(3)),
  anonymous = router.createCaller({
    db,
    session: null,
    headers: new Headers(),
  });
const range = {
  from: today,
  to: new Date(Date.parse(today + "T12:00Z") + 30 * 86400000)
    .toISOString()
    .slice(0, 10),
};
const cases = [];
const check = async (name, fn) => {
  process.stdout.write(name + String.fromCharCode(10));
  await fn();
  cases.push(name);
};
let claimPool;
const initialClock = globalThis.__cleaningQaNow;
await check(
  "claim stays atomic when a worker becomes eligible after the unassigned pool was created",
  async () => {
    globalThis.__cleaningQaNow = localIso(today + "T09:00");
    const poolDb = memoryDatabase();
    await poolDb.cleaningProfile.update({
      where: { userId: 2 },
      data: { active: false },
    });
    await poolDb.cleaningProfile.update({
      where: { userId: 3 },
      data: { active: false },
    });
    const poolCtx = (id, role = "CLEANER") => ({
      db: poolDb,
      cleaningAuth: { userId: String(id), role },
      session: null,
      headers: new Headers(),
    });
    const poolManager = router.createCaller(poolCtx(1, "MANAGER"));
    await poolManager.synchronize(range);
    assert(
      (await poolManager.board(range)).tasks.every(
        (t) => t.status === "UNASSIGNED",
      ),
    );
    const created = await poolManager.createEmployee({
      displayName: "Nowa Osoba",
      email: "claim@qa.invalid",
      password: "qa-created-2026",
      phone: null,
      photo: null,
      dailyLimit: 4,
      rules: {},
    });
    const poolWorker = router.createCaller(poolCtx(created.id));
    const target = (await poolWorker.available()).find(
      (t) => t.serviceDate === today,
    );
    assert(target);
    await poolWorker.claim({ taskId: target.id, version: target.version });
    const board = await poolManager.board(range);
    assert.equal(
      board.tasks.find((t) => t.id === target.id).status,
      "ACCEPTED",
    );
    assert.equal(
      board.tasks.find((t) => t.id === target.id).userId,
      created.id,
    );
    assert.equal(board.tasks.filter((t) => t.userId !== null).length, 1);
    await assert.rejects(
      () => poolWorker.claim({ taskId: target.id, version: target.version }),
      { code: "CONFLICT" },
    );
    claimPool = {
      db: poolDb,
      manager: poolManager,
      worker: poolWorker,
      userId: created.id,
    };
  },
);
await check(
  "available respects daily cap and rules while retaining eligible future work",
  async () => {
    for (let i = 0; i < 3; i++) {
      const target = (await claimPool.worker.available()).find(
        (t) => t.serviceDate === today,
      );
      assert(target);
      await claimPool.worker.claim({
        taskId: target.id,
        version: target.version,
      });
    }
    const board = await claimPool.manager.board(range);
    assert.equal(
      board.tasks.filter(
        (t) => t.userId === claimPool.userId && t.serviceDate === today,
      ).length,
      4,
    );
    const available = await claimPool.worker.available();
    assert(!available.some((t) => t.serviceDate === today));
    assert(available.some((t) => t.serviceDate > today));
    assert(
      (await claimPool.manager.available()).some(
        (t) => t.serviceDate === today,
      ),
    );
    const excluded = available.find((t) => t.serviceDate > today).unitId;
    await claimPool.manager.updateEmployee({
      userId: claimPool.userId,
      displayName: "Nowa Osoba",
      phone: null,
      photo: null,
      active: true,
      dailyLimit: 4,
      rules: { excludedUnitIds: [excluded] },
    });
    assert(
      !(await claimPool.worker.available()).some((t) => t.unitId === excluded),
    );
  },
);
globalThis.__cleaningQaNow = initialClock;
await check("anonymous blocked", () =>
  assert.rejects(() => anonymous.board(range)),
);
await check("cleaner cannot manage team", () =>
  assert.rejects(() => anna.team()),
);
await check("cleaner cannot synchronize", () =>
  assert.rejects(() => anna.synchronize(range)),
);
await check("source sync and auto offer", async () => {
  await manager.synchronize(range);
  const b = await manager.board(range);
  assert.equal(b.tasks.length, 12);
  assert.equal(
    b.tasks.filter((t) => t.serviceDate === today && t.userId === 2).length,
    3,
  );
  assert.equal(db.inspection().notifications.length, 12);
});
await check("no source PII or other tasks for cleaner", async () => {
  const b = await anna.board(range);
  assert(b.tasks.every((t) => t.userId === 2));
  assert(
    !JSON.stringify(b).match(
      /passwordHash|firstName|clientNote|internalNote|lastName/,
    ),
  );
});
let task = (await anna.board(range)).tasks.find((t) => t.serviceDate === today);
await check("foreign worker response blocked", () =>
  assert.rejects(() =>
    ola.respond({ taskId: task.id, version: task.version, accept: true }),
  ),
);
await check("stale response blocked", () =>
  assert.rejects(() =>
    anna.respond({ taskId: task.id, version: task.version - 1, accept: true }),
  ),
);
await check("decline triggers next employee", async () => {
  await anna.respond({ taskId: task.id, version: task.version, accept: false });
  task = (await ola.board(range)).tasks.find((t) => t.id === task.id);
  assert.equal(task.userId, 3);
});
await check("all decline signals coordinator", async () => {
  await ola.respond({ taskId: task.id, version: task.version, accept: false });
  task = (await manager.board(range)).tasks.find((t) => t.id === task.id);
  assert.equal(task.userId, null);
  assert.equal(task.status, "UNASSIGNED");
  assert(task.alert);
});
await check("forced assignment bypasses decline", async () => {
  await manager.assign({
    taskId: task.id,
    version: task.version,
    userId: 2,
    force: true,
    reason: "Uzgodniono telefonicznie w teście",
  });
  task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
  assert.equal(task.status, "FORCED");
});
await check("local adjustments bounded", () =>
  assert.rejects(() =>
    manager.adjustStay({
      ...range,
      reservationId: task.reservationId,
      unitId: task.unitId,
      earlyMinutes: 0,
      lateMinutes: 240,
    }),
  ),
);
await check(
  "local correction reoffers and updates worker calendar",
  async () => {
    await manager.adjustStay({
      ...range,
      reservationId: task.reservationId,
      unitId: task.unitId,
      earlyMinutes: 0,
      lateMinutes: 60,
    });
    task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
    assert.equal(task.stayTo.slice(11), "11:00");
    assert.equal(task.status, "OFFERED");
  },
);
await check("checklist cannot be forged before starting", () =>
  assert.rejects(() =>
    anna.saveChecklist({
      taskId: task.id,
      version: task.version,
      checks: ["general:0"],
    }),
  ),
);
await check("configure reward and extra checklist", async () => {
  await manager.configureTask({
    taskId: task.id,
    version: task.version,
    rewardCents: 5000,
    rewardPoints: 250,
    extraItems: ["Sprawdź zapas mydła"],
  });
  task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
});
await check("accept then start in allotted time", async () => {
  await anna.respond({ taskId: task.id, version: task.version, accept: true });
  task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
  globalThis.__cleaningQaNow = task.start;
  await anna.start({ taskId: task.id, version: task.version });
  task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
  assert.equal(task.status, "IN_PROGRESS");
});
await check("completion requires all evidence", () =>
  assert.rejects(() =>
    anna.complete({ taskId: task.id, version: task.version }),
  ),
);
const { checklistKeys } = await import(
  new URL("../../src/server/cleaning/workforce-domain.ts", import.meta.url)
);
await anna.saveChecklist({
  taskId: task.id,
  version: task.version,
  checks: checklistKeys(task),
});
task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
const jpeg =
  "data:image/jpeg;base64," +
  Buffer.from([255, 216, 255, ...Array(20).fill(0)]).toString("base64");
await check("photo ownership enforced and evidence accepted", async () => {
  for (const category of ["kitchen", "room", "bathroom"]) {
    await anna.addPhoto({
      taskId: task.id,
      version: task.version,
      category,
      photo: jpeg,
    });
    task = (await anna.board(range)).tasks.find((t) => t.id === task.id);
  }
  await assert.rejects(() => ola.photo({ id: task.photos[0].id }));
  assert(
    (await anna.photo({ id: task.photos[0].id })).data.startsWith(
      "data:image/jpeg",
    ),
  );
});
await check("completion credits reward only once", async () => {
  await anna.complete({ taskId: task.id, version: task.version });
  await assert.rejects(() =>
    anna.complete({ taskId: task.id, version: task.version }),
  );
  const b = await anna.board(range);
  assert.equal(b.balance.cents, 5000);
  assert.equal(b.balance.points, 250);
});
await check("reward exchange and monthly cap", async () => {
  await anna.redeem({ option: "cash10" });
  await assert.rejects(() => anna.redeem({ option: "cash10" }));
  const b = await anna.board(range);
  assert.equal(b.balance.cents, 6000);
  assert.equal(b.balance.points, 50);
});
await check("concurrent payout cannot overspend wallet", async () => {
  const results = await Promise.allSettled([
    anna.requestPayout({ cents: 5000 }),
    anna.requestPayout({ cents: 5000 }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await anna.board(range)).balance.cents, 1000);
});
await check("payout stages and reject refunds reserved balance", async () => {
  const entry = (await manager.board(range)).ledger.find(
    (l) => l.kind === "PAYOUT",
  );
  await manager.payoutStatus({ id: entry.id, status: "APPROVED" });
  await manager.payoutStatus({ id: entry.id, status: "REJECTED" });
  assert.equal((await anna.board(range)).balance.cents, 6000);
  await assert.rejects(() =>
    manager.payoutStatus({ id: entry.id, status: "COMPLETED" }),
  );
});
await check("create employee hashes password and enforces role", async () => {
  const created = await manager.createEmployee({
    displayName: "Ewa Testowa",
    email: "ewa@qa.invalid",
    password: "qa-created-2026",
    phone: null,
    photo: null,
    dailyLimit: 3,
    rules: {},
  });
  const u = db.inspection().users.find((u) => u.id === created.id);
  assert.equal(u.role, "CLEANER");
  assert.notEqual(u.passwordHash, "qa-created-2026");
});
await check("deactivated worker loses API access", async () => {
  const row = (await manager.team()).find((u) => u.id === 3);
  await manager.updateEmployee({
    userId: 3,
    displayName: row.cleaningProfile.displayName,
    phone: row.cleaningProfile.phone,
    photo: null,
    active: false,
    dailyLimit: 4,
    rules: {},
  });
  await assert.rejects(() => ola.board(range));
});
await check(
  "notification queue never sends and supersedes old offers",
  async () => {
    const n = db.inspection().notifications;
    assert(n.some((n) => n.status === "SUPERSEDED"));
    assert(n.every((n) => n.payload.deliveryEnabled === false));
    assert(!n.some((n) => n.status === "DELIVERED"));
  },
);
await check(
  "profile photo failure rolls back contact request and audit",
  async () => {
    const before = db.inspection(),
      original = db.cleaningProfile.update;
    db.cleaningProfile.update = async () => {
      throw new Error("QA injected profile photo failure");
    };
    try {
      await assert.rejects(
        () =>
          anna.requestProfileChange({
            displayName: "Anna Nowa",
            phone: "+48000000002",
            email: "anna-nowa@qa.invalid",
            reason: "Aktualizacja danych i zdjęcia",
            photo: jpeg,
          }),
        /QA injected profile photo failure/,
      );
    } finally {
      db.cleaningProfile.update = original;
    }
    const after = db.inspection();
    assert.deepEqual(after.workspace, before.workspace);
    assert.deepEqual(after.profiles, before.profiles);
    assert.deepEqual(after.audit, before.audit);
  },
);
await check(
  "profile photo and contact request are atomic while contact approval remains required",
  async () => {
    await assert.rejects(() =>
      anna.saveProfile({
        displayName: "Anna Nowa",
        phone: "+48000000002",
        photo: null,
      }),
    );
    await anna.requestProfileChange({
      displayName: "Anna Nowa",
      phone: "+48000000002",
      email: "anna-nowa@qa.invalid",
      reason: "Aktualizacja nazwiska i adresu email",
      photo: jpeg,
    });
    const profile = await anna.profile();
    assert.equal(profile.cleaningProfile.displayName, "Anna Testowa");
    assert.equal(profile.cleaningProfile.photo, jpeg);
    const r = (await manager.board(range)).profileRequests[0];
    assert(!Object.hasOwn(r, "photo"));
    await manager.reviewProfileChange({ id: r.id, approve: true });
    assert.equal(
      (await anna.profile()).cleaningProfile.displayName,
      "Anna Nowa",
    );
    assert.equal((await anna.profile()).email, "anna-nowa@qa.invalid");
    assert.equal((await anna.profile()).cleaningProfile.photo, jpeg);
  },
);
await check("password help is generic and deduplicated", async () => {
  const a = await anonymous.requestPasswordHelp({ email: "nobody@qa.invalid" });
  const b = await anonymous.requestPasswordHelp({
    email: "anna-nowa@qa.invalid",
  });
  assert.equal(a.message, b.message);
  await anonymous.requestPasswordHelp({ email: "anna-nowa@qa.invalid" });
  assert.equal((await manager.board(range)).passwordHelp.length, 1);
});
await check(
  "own password change checks old secret and revokes prior sessions",
  async () => {
    await assert.rejects(() =>
      anna.changePassword({
        oldPassword: "wrong",
        newPassword: "qa-replaced-2026",
      }),
    );
    const result = await anna.changePassword({
      oldPassword: "qa-password-2026",
      newPassword: "qa-replaced-2026",
    });
    assert(result.token);
    await assert.rejects(() => anna.board(range));
    const current = router.createCaller({
      ...ctx(2),
      cleaningAuth: { ...ctx(2).cleaningAuth, credentialVersion: 1 },
    });
    assert((await current.board(range)).tasks.length);
  },
);
await check(
  "coordinator password reset revokes sessions and resolves help",
  async () => {
    await manager.resetEmployeePassword({
      userId: 2,
      password: "qa-reset-2026",
    });
    const stale = router.createCaller({
      ...ctx(2),
      cleaningAuth: { ...ctx(2).cleaningAuth, credentialVersion: 1 },
    });
    await assert.rejects(() => stale.board(range));
    assert.equal((await manager.board(range)).passwordHelp.length, 0);
    const { cleaningAuthRouter } = await import(
      new URL("../../src/server/api/routers/cleaning-auth.ts", import.meta.url)
    );
    const login = cleaningAuthRouter.createCaller({
      db,
      session: null,
      headers: new Headers(),
    });
    await assert.rejects(() =>
      login.login({
        email: "anna-nowa@qa.invalid",
        password: "qa-replaced-2026",
      }),
    );
    assert(
      (
        await login.login({
          email: "anna-nowa@qa.invalid",
          password: "qa-reset-2026",
        })
      ).token,
    );
  },
);
console.log(
  JSON.stringify(
    { passed: cases.length, cases, productionWrites: 0, whatsappSent: 0 },
    null,
    2,
  ),
);
