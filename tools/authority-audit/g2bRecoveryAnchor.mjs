import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, readdirSync, closeSync, fsyncSync, writeSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { evaluateCanonicalWriterPolicyMembers } from "./m3l3R3CanonicalPolicyParser.mjs";

export const G2B_RECOVERY_ANCHOR_SCHEMA = "myweb.iam.m3.recovery-anchor.v1";
export const G2B_RECOVERY_ANCHOR_DOMAIN = "MYWEB:IAM-M3-RECOVERY-ANCHOR:V1";
export const G2B_TARGET_RESOURCE = "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com";
export const G2B_TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";
export const MEMBER_CANONICALIZATION_VERSION = "IAM_MEMBER_CANONICAL_V1";
const ACTIVE_STATES = new Set(["ANCHOR_CREATED", "ANCHOR_PERSISTED", "ANCHOR_VERIFIED", "MUTATION_STARTED", "MUTATION_INDETERMINATE"]);
const SAFE_OPERATION_ID = /^[0-9a-f-]{36}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function appDataAnchorDirectory(environment) {
  const appData = environment?.LOCALAPPDATA || environment?.APPDATA;
  return typeof appData === "string" && appData.trim() ? join(appData, "MY-WEB", "authority-audit", "m3-recovery-anchors-v1") : null;
}

function validMember(member) {
  return typeof member === "string" && /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member);
}

function canonicalInput({ member, operationGenerationId, targetResource, targetRole, secretKeyId }) {
  if (!validMember(member) || !SAFE_OPERATION_ID.test(operationGenerationId) || targetResource !== G2B_TARGET_RESOURCE || targetRole !== G2B_TARGET_ROLE || !SAFE_OPERATION_ID.test(secretKeyId)) {
    throw new Error("invalid-recovery-anchor-context");
  }
  return [G2B_RECOVERY_ANCHOR_DOMAIN, G2B_RECOVERY_ANCHOR_SCHEMA, targetResource, targetRole, member, operationGenerationId, MEMBER_CANONICALIZATION_VERSION, secretKeyId].join("\n");
}

function digest(secret, input) {
  return createHmac("sha256", secret).update(input, "utf8").digest("hex");
}

function safeRecord(record) {
  return record && typeof record === "object" && !Array.isArray(record)
    && Object.keys(record).length === 11
    && ["schemaVersion", "domainVersion", "anchorDigest", "integrityDigest", "targetResource", "targetRole", "operationGenerationId", "memberCanonicalizationVersion", "secretKeyId", "anchorCreatedAt", "anchorState"].every((key) => Object.prototype.hasOwnProperty.call(record, key))
    && Object.keys(record).every((key) => !/^(?:rawMember|rawPrincipal|rawSecret|protectedSecret|rawPolicy|token|credential|stdout|stderr)$/i.test(key))
    && record.schemaVersion === G2B_RECOVERY_ANCHOR_SCHEMA
    && record.domainVersion === G2B_RECOVERY_ANCHOR_DOMAIN
    && SHA256.test(record.anchorDigest)
    && SHA256.test(record.integrityDigest)
    && record.targetResource === G2B_TARGET_RESOURCE
    && record.targetRole === G2B_TARGET_ROLE
    && SAFE_OPERATION_ID.test(record.operationGenerationId)
    && record.memberCanonicalizationVersion === MEMBER_CANONICALIZATION_VERSION
    && SAFE_OPERATION_ID.test(record.secretKeyId)
    && typeof record.anchorCreatedAt === "string" && Number.isFinite(Date.parse(record.anchorCreatedAt))
    && ["ANCHOR_PERSISTED", "ANCHOR_VERIFIED", "MUTATION_STARTED", "MUTATION_CONFIRMED", "MUTATION_INDETERMINATE", "RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_AMBIGUOUS"].includes(record.anchorState);
}

