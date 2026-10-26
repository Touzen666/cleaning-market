import { randomUUID, randomBytes, pbkdf2Sync } from "node:crypto";
import { units } from "./cleaning-qa-source.mjs";
const clone = (v) => structuredClone(v);
const pick = (v, select) =>
  !v
    ? null
    : !select
      ? clone(v)
      : Object.fromEntries(
          Object.entries(select)
            .filter(([, s]) => s)
            .map(([k, s]) => [
              k,
              typeof s === "object" && s.select
                ? Array.isArray(v[k])
                  ? v[k].map((x) => pick(x, s.select))
                  : pick(v[k], s.select)
                : clone(v[k]),
            ]),
        );
const rules = {
  version: 1,
  unavailableDates: [],
  unavailableWeekdays: [],
  excludedUnitIds: [],
  note: "",
};
const hash = (password) => {
  const salt = randomBytes(16);
  return (
    salt.toString("hex") +
    ":" +
    pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex")
  );
};
export function memoryDatabase() {
  let data = {
    users: [
      {
        id: 1,
        email: "manager@qa.invalid",
        role: "MANAGER",
        passwordHash: hash("qa-password-2026"),
      },
      {
        id: 2,
        email: "anna@qa.invalid",
        role: "CLEANER",
        passwordHash: hash("qa-password-2026"),
      },
      {
        id: 3,
        email: "ola@qa.invalid",
        role: "CLEANER",
        passwordHash: hash("qa-password-2026"),
      },
    ],
    profiles: [
      {
        userId: 2,
        displayName: "Anna Testowa",
        phone: "+48000000002",
        photo: null,
        active: true,
        dailyLimit: 4,
        rules: clone(rules),
      },
      {
        userId: 3,
        displayName: "Ola Testowa",
        phone: "+48000000003",
        photo: null,
        active: true,
        dailyLimit: 4,
        rules: clone(rules),
      },
    ],
    workspace: null,
    assets: [],
    audit: [],
    notifications: [],
  };
  let tail = Promise.resolve();
  const db = {
    cleaningUser: {
      findUnique: async (a) =>
        pick(
          (() => {
            const u = data.users.find((u) =>
              a.where.id ? u.id === a.where.id : u.email === a.where.email,
            );
            return u
              ? {
                  ...u,
                  cleaningProfile:
                    data.profiles.find((p) => p.userId === u.id) ?? null,
                }
              : null;
          })(),
          a.select,
        ),
      findMany: async (a) =>
        data.users
          .filter((u) => !a.where?.role || u.role === a.where.role)
          .map((u) =>
            pick(
              {
                ...u,
                cleaningProfile:
                  data.profiles.find((p) => p.userId === u.id) ?? null,
              },
              a.select,
            ),
          ),
      create: async (a) => {
        if (data.users.some((u) => u.email === a.data.email))
          throw new Error("Email already exists");
        const id = Math.max(...data.users.map((u) => u.id)) + 1;
        const { cleaningProfile, ...u } = a.data;
        data.users.push({ id, ...u });
        if (cleaningProfile)
          data.profiles.push({
            userId: id,
            active: true,
            ...clone(cleaningProfile.create),
          });
        return pick({ id, ...u }, a.select);
      },
      update: async (a) => {
        const u = data.users.find((u) => u.id === a.where.id);
        Object.assign(u, a.data);
        return pick(u, a.select);
      },
    },
    cleaningProfile: {
      findUnique: async (a) =>
        pick(
          data.profiles.find((p) => p.userId === a.where.userId) ?? null,
          a.select,
        ),
      findMany: async (a) =>
        data.profiles
          .filter(
            (p) => !a.where?.userId?.in || a.where.userId.in.includes(p.userId),
          )
          .map((p) => pick(p, a.select)),
      update: async (a) => {
        const p = data.profiles.find((p) => p.userId === a.where.userId);
        if (!p) throw new Error("Cleaning profile not found");
        Object.assign(p, clone(a.data));
        return pick(p, a.select);
      },
      upsert: async (a) => {
        let p = data.profiles.find((p) => p.userId === a.where.userId);
        if (p) Object.assign(p, clone(a.update));
        else {
          p = {
            active: true,
            dailyLimit: 4,
            phone: null,
            photo: null,
            ...clone(a.create),
          };
          data.profiles.push(p);
        }
        return clone(p);
      },
    },
    cleaningWorkspace: {
      findUnique: async (a) =>
        data.workspace && data.workspace.id === a.where.id
          ? pick(data.workspace, a.select)
          : null,
      upsert: async (a) => {
        if (!data.workspace)
          data.workspace = { revision: 0, ...clone(a.create) };
        else data.workspace.revision += a.update.revision?.increment ?? 0;
        return clone(data.workspace);
      },
      update: async (a) => {
        Object.assign(data.workspace, clone(a.data));
        return clone(data.workspace);
      },
    },
    cleaningAuditEvent: {
      create: async (a) => {
        const r = { id: randomUUID(), createdAt: new Date(), ...clone(a.data) };
        data.audit.push(r);
        return clone(r);
      },
      findMany: async () => clone(data.audit),
    },
    cleaningAsset: {
      create: async (a) => {
        const r = { id: randomUUID(), ...clone(a.data) };
        data.assets.push(r);
        return pick(r, a.select);
      },
      findUnique: async (a) =>
        clone(data.assets.find((p) => p.id === a.where.id) ?? null),
    },
    cleaningNotification: {
      findMany: async (a) =>
        data.notifications
          .filter(
            (r) =>
              (!a.where.workspaceId || r.workspaceId === a.where.workspaceId) &&
              (!a.where.dedupeKey?.in ||
                a.where.dedupeKey.in.includes(r.dedupeKey)),
          )
          .map((r) => pick(r, a.select)),
      createMany: async (a) => {
        let count = 0;
        for (const item of a.data) {
          if (data.notifications.some((r) => r.dedupeKey === item.dedupeKey))
            continue;
          data.notifications.push({ id: randomUUID(), ...clone(item) });
          count++;
        }
        return { count };
      },
      updateMany: async (a) => {
        let count = 0;
        for (const r of data.notifications) {
          const w = a.where;
          if (w.workspaceId && r.workspaceId !== w.workspaceId) continue;
          if (w.dedupeKey?.notIn?.includes(r.dedupeKey)) continue;
          if (w.dedupeKey?.in && !w.dedupeKey.in.includes(r.dedupeKey))
            continue;
          if (typeof w.dedupeKey === "string" && r.dedupeKey !== w.dedupeKey)
            continue;
          if (w.status?.in && !w.status.in.includes(r.status)) continue;
          Object.assign(r, clone(a.data));
          count++;
        }
        return { count };
      },
      upsert: async (a) => {
        let r = data.notifications.find(
          (r) => r.dedupeKey === a.where.dedupeKey,
        );
        if (r) Object.assign(r, clone(a.update));
        else {
          r = { id: randomUUID(), ...clone(a.create) };
          data.notifications.push(r);
        }
        return clone(r);
      },
      groupBy: async () =>
        Object.entries(
          data.notifications.reduce(
            (a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a),
            {},
          ),
        ).map(([status, _count]) => ({ status, _count })),
    },
    apartment: {
      findMany: async (a) =>
        a.where.archived
          ? []
          : units.map((u, i) => ({
              id: i + 1,
              name: u.name,
              idobookingId: u.id,
              address: u.address,
              images: [],
              rooms: [],
            })),
    },
    $transaction: async (fn) => {
      let unlock;
      const previous = tail;
      tail = new Promise((resolve) => (unlock = resolve));
      await previous;
      const backup = clone(data);
      try {
        return await fn(db);
      } catch (e) {
        data = backup;
        throw e;
      } finally {
        unlock();
      }
    },
    inspection: () => clone(data),
  };
  return db;
}
