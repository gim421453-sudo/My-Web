import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createG2BGenerationBoundReadOnlyRecoveryV3Executor,
  G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE,
  prepareG2BGenerationBoundReadOnlyRecoveryV3,
  verifyG2BGenerationBoundReadOnlyRecoveryV3,
} from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV3.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal } from "../authority-audit/g2bRecoveryExecutionJournal.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-recovery-v3-"));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:recovery-v3@example.invalid", enumerable: false } }));
const readiness = Object.freeze({ ok: true, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", freshnessMarginSeconds: 120, networkRequests: 0, refreshMethodInvocations: 0 });

function setup(name) {
  const directory = join(root, name);
  const store = createG2BRecoveryAnchorStore({ directory: join(directory, "anchors") });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
  return { store, journal: createG2BRecoveryExecutionJournal({ directory: join(directory, "journal"), now: () => "2026-09-14T00:00:00.000Z" }) };
}

try {
  const prepared = setup("prepare");
  const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3({ identityContext: context, secretProvider, store: prepared.store, readiness });
  assert.equal(authority.ok, true);
  assert.equal(authority.approvalPacket.operationInstance, G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE);
  assert.equal(authority.implementation.recoveryResponseUsesMutationPolicyValidator, false);
  assert.equal(authority.prospectiveSafetyEvidence.knownHttpResponseCannotCollapseToUnknownFromLocalProjection, true);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecoveryV3(authority, { identityContext: context, secretProvider, store: prepared.store, readiness }).ok, true);
  assert.equal(prepareG2BGenerationBoundReadOnlyRecoveryV3({ identityContext: context, secretProvider, store: prepared.store, readiness: { ...readiness, credentialExpiryRelativeState: "EXPIRED" } }).ok, false);

  for (const [name, policy, expected] of [
    ["present", { etag: "fixture", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [context.exactIamMember] }] }, "RECOVERY_CONFIRMED_PRESENT"],
    ["absent", { etag: "fixture", version: 3, bindings: [] }, "RECOVERY_CONFIRMED_ABSENT"],
  ]) {
    const fixture = setup(name);
    let calls = 0;
    const transport = Object.freeze({ readGenerationBoundRecoveryPolicy: async () => {
      calls += 1;
      return Object.freeze({ ok: true, policy, physicalCalls: 1, safeTransportMetadata: Object.freeze({ requestStarted: true, httpStatusClass: "2XX", httpStatusCodeSafe: 200, providerResult: "SUCCESS" }) });
    } });
    const output = await createG2BGenerationBoundReadOnlyRecoveryV3Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport, preliveReadiness: readiness, identityContext: context, secretProvider, store: fixture.store, journal: fixture.journal });
    assert.equal(output.recoveryResult, expected);
    assert.equal(output.journal.httpStatusClass, "2XX");
    assert.equal(output.journal.classifierInputComplete, true);
    assert.equal(calls, 1);
  }

  const failed = setup("failure");
  const output = await createG2BGenerationBoundReadOnlyRecoveryV3Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: Object.freeze({ readGenerationBoundRecoveryPolicy: async () => ({ ok: false, failureMetadata: { failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200, safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE" } }) }), preliveReadiness: readiness, identityContext: context, secretProvider, store: failed.store, journal: failed.journal });
  assert.equal(output.recoveryResult, "RECOVERY_NOT_ESTABLISHED");
  assert.equal(output.journal.responseObserved, true);
  assert.equal(output.journal.httpStatusClass, "2XX");
  assert.equal(output.journal.transportResult, "LOCAL_FAILURE");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B generation-bound recovery V3 response-adapter matrix passed; fake fixtures only; remote operations=0");