function atomicWrite(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeSync(fd, JSON.stringify(data));
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, path);
    const reread = JSON.parse(readFileSync(path, "utf8"));
    if (!safeRecord(reread) || reread.anchorDigest !== data.anchorDigest || reread.anchorState !== data.anchorState) throw new Error("anchor-reread-failed");
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function createG2BRecoveryAnchorStore({ directory = appDataAnchorDirectory(process.env) } = {}) {
  if (typeof directory !== "string" || directory.trim() === "") throw new Error("anchor-directory-required");
  const pathFor = (operationGenerationId) => join(directory, `${operationGenerationId}.json`);
  const load = (operationGenerationId) => {
    if (!SAFE_OPERATION_ID.test(operationGenerationId) || !existsSync(pathFor(operationGenerationId))) return Object.freeze({ state: "MISSING" });
    try {
      const record = JSON.parse(readFileSync(pathFor(operationGenerationId), "utf8"));
      return safeRecord(record) ? Object.freeze({ state: "READY", record: Object.freeze(record) }) : Object.freeze({ state: "INVALID" });
    } catch { return Object.freeze({ state: "INVALID" }); }
  };
  const activeCount = () => {
    if (!existsSync(directory)) return 0;
    let count = 0;
    for (const name of readdirSync(directory)) {
      if (!SAFE_OPERATION_ID.test(name.replace(/\.json$/, "")) || !name.endsWith(".json")) continue;
      const found = load(name.slice(0, -5));
      if (found.state !== "READY") return Number.POSITIVE_INFINITY;
      if (ACTIVE_STATES.has(found.record.anchorState)) count += 1;
    }
    return count;
  };
  return Object.freeze({
    directory,
    activeCount,
    hasAnyAnchor: () => existsSync(directory) && readdirSync(directory).some((name) => name.endsWith(".json")),
    load,
    create(record) {
      if (!safeRecord(record) || record.anchorState !== "ANCHOR_PERSISTED" || activeCount() !== 0) return Object.freeze({ ok: false, code: "ANCHOR_CREATE_BLOCKED" });
      try { atomicWrite(pathFor(record.operationGenerationId), record); return Object.freeze({ ok: true }); } catch { return Object.freeze({ ok: false, code: "ANCHOR_PERSISTENCE_FAILURE" }); }
    },
    transition(operationGenerationId, expectedState, nextState) {
      const loaded = load(operationGenerationId);
      const allowed = {
        ANCHOR_PERSISTED: ["ANCHOR_VERIFIED"], ANCHOR_VERIFIED: ["MUTATION_STARTED"],
        MUTATION_STARTED: ["MUTATION_CONFIRMED", "MUTATION_INDETERMINATE"],
        MUTATION_CONFIRMED: ["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_AMBIGUOUS"],
        MUTATION_INDETERMINATE: ["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_AMBIGUOUS"],
      };
      if (loaded.state !== "READY" || loaded.record.anchorState !== expectedState || !allowed[expectedState]?.includes(nextState) || !safeRecord({ ...loaded.record, anchorState: nextState })) return Object.freeze({ ok: false, code: "ANCHOR_TRANSITION_BLOCKED" });
      try { atomicWrite(pathFor(operationGenerationId), { ...loaded.record, anchorState: nextState }); return Object.freeze({ ok: true }); } catch { return Object.freeze({ ok: false, code: "ANCHOR_PERSISTENCE_FAILURE" }); }
    },
  });
}

export function buildG2BRecoveryAnchor({ member, secret, secretKeyId, operationGenerationId = randomUUID(), now = new Date().toISOString() } = {}) {
  const anchorDigest = digest(secret, canonicalInput({ member, secretKeyId, operationGenerationId, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE }));
  const metadata = { schemaVersion: G2B_RECOVERY_ANCHOR_SCHEMA, domainVersion: G2B_RECOVERY_ANCHOR_DOMAIN, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, operationGenerationId, memberCanonicalizationVersion: MEMBER_CANONICALIZATION_VERSION, secretKeyId, anchorCreatedAt: now };
  const integrityDigest = digest(secret, `${G2B_RECOVERY_ANCHOR_DOMAIN}:METADATA:V1\n${JSON.stringify(metadata)}`);
  return Object.freeze({ ...metadata, anchorDigest, integrityDigest, anchorState: "ANCHOR_PERSISTED" });
}

