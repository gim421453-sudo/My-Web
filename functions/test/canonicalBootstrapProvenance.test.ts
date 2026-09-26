import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION,
  CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX,
  CanonicalBootstrapProvenanceError,
  canonicalBootstrapReplayIdentity,
  createCanonicalBootstrapProvenanceFromApprovedManifest,
  validateCanonicalBootstrapProvenance,
} from "../src/migrations/canonicalBootstrapProvenance.js";

const planId = "a".repeat(64);
const sourceSetFingerprint = "b".repeat(64);

function valid() {
  return Object.freeze({
    schemaVersion: CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION,
    authoritativeInputFingerprint: `${CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX}${sourceSetFingerprint}`,
    bootstrapBatchId: planId,
    manifestReference: planId,
  });
}

function expectIssue(value: unknown, issue: string) {
  assert.throws(
    () => validateCanonicalBootstrapProvenance(value),
    (error: unknown) => error instanceof CanonicalBootstrapProvenanceError && error.issue === issue,
  );
}

test("E0F validates a complete minimal bootstrap provenance envelope", () => {
  assert.deepEqual(validateCanonicalBootstrapProvenance(valid()), valid());
  assert.deepEqual(
    createCanonicalBootstrapProvenanceFromApprovedManifest({
      planId,
      authoritativeInputFingerprint: `${CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX}${sourceSetFingerprint}`,
    }),
    valid(),
  );
});

test("E0F fails closed for missing or malformed provenance identity", () => {
  expectIssue({ ...valid(), authoritativeInputFingerprint: undefined }, "MISSING_SOURCE_FINGERPRINT");
  expectIssue({ ...valid(), authoritativeInputFingerprint: `${CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX}${"B".repeat(64)}` }, "INVALID_SOURCE_FINGERPRINT");
  expectIssue({ ...valid(), authoritativeInputFingerprint: `sha256:${sourceSetFingerprint}` }, "INVALID_SOURCE_FINGERPRINT");
  expectIssue({ ...valid(), bootstrapBatchId: "" }, "MISSING_BATCH_ID");
  expectIssue({ ...valid(), bootstrapBatchId: ["C:", "Users", "operator", "manifest"].join("\\") }, "INVALID_BATCH_ID");
  expectIssue({ ...valid(), manifestReference: "" }, "MISSING_MANIFEST_REFERENCE");
  expectIssue({ ...valid(), manifestReference: "/tmp/manifest" }, "INVALID_MANIFEST_REFERENCE");
  expectIssue({ ...valid(), manifestReference: "c".repeat(64) }, "MANIFEST_BATCH_MISMATCH");
  expectIssue({ ...valid(), schemaVersion: 2 }, "PROVENANCE_VERSION_UNSUPPORTED");
});

test("E0F keeps legacy canonical record parsers compatible", async () => {
  const { parseClassRegistryDocument } = await import("../src/registries/classRegistryContract.js");
  const legacy = {
    schemaVersion: 1,
    version: 1,
    workspaceId: "fixture_workspace",
    classId: "fixture_class",
    status: "active",
    source: "migration",
    createdAt: 0,
    updatedAt: 0,
    createdBy: "fixture_owner",
    displayName: "Fixture Class",
  };
  assert.equal(parseClassRegistryDocument(legacy, { workspaceId: legacy.workspaceId, entityId: legacy.classId }).state, "VALID");
});

test("E0F keeps same approved batch replay stable and distinguishes changed provenance", () => {
  const target = { workspaceId: "fixture_workspace", entityType: "class" as const, entityId: "fixture_class" };
  const first = canonicalBootstrapReplayIdentity(valid(), target);
  assert.equal(canonicalBootstrapReplayIdentity(valid(), target), first);
  assert.notEqual(canonicalBootstrapReplayIdentity({ ...valid(), authoritativeInputFingerprint: `${CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX}${"c".repeat(64)}` }, target), first);
  const newPlan = "d".repeat(64);
  assert.notEqual(canonicalBootstrapReplayIdentity({ ...valid(), bootstrapBatchId: newPlan, manifestReference: newPlan }, target), first);
});

test("E0F validates provenance before a local persistence adapter can run", () => {
  let adapterCalls = 0;
  const persist = (provenance: unknown) => {
    const checked = validateCanonicalBootstrapProvenance(provenance);
    adapterCalls += 1;
    return checked;
  };
  expectIssue({ ...valid(), manifestReference: undefined }, "MISSING_MANIFEST_REFERENCE");
  assert.equal(adapterCalls, 0);
  assert.deepEqual(persist(valid()), valid());
  assert.equal(adapterCalls, 1);
});
