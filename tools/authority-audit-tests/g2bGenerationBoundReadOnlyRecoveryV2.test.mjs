import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createG2BGenerationBoundReadOnlyRecoveryV2Executor,
  G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE,
  prepareG2BGenerationBoundReadOnlyRecoveryV2,
  verifyG2BGenerationBoundReadOnlyRecoveryV2,
} from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal } from "../authority-audit/g2bRecoveryExecutionJournal.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-recovery-v2-"));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:recovery-v2@example.invalid", enumerable: false } }));
const readiness = Object.freeze({ ok: true, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", freshnessMarginSeconds: 120, networkRequests: 0, refreshMethodInvocations: 0 });
const successMetadata = Object.freeze({ requestStarted: true, httpStatusClass: "2XX", httpStatusCodeSafe: 200, providerResult: "SUCCESS" });
const present = Object.freeze({ etag: "fixture", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [context.exactIamMember] }] });
const absent = Object.freeze({ etag: "fixture", version: 3, bindings: [] });

function setup(name) {
  const directory = join(root, name);
  const store = createG2BRecoveryAnchorStore({ directory: join(directory, "anchors") });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
  return { store, journal: createG2BRecoveryExecutionJournal({ directory: join(directory, "journal"), now: () => "2026-09-14T00:00:00.000Z" }) };
}

try {
  const { store, journal } = setup("prepare");
  const authority = prepareG2BGenerationBoundReadOnlyRecoveryV2({ identityContext: context, secretProvider, store });
  assert.equal(authority.ok, true);
  assert.equal(authority.approvalPacket.operationInstance, G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE);
  assert.equal(verifyG2BGenerationBoundReadOnlyRecoveryV2(authority, { identityContext: context, secretProvider, store }).ok, true);
  const altered = structuredClone(authority);
  altered.prospectiveSafetyEvidence.requestStartPersistedAtRemoteBoundary = false;
  assert.equal(verifyG2BGenerationBoundReadOnlyRecoveryV2(altered, { identityContext: context, secretProvider, store }).ok, false);

  const initialized = journal.initialize(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE);
  assert.equal(initialized.ok, true);
  for (const patch of [
    { phase: "APPROVAL_CONSUMED", approvalConsumed: true },
    { phase: "REQUEST_STARTED_RESPONSE_UNKNOWN", requestBoundaryEntered: true, transportResult: "RESPONSE_UNKNOWN" },
    { phase: "RESPONSE_OBSERVED_PARSE_PENDING", responseObserved: true, httpStatusClass: "2XX", transportResult: "SUCCESS", responseParseResult: "PENDING" },
    { phase: "ANCHOR_COMPARISON_PENDING", responseParseResult: "SUCCESS", targetRoleEvaluationResult: "PENDING", anchorComparisonResult: "PENDING" },
    { phase: "ANCHOR_COMPARISON_COMPLETE", targetRoleEvaluationResult: "ROLE_ABSENT", anchorComparisonResult: "NO_MATCH", classifierInputComplete: true },
    { phase: "TERMINAL_CLASSIFICATION_COMPLETE", terminalRecoveryResult: "RECOVERY_CONFIRMED_ABSENT" },
  ]) {
    assert.equal(journal.transition(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, patch).ok, true);
    assert.equal(journal.load(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE).state, "READY");
  }
  const persisted = readFileSync(journal.pathFor(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE), "utf8");
  const persistedJournal = JSON.parse(persisted);
  assert.equal(persisted.includes("recovery-v2@example.invalid"), false);
  assert.equal(persisted.includes("fixture"), false);
  assert.equal(Object.keys(persistedJournal).some((key) => /raw|policy|member|principal|credential|stdout|stderr|etag/i.test(key)), false);

  for (const [name, policy, expected] of [["present", present, "RECOVERY_CONFIRMED_PRESENT"], ["absent", absent, "RECOVERY_CONFIRMED_ABSENT"]]) {
    const fixture = setup(name);
    const output = await createG2BGenerationBoundReadOnlyRecoveryV2Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy, physicalCalls: 1, safeTransportMetadata: successMetadata }), preliveReadiness: readiness, identityContext: context, secretProvider, store: fixture.store, journal: fixture.journal });
    assert.equal(output.recoveryResult, expected);
    assert.equal(output.journal.phase, "TERMINAL_CLASSIFICATION_COMPLETE");
    assert.equal(output.journal.classifierInputComplete, true);
  }

  for (const [name, response, transportResult] of [
    ["http4", { ok: false, requestStarted: true, physicalCalls: 1, failureMetadata: { failureStage: "DURING_HTTP_SEND", httpStatusClass: "4XX", httpStatusCodeSafe: 403, safeProviderErrorIdentifier: "HTTP_403", transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION" } }, "PROVIDER_FAILURE"],
    ["http5", { ok: false, requestStarted: true, physicalCalls: 1, failureMetadata: { failureStage: "DURING_HTTP_SEND", httpStatusClass: "5XX", httpStatusCodeSafe: 503, safeProviderErrorIdentifier: "HTTP_503", transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION" } }, "PROVIDER_FAILURE"],
    ["timeout", { ok: false, safeTransportResult: "TRANSPORT_TIMEOUT" }, "TRANSPORT_TIMEOUT"],
    ["process-interruption", { ok: false, safeTransportResult: "PROCESS_INTERRUPTION" }, "PROCESS_INTERRUPTION"],
    ["malformed", { ok: true, policy: { etag: "fixture", bindings: "invalid" }, physicalCalls: 1, safeTransportMetadata: successMetadata }, "SUCCESS"],
  ]) {
    const fixture = setup(name);
    const output = await createG2BGenerationBoundReadOnlyRecoveryV2Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => response, preliveReadiness: readiness, identityContext: context, secretProvider, store: fixture.store, journal: fixture.journal });
    assert.equal(output.recoveryResult, "RECOVERY_NOT_ESTABLISHED");
    assert.equal(output.journal.phase, "TERMINAL_CLASSIFICATION_COMPLETE");
    assert.equal(output.journal.transportResult, transportResult);
  }

  const interrupted = setup("interrupted");
  const journalRecord = interrupted.journal.initialize(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE);
  assert.equal(journalRecord.ok, true);
  assert.equal(interrupted.journal.transition(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, { phase: "APPROVAL_CONSUMED", approvalConsumed: true }).ok, true);
  assert.equal(interrupted.journal.transition(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, { phase: "REQUEST_STARTED_RESPONSE_UNKNOWN", requestBoundaryEntered: true, transportResult: "RESPONSE_UNKNOWN" }).ok, true);
  assert.equal(interrupted.journal.load(G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE).record.phase, "REQUEST_STARTED_RESPONSE_UNKNOWN");
  const blockedRestart = await createG2BGenerationBoundReadOnlyRecoveryV2Executor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, readPolicy: async () => ({ ok: true, policy: absent, safeTransportMetadata: successMetadata }), preliveReadiness: readiness, identityContext: context, secretProvider, store: interrupted.store, journal: interrupted.journal });
  assert.equal(blockedRestart.code, "RECOVERY_V2_JOURNAL_NOT_PREPARED");
  assert.equal(blockedRestart.counters.totalPhysicalRemoteRecoveryCalls, 0);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B generation-bound recovery V2 journal/restart matrix passed; fake fixtures only; remote operations=0");