export function verifyG2BRecoveryAnchor({ record, member, secret, secretKeyId }) {
  if (!safeRecord(record) || record.secretKeyId !== secretKeyId || !Buffer.isBuffer(secret) || secret.length !== 32) return Object.freeze({ ok: false, state: "ANCHOR_INVALID" });
  try {
    const metadata = { schemaVersion: record.schemaVersion, domainVersion: record.domainVersion, targetResource: record.targetResource, targetRole: record.targetRole, operationGenerationId: record.operationGenerationId, memberCanonicalizationVersion: record.memberCanonicalizationVersion, secretKeyId: record.secretKeyId, anchorCreatedAt: record.anchorCreatedAt };
    const expectedIntegrity = Buffer.from(digest(secret, `${G2B_RECOVERY_ANCHOR_DOMAIN}:METADATA:V1\n${JSON.stringify(metadata)}`), "hex");
    const persistedIntegrity = Buffer.from(record.integrityDigest, "hex");
    if (expectedIntegrity.length !== persistedIntegrity.length || !timingSafeEqual(expectedIntegrity, persistedIntegrity)) return Object.freeze({ ok: false, state: "ANCHOR_INVALID" });
    const candidate = Buffer.from(digest(secret, canonicalInput({ member, secretKeyId, operationGenerationId: record.operationGenerationId, targetResource: record.targetResource, targetRole: record.targetRole })), "hex");
    const expected = Buffer.from(record.anchorDigest, "hex");
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    return Object.freeze({ ok: match, state: match ? "PRESENT_CONFIRMED" : "MEMBER_ABSENT_CONFIRMED" });
  } catch { return Object.freeze({ ok: false, state: "ANCHOR_INVALID" }); }
}

export function prepareG2BFutureM3Anchor({ identityContext, secretProvider, store, operationGenerationId = randomUUID(), now } = {}) {
  const member = identityContext?.exactIamMember;
  if (!validMember(member) || !secretProvider || !store) return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: "IDENTITY_OR_STORE_INVALID" });
  const secretResult = secretProvider.loadOrInitialize({ anchorsExist: store.hasAnyAnchor() });
  if (secretResult.state !== "READY") return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: "SECRET_UNAVAILABLE" });
  let record;
  try { record = buildG2BRecoveryAnchor({ member, secret: secretResult.secret, secretKeyId: secretResult.keyId, operationGenerationId, now }); } catch { return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: "ANCHOR_COMPUTE_FAILURE" }); }
  const persisted = store.create(record);
  if (!persisted.ok) return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: persisted.code });
  const reread = store.load(record.operationGenerationId);
  const verification = reread.state === "READY" ? verifyG2BRecoveryAnchor({ record: reread.record, member, secret: secretResult.secret, secretKeyId: secretResult.keyId }) : Object.freeze({ ok: false });
  if (!verification.ok || !store.transition(record.operationGenerationId, "ANCHOR_PERSISTED", "ANCHOR_VERIFIED").ok) return Object.freeze({ mutationReachable: false, state: "ANCHOR_PERSISTED", code: "ANCHOR_VERIFICATION_FAILURE" });
  const verified = store.load(record.operationGenerationId);
  if (verified.state !== "READY" || verified.record.anchorState !== "ANCHOR_VERIFIED") return Object.freeze({ mutationReachable: false, state: "ANCHOR_PERSISTED", code: "ANCHOR_REREAD_FAILURE" });
  return Object.freeze({ mutationReachable: true, state: "ANCHOR_VERIFIED", operationGenerationId: record.operationGenerationId, secretKeyId: secretResult.keyId });
}

export function recoverG2BAnchorPolicy({ record, secretResult, policyText } = {}) {
  if (!secretResult || secretResult.state !== "READY" || !safeRecord(record)) return Object.freeze({ state: secretResult?.state === "READY" ? "ANCHOR_INVALID" : "SECRET_UNAVAILABLE" });
  if (record.secretKeyId !== secretResult.keyId) return Object.freeze({ state: "ANCHOR_INVALID" });
  return evaluateCanonicalWriterPolicyMembers(policyText, (candidateMember) => {
    const verified = verifyG2BRecoveryAnchor({ record, member: candidateMember, secret: secretResult.secret, secretKeyId: secretResult.keyId });
    return verified.ok;
  });
}

export const G2B_RECOVERY_ANCHOR_CONTRACT = Object.freeze({
  type: "HMAC_SHA256_DOMAIN_SEPARATED_WINDOWS_DPAPI_CURRENT_USER",
  rawMemberPersisted: false,
  rawPrincipalPersisted: false,
  truncatedFingerprintAuthority: false,
  verifiedBeforeMutationRequired: true,
  opARequiredForRecovery: false,
  targetGeneration: "REPLACEMENT_WRITER_GENERATION_2B",
  targetResource: G2B_TARGET_RESOURCE,
  targetRole: G2B_TARGET_ROLE,
});
