import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BGenerationBoundReadOnlyRecoveryExecutor, G2B_INTERRUPTED_M3_GENERATION, prepareG2BGenerationBoundReadOnlyRecovery, verifyG2BGenerationBoundReadOnlyRecovery } from "../authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";

const directory = mkdtempSync(join(tmpdir(), "g2b-generation-bound-recovery-"));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = Object.freeze(Object.defineProperties({}, {
  exactPrincipal: { value: "operator@example.invalid", enumerable: false },
  exactIamMember: { value: "user:operator@example.invalid", enumerable: false },
}));
const ready = Object.freeze({ ok: true, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", networkRequests: 0, refreshMethodInvocations: 0 });
const absentPolicy = Object.freeze({ etag: "fixture", version: 3, bindings: [] });
const presentPolicy = Object.freeze({ etag: "fixture", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [context.exactIamMember] }] });

try {
  const store = createG2BRecoveryAnchorStore({ directory });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: G2B_INTERRUPTED_M3_GENERATION }).mutationReachable, true);
  const authority = prepareG2BGenerationBoundReadOnlyRecovery({ identityContext: context, secretProvider, store });
  assert.equal(authority.ok, true);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecovery(authority, { identityContext: context, secretProvider, store }).ok, true);
  const persisted = (({ sourceLockManifest, implementation, runtimeCapability, executionComposite, approvalPacket }) => ({ sourceLockManifest, implementation, runtimeCapability, executionComposite, approvalPacket }))(authority);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecovery(persisted, { identityContext: context, secretProvider, store }).ok, true);
  for (const key of Object.keys(authority.approvalPacket)) {
    const altered = structuredClone(authority);
    altered.approvalPacket[key] = typeof altered.approvalPacket[key] === "boolean" ? !altered.approvalPacket[key] : "TAMPERED";
    assert.equal(verifyG2BGenerationBoundReadOnlyRecovery(altered, { identityContext: context, secretProvider, store }).ok, false, key);
  }

  let presentCalls = 0;
  const present = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => { presentCalls += 1; return { ok: true, policy: presentPolicy }; }, preliveReadiness: ready, identityContext: context, secretProvider, store });
  assert.equal(present.recoveryResult, "RECOVERY_CONFIRMED_PRESENT");
  assert.equal(presentCalls, 1);
  assert.deepEqual(present.recoveryDiagnostic.classification, {
    attempted: true, state: "PRESENT_CONFIRMED", parseStatus: "NOT_AVAILABLE", semanticMatchCount: "ONE",
  });

  const absent = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy: absentPolicy }), preliveReadiness: ready, identityContext: context, secretProvider, store });
  assert.equal(absent.recoveryResult, "RECOVERY_CONFIRMED_ABSENT");
  assert.equal(absent.recoveryDiagnostic.classification.state, "MEMBER_ABSENT_CONFIRMED");
  assert.equal(absent.recoveryDiagnostic.classification.semanticMatchCount, "ZERO");

  for (const policy of [{ etag: "fixture", bindings: "bad" }, { etag: "fixture", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [context.exactIamMember], condition: { expression: "true" } }] }]) {
    const result = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy }), preliveReadiness: ready, identityContext: context, secretProvider, store });
    assert.equal(result.recoveryResult, "RECOVERY_NOT_ESTABLISHED");
    assert.equal(result.recoveryDiagnostic.phase, "POLICY_CLASSIFICATION");
    assert.equal(result.recoveryDiagnostic.classification.attempted, true);
    assert.equal(result.counters.setIamPolicyCalls, 0);
  }

  for (const [httpStatusClass, httpStatusCodeSafe, safeProviderErrorIdentifier] of [
    ["4XX", 403, "HTTP_403"], ["5XX", 503, "HTTP_503"], ["UNKNOWN", "NOT_OBSERVED", "NOT_AVAILABLE"],
  ]) {
    const remoteFailure = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({
      enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true,
      readPolicy: async () => ({ ok: false, requestStarted: true, physicalCalls: 1, failureMetadata: {
        failureStage: "DURING_HTTP_SEND", httpStatusClass, httpStatusCodeSafe,
        safeProviderErrorIdentifier, transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION",
      } }),
      preliveReadiness: ready, identityContext: context, secretProvider, store,
    });
    assert.equal(remoteFailure.code, "RECOVERY_POLICY_READ_FAILURE");
    assert.deepEqual(remoteFailure.recoveryDiagnostic.transport.failure, {
      failureStage: "DURING_HTTP_SEND", httpStatusClass, httpStatusCodeSafe,
      safeProviderErrorIdentifier, transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION",
    });
  }

  for (const readPolicy of [async () => ({ ok: false }), async () => { throw new Error("timeout"); }]) {
    const result = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy, preliveReadiness: ready, identityContext: context, secretProvider, store });
    assert.equal(result.recoveryResult, "RECOVERY_NOT_ESTABLISHED");
    assert.equal(result.recoveryDiagnostic.phase, "POLICY_READ");
    assert.equal(result.counters.totalPhysicalRemoteRecoveryCalls, 1);
  }

  let duplicateCalls = 0;
  const once = createG2BGenerationBoundReadOnlyRecoveryExecutor();
  await once.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => { duplicateCalls += 1; return { ok: true, policy: absentPolicy }; }, preliveReadiness: ready, identityContext: context, secretProvider, store });
  const duplicate = await once.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => { duplicateCalls += 1; return { ok: true, policy: absentPolicy }; }, preliveReadiness: ready, identityContext: context, secretProvider, store });
  assert.equal(duplicate.code, "RECOVERY_READ_BUDGET_EXHAUSTED");
  assert.equal(duplicateCalls, 1);

  for (const readiness of [{ ...ready, result: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", credentialExpiryRelativeState: "EXPIRED" }, { ...ready, result: "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY", credentialExpiryRelativeState: "TOO_CLOSE_TO_EXPIRY" }]) {
    let calls = 0;
    const result = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => { calls += 1; return { ok: true, policy: absentPolicy }; }, preliveReadiness: readiness, identityContext: context, secretProvider, store });
    assert.equal(result.code, "PRELIVE_CACHED_CREDENTIAL_NOT_READY");
    assert.equal(calls, 0);
  }

  const wrongGeneration = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy: absentPolicy }), preliveReadiness: ready, identityContext: context, secretProvider, store, operationGenerationId: randomUUID() });
  assert.equal(wrongGeneration.code, "RECOVERY_ANCHOR_NOT_VERIFIED");
  const wrongContext = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:other@example.invalid", enumerable: false } }));
  const mismatch = await createG2BGenerationBoundReadOnlyRecoveryExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy: absentPolicy }), preliveReadiness: ready, identityContext: wrongContext, secretProvider, store });
  assert.equal(mismatch.code, "RECOVERY_ANCHOR_NOT_VERIFIED");

  assert.equal(authority.runtimeCapability.setIamPolicyCallsMax, 0);
  assert.equal(authority.runtimeCapability.iamMutationsMax, 0);
  assert.equal(authority.runtimeCapability.m4MutationsMax, 0);
  assert.equal(authority.runtimeCapability.firestoreCallsMax, 0);
  assert.equal(authority.approvalPacket.rawMemberPersisted, false);
  assert.equal(authority.approvalPacket.rawPrincipalPersisted, false);
  assert.equal(authority.approvalPacket.rawPolicyPersisted, false);
} finally {
  rmSync(directory, { recursive: true, force: true });
}

console.log("G2B generation-bound read-only recovery authority matrix passed; local fixtures only; remote operations=0");
