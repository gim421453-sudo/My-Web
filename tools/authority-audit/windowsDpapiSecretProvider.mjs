import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, closeSync, fsyncSync, writeSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SECRET_SCHEMA = "myweb.m3.recovery-anchor.dpapi-secret.v1";
const SECRET_BYTES = 32;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const DPAPI_PROCESS_HOST = fileURLToPath(new URL("./invokeWindowsDpapi.ps1", import.meta.url));

function resolvePowerShell(environment) {
  const root = environment?.SystemRoot || environment?.WINDIR;
  return root ? join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
}

function localStoragePath(environment) {
  const appData = environment?.LOCALAPPDATA || environment?.APPDATA;
  if (typeof appData !== "string" || appData.trim() === "") return null;
  return join(appData, "MY-WEB", "authority-audit", "m3-recovery-anchor-secret-v1.json");
}

function safeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === 5
    && value.schema === SECRET_SCHEMA
    && typeof value.keyId === "string" && /^[0-9a-f-]{36}$/.test(value.keyId)
    && value.dpapiScope === "CurrentUser"
    && value.protection === "WINDOWS_DPAPI"
    && typeof value.protectedSecret === "string" && value.protectedSecret.length >= 40 && BASE64.test(value.protectedSecret);
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeSync(fd, JSON.stringify(value));
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, path);
    const verified = JSON.parse(readFileSync(path, "utf8"));
    if (!safeMetadata(verified) || verified.keyId !== value.keyId || verified.protectedSecret !== value.protectedSecret) {
      throw new Error("dpapi-secret-reread-verification-failed");
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function repairAuditPath(storagePath, repairId) {
  return join(dirname(storagePath), `m3-recovery-anchor-secret-repair-${repairId}.json`);
}

function safeRepairAudit(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === 8
    && value.schema === "myweb.m3.recovery-anchor.dpapi-secret-repair-audit.v1"
    && value.action === "REPLACE_INVALID_WITH_NEW_CURRENTUSER_SECRET"
    && value.provider === "WINDOWS_DPAPI_CURRENT_USER"
    && typeof value.repairId === "string" && /^[0-9a-f-]{36}$/.test(value.repairId)
    && typeof value.repairedAt === "string" && Number.isFinite(Date.parse(value.repairedAt))
    && ["VALID", "INVALID", "UNREADABLE"].includes(value.priorParseState)
    && typeof value.priorBlobPresent === "boolean"
    && ["SUCCESS", "FAILURE", "NOT_ATTEMPTED"].includes(value.priorUnprotectResult);
}

function writeRepairAudit(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, "wx", 0o600);
  try {
    writeSync(fd, JSON.stringify(value));
    fsyncSync(fd);
  } finally { closeSync(fd); }
  const reread = JSON.parse(readFileSync(path, "utf8"));
  if (!safeRepairAudit(reread) || reread.repairId !== value.repairId) throw new Error("dpapi-secret-repair-audit-verification-failed");
}

function invokeDpapi(mode, bytes, { environment = process.env, processHost = spawnSync, report = () => {} } = {}) {
  if (process.platform !== "win32" || !["protect", "unprotect"].includes(mode) || !Buffer.isBuffer(bytes)) return null;
  const result = processHost(resolvePowerShell(environment), ["-NoProfile", "-NonInteractive", "-File", DPAPI_PROCESS_HOST, "-Mode", mode], {
    input: bytes.toString("base64"), encoding: "utf8", windowsHide: true, shell: false, timeout: 15_000, maxBuffer: 64 * 1024,
  });
  if (result?.error) {
    report(Object.freeze({ category: "ENVIRONMENT_BLOCKED", code: ["EPERM", "EACCES", "ENOENT", "ENOTFOUND"].includes(result.error.code) ? result.error.code : "PROCESS_START_FAILED" }));
    return null;
  }
  if (result?.status !== 0 || typeof result.stdout !== "string") {
    const marker = mode === "unprotect" ? "MYWEB_DPAPI_UNPROTECT_FAILED_V1" : "MYWEB_DPAPI_PROTECT_FAILED_V1";
    if (result?.status === 23 && result.stdout?.trim() === marker && mode === "unprotect") {
      report(Object.freeze({ category: "DPAPI_UNPROTECT_FAILED", code: marker }));
    } else {
      report(Object.freeze({ category: "ENVIRONMENT_BLOCKED", code: "PROVIDER_PROCESS_FAILED" }));
    }
    return null;
  }
  const output = result.stdout.trim();
  if (!BASE64.test(output)) {
    report(Object.freeze({ category: "ENVIRONMENT_BLOCKED", code: "PROVIDER_OUTPUT_INVALID" }));
    return null;
  }
  try {
    const decoded = Buffer.from(output, "base64");
    report(Object.freeze({ category: "SUCCESS", code: "DPAPI_OPERATION_SUCCEEDED" }));
    return decoded;
  } catch {
    report(Object.freeze({ category: "ENVIRONMENT_BLOCKED", code: "PROVIDER_OUTPUT_INVALID" }));
    return null;
  }
}

