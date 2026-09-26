import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createG2BGenerationBoundReadOnlyRecoveryV3R1Executor,
  G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE,
  prepareG2BGenerationBoundReadOnlyRecoveryV3R1,
  verifyG2BGenerationBoundReadOnlyRecoveryV3R1,
} from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R1.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal } from "../authority-audit/g2bRecoveryExecutionJournal.mjs";
import { createG2BRecoveryPostExecutionEvidenceWriter } from "../authority-audit/g2bRecoveryPostExecutionEvidence.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-recovery-v3r1-"));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:recovery-v3r1@example.invalid", enumerable: false } }));
const readiness = Object.freeze({ ok: true, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", freshnessMarginSeconds: 120, networkRequests: 0, refreshMethodInvocations: 0 });

function setup(name) {
  const directory = join(root, name);
  const store = createG2BRecoveryAnchorStore({ directory: join(directory, "anchors") });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
  return Object.freeze({ store, journal: createG2BRecoveryExecutionJournal({ directory: join(directory, "journal"), now: () => "2026-09-14T00:00:00.000Z" }), finalizer: createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(directory, "final") }) });
}

try {
  const prepared = setup("prepare");
  const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3R1({ identityContext: context, secretProvider, store: prepared.store, readiness });
  assert.equal(authority.ok, true);
  assert.equal(authority.approvalPacket.operationInstance, G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE);
  assert.equal(authority.executionComposite.authorityDependencyCount > 10, true);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecoveryV3R1(authority, { identityContext: context, secretProvider, store: prepared.store, readiness }).ok, true);

  for (const [name, policy, expected] of [
    ["present", { etag: "fixture", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [context.exactIamMember] }] }, "RECOVERY_CONFIRMED_PRESENT"],
    ["absent", { etag: "fixture", version: 3, bindings: [] }, "RECOVERY_CONFIRMED_ABSENT"],
  ]) {
    const fixture = setup(name);
    let calls = 0;
    const output = await createG2BGenerationBoundReadOnlyRecoveryV3R1Executor().execute({
      enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true,
      transport: Object.freeze({ readGenerationBoundRecoveryPolicy: async () => { calls += 1; return Object.freeze({ ok: true, policy, physicalCalls: 1, safeTransportMetadata: Object.freeze({ requestStarted: true, httpStatusClass: "2XX", httpStatusCodeSafe: 200, providerResult: "SUCCESS" }) }); } }),
      preliveReadiness: readiness, identityContext: context, secretProvider, store: fixture.store, journal: fixture.journal, finalizer: fixture.finalizer,
    });
    assert.equal(calls, 1);
    assert.equal(output.recoveryResult, expected);
    assert.equal(output.postExecutionFinalization.ok, true);
    assert.equal(output.postExecutionFinalization.remoteOperations, 0);
  }

  const failure = setup("failure");
  const output = await createG2BGenerationBoundReadOnlyRecoveryV3R1Executor().execute({
    enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true,
    transport: Object.freeze({ readGenerationBoundRecoveryPolicy: async () => Object.freeze({ ok: false, failureMetadata: Object.freeze({ failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200, safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE" }) }) }),
    preliveReadiness: readiness, identityContext: context, secretProvider, store: failure.store, journal: failure.journal, finalizer: failure.finalizer,
  });
  assert.equal(output.recoveryResult, "RECOVERY_NOT_ESTABLISHED");
  assert.equal(output.postExecutionFinalization.ok, true);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B generation-bound recovery V3R1 finalization matrix passed; fake fixtures only; remote operations=0");
