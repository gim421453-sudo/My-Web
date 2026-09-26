import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createG2BGenerationBoundReadOnlyRecoveryV3R2Executor,
  G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE,
  prepareG2BGenerationBoundReadOnlyRecoveryV3R2,
  resolveG2BRecoveryV3R2Context,
  verifyG2BGenerationBoundReadOnlyRecoveryV3R2,
} from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal } from "../authority-audit/g2bRecoveryExecutionJournal.mjs";
import { createG2BRecoveryPostExecutionEvidenceWriter } from "../authority-audit/g2bRecoveryPostExecutionEvidence.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-recovery-v3r2-"));
const account = "recovery-v3r2@example.invalid";
const member = `user:${account}`;
const context = Object.freeze(Object.defineProperties({}, {
  exactPrincipal: { value: account, enumerable: false },
  exactIamMember: { value: member, enumerable: false },
}));
const secretBytes = randomBytes(32);
const secretKeyId = randomUUID();
const readSecret = () => Object.freeze({ state: "READY", secret: Buffer.from(secretBytes), keyId: secretKeyId });
const secretProvider = Object.freeze({ read: readSecret, loadOrInitialize: readSecret });
const readiness = Object.freeze({ ok: true, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", freshnessMarginSeconds: 120, networkRequests: 0, refreshMethodInvocations: 0 });

function setup(name) {
  const directory = join(root, name);
  const store = createG2BRecoveryAnchorStore({ directory: join(directory, "anchor") });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
  const resolved = resolveG2BRecoveryV3R2Context({ identityContext: context, secretProvider, store });
  assert.equal(resolved.ok, true);
  return { recoveryContext: resolved.context, store, journal: createG2BRecoveryExecutionJournal({ directory: join(directory, "journal"), now: () => "2026-09-15T00:00:00.000Z" }), finalizer: createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(directory, "final") }) };
}

function altered(base, key, value) {
  const copy = { operationInstance: base.operationInstance, parentInterruptedM3Generation: base.parentInterruptedM3Generation, targetResource: base.targetResource, targetRole: base.targetRole, authContextId: base.authContextId, recoveryAnchorVerified: base.recoveryAnchorVerified };
  Object.defineProperties(copy, {
    identityContext: { value: base.identityContext, enumerable: false, configurable: true }, secretProvider: { value: base.secretProvider, enumerable: false, configurable: true }, store: { value: base.store, enumerable: false, configurable: true }, account: { value: base.account, enumerable: false, configurable: true }, member: { value: base.member, enumerable: false, configurable: true },
  });
  if (["identityContext", "secretProvider", "store", "account", "member"].includes(key)) Object.defineProperty(copy, key, { value, enumerable: false });
  else copy[key] = value;
  return Object.freeze(copy);
}