export function createWindowsDpapiSecretProvider({ storagePath = localStoragePath(process.env), environment = process.env, processHost = spawnSync } = {}) {
  if (typeof storagePath !== "string" || storagePath.trim() === "") throw new Error("dpapi-secret-storage-path-required");
  const protect = (secret) => invokeDpapi("protect", secret, { environment, processHost });
  const unprotect = (protectedSecret) => invokeDpapi("unprotect", protectedSecret, { environment, processHost });
  const inspect = () => {
    if (!existsSync(storagePath)) return Object.freeze({ state: "MISSING", metadataPresent: false, parseState: "VALID", blobPresent: false, unprotectAttemptSafe: false, unprotectResult: "NOT_ATTEMPTED" });
    let parsed;
    try { parsed = JSON.parse(readFileSync(storagePath, "utf8")); } catch { return Object.freeze({ state: "INVALID", metadataPresent: true, parseState: "UNREADABLE", blobPresent: false, unprotectAttemptSafe: false, unprotectResult: "NOT_ATTEMPTED" }); }
    const blobPresent = typeof parsed?.protectedSecret === "string" && parsed.protectedSecret.length > 0;
    if (!safeMetadata(parsed)) return Object.freeze({ state: "INVALID", metadataPresent: true, parseState: "INVALID", blobPresent, unprotectAttemptSafe: false, unprotectResult: "NOT_ATTEMPTED" });
    let dpapiOutcome = null;
    const secret = invokeDpapi("unprotect", Buffer.from(parsed.protectedSecret, "base64"), { environment, processHost, report: (value) => { dpapiOutcome = value; } });
    if (!secret || secret.length !== SECRET_BYTES) {
      const failedByDpapi = dpapiOutcome?.category === "DPAPI_UNPROTECT_FAILED";
      return Object.freeze({ state: failedByDpapi ? "INVALID" : "ENVIRONMENT_BLOCKED", metadataPresent: true, parseState: "VALID", blobPresent: true, unprotectAttemptSafe: true, unprotectResult: failedByDpapi ? "FAILURE" : "ENVIRONMENT_BLOCKED", failureCategory: dpapiOutcome?.code || "PROVIDER_OUTCOME_UNKNOWN" });
    }
    return Object.freeze({ state: "READY", metadataPresent: true, parseState: "VALID", blobPresent: true, unprotectAttemptSafe: true, unprotectResult: "SUCCESS", secret, keyId: parsed.keyId, metadata: Object.freeze({ schema: parsed.schema, dpapiScope: parsed.dpapiScope, protection: parsed.protection }) });
  };
  return Object.freeze({
    semantic: "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1",
    storagePath,
    inspect,
    read() {
      const result = inspect();
      return result.state === "READY"
        ? Object.freeze({ state: "READY", secret: result.secret, keyId: result.keyId, metadata: result.metadata })
        : Object.freeze({ state: result.state, failureCategory: result.failureCategory });
    },
    loadOrInitialize({ anchorsExist = false } = {}) {
      const existing = this.read();
      if (existing.state === "READY" || existing.state === "INVALID") return existing;
      if (anchorsExist !== false) return Object.freeze({ state: "INVALID" });
      const secret = randomBytes(SECRET_BYTES);
      const protectedSecret = protect(secret);
      if (!protectedSecret || protectedSecret.length === 0) return Object.freeze({ state: "INVALID" });
      const metadata = Object.freeze({ schema: SECRET_SCHEMA, keyId: randomUUID(), dpapiScope: "CurrentUser", protection: "WINDOWS_DPAPI", protectedSecret: protectedSecret.toString("base64") });
      try { atomicWriteJson(storagePath, metadata); } catch { return Object.freeze({ state: "INVALID" }); }
      return this.read();
    },
    repairInvalidMetadata({ anchorsExist = false, now = new Date().toISOString() } = {}) {
      const before = inspect();
      if (before.state === "READY") return Object.freeze({ state: "READY", action: "RECOVER_EXISTING", keyId: before.keyId });
      if (before.state !== "INVALID" || anchorsExist !== false) return Object.freeze({ state: "INVALID", action: "BLOCKED" });
      const secret = randomBytes(SECRET_BYTES);
      const protectedSecret = protect(secret);
      if (!protectedSecret || protectedSecret.length === 0) return Object.freeze({ state: "INVALID", action: "BLOCKED" });
      const metadata = Object.freeze({ schema: SECRET_SCHEMA, keyId: randomUUID(), dpapiScope: "CurrentUser", protection: "WINDOWS_DPAPI", protectedSecret: protectedSecret.toString("base64") });
      const audit = Object.freeze({ schema: "myweb.m3.recovery-anchor.dpapi-secret-repair-audit.v1", action: "REPLACE_INVALID_WITH_NEW_CURRENTUSER_SECRET", provider: "WINDOWS_DPAPI_CURRENT_USER", repairId: randomUUID(), repairedAt: now, priorParseState: before.parseState, priorBlobPresent: before.blobPresent, priorUnprotectResult: before.unprotectResult });
      try {
        writeRepairAudit(repairAuditPath(storagePath, audit.repairId), audit);
        atomicWriteJson(storagePath, metadata);
      } catch { return Object.freeze({ state: "INVALID", action: "BLOCKED" }); }
      const after = this.read();
      return after.state === "READY"
        ? Object.freeze({ state: "READY", action: "REPLACE_INVALID_WITH_NEW_CURRENTUSER_SECRET", keyId: after.keyId, repairAudit: Object.freeze({ provider: audit.provider, priorParseState: audit.priorParseState, priorBlobPresent: audit.priorBlobPresent, priorUnprotectResult: audit.priorUnprotectResult }) })
        : Object.freeze({ state: "INVALID", action: "BLOCKED" });
    },
  });
}

export const WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT = Object.freeze({
  semantic: "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1",
  schema: SECRET_SCHEMA,
  secretBytes: SECRET_BYTES,
  protection: "WINDOWS_DPAPI",
  scope: "CurrentUser",
  storage: "LOCAL_APPDATA_OUTSIDE_REPOSITORY",
  secretCommandLineReachable: false,
  secretEvidenceReachable: false,
  silentRotationAllowed: false,
  explicitInvalidMetadataRepairRequired: true,
});
