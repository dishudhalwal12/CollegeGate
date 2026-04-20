import fs from "node:fs";
import path from "node:path";
import {
  defaultSystemConfig,
  serializeGateLog,
  serializeOutpass,
  serializeUser,
  type GateLog,
  type OutpassRecord,
  type SystemConfig,
  type UserProfile,
} from "@/lib/collegegate";

type LocalStore = {
  users: Record<string, Record<string, unknown>>;
  outpasses: Record<string, Record<string, unknown>>;
  gateLogs: Record<string, Record<string, unknown>>;
  systemConfig: SystemConfig;
};

const storeDirectory = path.join(process.cwd(), ".collegegate");
const storeFilePath = path.join(storeDirectory, "local-store.json");

function ensureStore() {
  if (!fs.existsSync(storeDirectory)) {
    fs.mkdirSync(storeDirectory, { recursive: true });
  }

  if (!fs.existsSync(storeFilePath)) {
    fs.writeFileSync(
      storeFilePath,
      JSON.stringify(
        {
          users: {},
          outpasses: {},
          gateLogs: {},
          systemConfig: defaultSystemConfig,
        } satisfies LocalStore,
        null,
        2,
      ),
      "utf8",
    );
  }
}

function readStore(): LocalStore {
  ensureStore();

  const parsed = JSON.parse(fs.readFileSync(storeFilePath, "utf8")) as Partial<LocalStore>;

  return {
    users: parsed.users ?? {},
    outpasses: parsed.outpasses ?? {},
    gateLogs: parsed.gateLogs ?? {},
    systemConfig: {
      ...defaultSystemConfig,
      ...(parsed.systemConfig ?? {}),
    },
  };
}

function writeStore(store: LocalStore) {
  ensureStore();
  fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2), "utf8");
}

function mutateStore<T>(mutator: (store: LocalStore) => T) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

function collectErrorMessages(error: unknown): string[] {
  if (typeof error === "string") {
    return [error];
  }

  if (!error || typeof error !== "object") {
    return [];
  }

  const messages = new Set<string>();
  const record = error as {
    message?: unknown;
    error?: unknown;
    cause?: unknown;
    details?: unknown;
    body?: unknown;
  };

  if (typeof record.message === "string") {
    messages.add(record.message);
  }

  if (typeof record.error === "string") {
    messages.add(record.error);
  } else if (record.error) {
    collectErrorMessages(record.error).forEach((message) => messages.add(message));
  }

  if (record.cause) {
    collectErrorMessages(record.cause).forEach((message) => messages.add(message));
  }

  if (typeof record.details === "string") {
    messages.add(record.details);
  }

  if (typeof record.body === "string") {
    messages.add(record.body);
  }

  return [...messages];
}

function isPermissionDeniedMessage(message: string) {
  return /(?:missing or )?insufficient permissions|permission[_ -]?denied/i.test(message);
}

export function shouldUseLocalStore(error: unknown) {
  return collectErrorMessages(error).some(
    (message) =>
      isPermissionDeniedMessage(message) ||
      /firestore request failed|firestore lookup failed/i.test(message),
  );
}

export function getLocalUser(uid: string) {
  const store = readStore();
  const user = store.users[uid];
  return user ? serializeUser(uid, user) : null;
}

export function listLocalUsers() {
  const store = readStore();
  return Object.entries(store.users).map(([uid, user]) => serializeUser(uid, user));
}

export function upsertLocalUser(uid: string, data: Record<string, unknown>) {
  return mutateStore((store) => {
    const nextUser = {
      ...(store.users[uid] ?? {}),
      ...data,
    };

    store.users[uid] = nextUser;
    return serializeUser(uid, nextUser);
  });
}

export function getLocalSystemConfig() {
  return readStore().systemConfig;
}

export function setLocalSystemConfig(data: Partial<SystemConfig>) {
  return mutateStore((store) => {
    store.systemConfig = {
      ...store.systemConfig,
      ...data,
    };

    return store.systemConfig;
  });
}

export function listLocalOutpasses() {
  const store = readStore();
  return Object.entries(store.outpasses).map(([id, outpass]) => serializeOutpass(id, outpass));
}

export function getLocalOutpass(outpassId: string) {
  const store = readStore();
  const outpass = store.outpasses[outpassId];
  return outpass ? serializeOutpass(outpassId, outpass) : null;
}

export function upsertLocalOutpass(outpassId: string, data: Record<string, unknown>) {
  return mutateStore((store) => {
    const nextOutpass = {
      ...(store.outpasses[outpassId] ?? {}),
      ...data,
    };

    store.outpasses[outpassId] = nextOutpass;
    return serializeOutpass(outpassId, nextOutpass);
  });
}

export function listLocalGateLogs() {
  const store = readStore();
  return Object.entries(store.gateLogs).map(([id, log]) => serializeGateLog(id, log));
}

export function upsertLocalGateLog(logId: string, data: Record<string, unknown>) {
  return mutateStore((store) => {
    const nextLog = {
      ...(store.gateLogs[logId] ?? {}),
      ...data,
    };

    store.gateLogs[logId] = nextLog;
    return serializeGateLog(logId, nextLog);
  });
}

export function getFirstActiveLocalUser(role: UserProfile["role"]) {
  return listLocalUsers().find((user) => user.role === role && user.isActive) ?? null;
}

export function countActiveLocalAdmins() {
  return listLocalUsers().filter((user) => user.role === "admin" && user.isActive).length;
}

export function clearLocalUser(uid: string) {
  mutateStore((store) => {
    delete store.users[uid];
    return null;
  });
}

export function readLocalStoreSnapshot() {
  const store = readStore();
  return {
    users: Object.entries(store.users).map(([uid, user]) => serializeUser(uid, user)),
    outpasses: Object.entries(store.outpasses).map(([id, outpass]) =>
      serializeOutpass(id, outpass),
    ),
    gateLogs: Object.entries(store.gateLogs).map(([id, log]) => serializeGateLog(id, log)),
    config: store.systemConfig,
  };
}

export type { GateLog, OutpassRecord, SystemConfig, UserProfile };