try {
  const prepared = setup("prepared");
  const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3R2({ recoveryContext: prepared.recoveryContext, readiness });
  assert.equal(authority.ok, true);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecoveryV3R2(authority, { recoveryContext: prepared.recoveryContext, readiness }).ok, true);
  assert.equal(Object.keys(prepared.recoveryContext).includes("account"), false);
  assert.equal(Object.keys(prepared.recoveryContext).includes("member"), false);

  const live = setup("live");
  let approvalCalls = 0;
  let transportCalls = 0;
  const output = await createG2BGenerationBoundReadOnlyRecoveryV3R2Executor().execute({
    enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => { approvalCalls += 1; return true; }, preliveReadiness: readiness, recoveryContext: live.recoveryContext, journal: live.journal, finalizer: live.finalizer,
    transport: Object.freeze({ readGenerationBoundRecoveryPolicy: async (request) => {
      transportCalls += 1;
      assert.deepEqual(request, { resource: G2B_TARGET_RESOURCE, role: G2B_TARGET_ROLE, authPathId: live.recoveryContext.authContextId, account, member });
      return Object.freeze({ ok: true, physicalCalls: 1, policy: Object.freeze({ etag: "fixture", version: 3, bindings: [] }), safeTransportMetadata: Object.freeze({ requestStarted: true, httpStatusClass: "2XX", httpStatusCodeSafe: 200, providerResult: "SUCCESS" }) });
    } }),
  });
  assert.equal(approvalCalls, 1);
  assert.equal(transportCalls, 1);
  assert.equal(output.recoveryResult, "RECOVERY_CONFIRMED_ABSENT");
  assert.equal(output.postExecutionFinalization.remoteOperations, 0);

  for (const [key, value] of [
    ["identityContext", undefined], ["secretProvider", undefined], ["store", undefined], ["account", undefined], ["member", undefined], ["authContextId", "wrong"], ["targetResource", "wrong"], ["targetRole", "wrong"], ["operationInstance", randomUUID()], ["recoveryAnchorVerified", false],
  ]) {
    const fixture = setup(`invalid-${key}`);
    let approvals = 0;
    let calls = 0;
    const blocked = await createG2BGenerationBoundReadOnlyRecoveryV3R2Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => { approvals += 1; return true; }, preliveReadiness: readiness, recoveryContext: altered(fixture.recoveryContext, key, value), journal: fixture.journal, transport: Object.freeze({ readGenerationBoundRecoveryPolicy: async () => { calls += 1; return null; } }) });
    assert.equal(blocked.code, "RECOVERY_V3R2_CONTEXT_BOUNDARY_REQUIRED");
    assert.equal(approvals, 0);
    assert.equal(calls, 0);
    assert.equal(fixture.journal.load(G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE).state, "MISSING");
  }

  const anchorCases = [
    { name: "current-valid", state: "ANCHOR_VERIFIED", identity: context, secretState: "READY", expected: "PASS" },
    { name: "historical-sandbox-failure-current-pass", state: "ANCHOR_VERIFIED", identity: context, secretState: "READY", expected: "PASS" },
    { name: "newer-actual-invalid", state: "ANCHOR_VERIFIED", identity: context, secretState: "INVALID", expected: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" },
    { name: "generation-mismatch", state: "ANCHOR_VERIFIED", identity: context, secretState: "READY", anchorGeneration: "22222222-2222-4222-8222-222222222222", expected: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" },
    { name: "identity-mismatch", state: "ANCHOR_VERIFIED", identity: { exactIamMember: "user:other-anchor@example.invalid" }, secretState: "READY", expected: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" },
    { name: "sandbox-only-eperm", state: "ANCHOR_VERIFIED", identity: context, secretState: "ENVIRONMENT_BLOCKED", expected: "RECOVERY_V3R2_ANCHOR_ENVIRONMENT_BLOCKED" },
    { name: "stale-failure-current-pass", state: "ANCHOR_VERIFIED", identity: context, secretState: "READY", expected: "PASS" },
    { name: "stale-pass-current-invalid", state: "ANCHOR_VERIFIED", identity: context, secretState: "INVALID", expected: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" },
  ];
  for (const fixture of anchorCases) {
    const store = createG2BRecoveryAnchorStore({ directory: join(root, `anchor-selection-${fixture.name}`) });
    const caseIdentity = fixture.identity;
    assert.equal(prepareG2BFutureM3Anchor({ identityContext: caseIdentity, secretProvider, store, operationGenerationId: fixture.anchorGeneration || "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
    const currentProvider = { read: () => fixture.secretState === "READY" ? readSecret() : { state: fixture.secretState } };
    const selected = resolveG2BRecoveryV3R2Context({ identityContext: context, secretProvider: currentProvider, store });
    assert.equal(selected.ok ? "PASS" : selected.code, fixture.expected, fixture.name);
  }

  const terminalCurrentGeneration = "214348c8-3be0-44f8-a010-adbe1ac68090";
  const resolverRequests = [];
  // Pin the observed mismatch as fail-closed; this does not endorse the fixed selector as canonical.
  const terminalStore = Object.freeze({
    load(generation) {
      resolverRequests.push(generation);
      return Object.freeze({ state: "READY", record: Object.freeze({
        operationGenerationId: terminalCurrentGeneration,
        secretKeyId,
        targetResource: G2B_TARGET_RESOURCE,
        targetRole: G2B_TARGET_ROLE,
        anchorState: "RECOVERY_CONFIRMED_ABSENT",
      }) });
    },
  });
  const terminalSelection = resolveG2BRecoveryV3R2Context({ identityContext: context, secretProvider, store: terminalStore });
  assert.deepEqual(resolverRequests, ["8b30e1da-8d4d-4ded-ad94-cf62aabcc981"]);
  assert.equal(resolverRequests[0] === terminalCurrentGeneration, false);
  assert.equal(terminalSelection.ok, false);
  assert.equal(terminalSelection.code, "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED");

  for (const terminalState of ["RECOVERY_CONFIRMED_ABSENT", "RECOVERY_CONFIRMED_PRESENT", "RECOVERY_AMBIGUOUS", "RECOVERY_FAILED", "ENVIRONMENT_BLOCKED"]) {
    const blocked = resolveG2BRecoveryV3R2Context({
      identityContext: context,
      secretProvider,
      store: Object.freeze({ load: () => Object.freeze({ state: "READY", record: Object.freeze({
        operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
        secretKeyId, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, anchorState: terminalState,
      }) }) }),
    });
    assert.equal(blocked.ok, false, terminalState);
    assert.equal(blocked.code, "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED", terminalState);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B V3R2 dependency wiring matrix passed; fake transport only; remote operations=0");
