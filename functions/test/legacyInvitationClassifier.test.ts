import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createLegacyInvitationDryRun,
  isConsoleSafeLegacyManifest,
  MIGRATION_INVITATION_ID_STRATEGY,
  summarizeLegacyInvitationGroups,
} from "../src/invitations/legacy/legacyInvitationClassifier.js";
import {
  LEGACY_MIGRATION_EXECUTION_CONTRACT,
  type LegacyInvitationClassifierOptions,
  type LegacyInvitationSource,
  type LegacyInvitationSourceDocument,
  type LegacySecretSecurityClassification,
} from "../src/invitations/legacy/legacyInvitationTypes.js";

const NOW = 2_000_000_000_000;
const SYNTHETIC_CODE = "SYNTHETIC-LEGACY-CODE-00000001";
const OTHER_SYNTHETIC_CODE = "SYNTHETIC-LEGACY-CODE-00000002";

function data(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    invitationId: SYNTHETIC_CODE,
    code: SYNTHETIC_CODE,
    workspaceId: "fixture_workspace",
    role: "teacher",
    status: "active",
    maxUses: 3,
    usedCount: 0,
    expiresAt: NOW + 86_400_000,
    createdBy: "fixture_creator",
    createdAt: NOW - 10_000,
    ...overrides,
  };
}

function source(
  kind: LegacyInvitationSource,
  overrides: Record<string, unknown> = {},
  documentId = SYNTHETIC_CODE,
): LegacyInvitationSourceDocument {
  return {
    source: kind,
    documentId,
    parentWorkspaceId: kind === "NESTED_INVITE_CODES" ? "fixture_workspace" : undefined,
    data: data({ invitationId: documentId, code: documentId, ...overrides }),
  };
}

function options(
  secret: LegacySecretSecurityClassification = "LEGACY_SECRET_VERIFIED_STRONG",
  overrides: Partial<LegacyInvitationClassifierOptions> = {},
): LegacyInvitationClassifierOptions {
  return {
    nowMillis: NOW,
    resolveWorkspace: () => "VALID",
    assessSecret: () => secret,
    resolveCollision: () => ({
      canonicalInvitationExists: false,
      codeHashIndexExists: false,
      migrationFingerprintConsumed: false,
    }),
    ...overrides,
  };
}

function one(
  documents: readonly LegacyInvitationSourceDocument[],
  classifierOptions = options(),
) {
  const manifests = createLegacyInvitationDryRun(documents, classifierOptions);
  assert.equal(manifests.length, 1);
  const manifest = manifests[0];
  assert.ok(manifest);
  return manifest;
}

test("identical shared roots are classified without source conflict", () => {
  const manifest = one([source("ROOT_INVITES"), source("ROOT_INVITATIONS")]);
  assert.equal(manifest.sourceClassification, "SHARED_ROOTS");
  assert.equal(manifest.migrationDisposition, "MIGRATABLE_CANONICAL");
});

test("legacy role and pending status use only source-proven safe normalization", () => {
  const manifest = one([source("ROOT_INVITES", { status: "pending" })]);
  assert.equal(manifest.roleResolution.targetRole, "teacher");
  assert.equal(manifest.statusResolution.canonicalStatus, "active");
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "role")?.result, "SAFE_NORMALIZATION");
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "status")?.result, "SAFE_NORMALIZATION");
});

test("accepted status remains unresolved because reusable semantics are ambiguous", () => {
  const manifest = one([source("ROOT_INVITES", { status: "accepted" })]);
  assert.equal(manifest.statusResolution.state, "UNKNOWN");
  assert.equal(manifest.migrationDisposition, "NEEDS_STATUS_RESOLUTION");
});

test("shared roots authority field conflict fails closed", () => {
  const manifest = one([
    source("ROOT_INVITES"),
    source("ROOT_INVITATIONS", { workspaceId: "different_workspace" }),
  ]);
  assert.equal(manifest.sourceClassification, "SOURCE_CONFLICT");
  assert.equal(manifest.migrationDisposition, "SOURCE_CONFLICT");
});

for (const fixture of [
  { name: "invitations-only", expected: "INVITATIONS_ONLY", docs: [source("ROOT_INVITATIONS")] },
  { name: "invites-only", expected: "INVITES_ONLY", docs: [source("ROOT_INVITES")] },
  { name: "nested-only", expected: "NESTED_ONLY", docs: [source("NESTED_INVITE_CODES")] },
  {
    name: "root-and-nested", expected: "ROOTS_AND_NESTED",
    docs: [source("ROOT_INVITES"), source("NESTED_INVITE_CODES")],
  },
  {
    name: "all-three", expected: "ALL_THREE",
    docs: [source("ROOT_INVITES"), source("ROOT_INVITATIONS"), source("NESTED_INVITE_CODES")],
  },
] as const) {
  test(`${fixture.name} source combination is classified`, () => {
    assert.equal(one(fixture.docs).sourceClassification, fixture.expected);
  });
}

test("non-object legacy document is malformed", () => {
  const manifest = one([{ source: "ROOT_INVITES", documentId: SYNTHETIC_CODE, data: null }]);
  assert.equal(manifest.sourceClassification, "MALFORMED");
  assert.equal(manifest.migrationDisposition, "MALFORMED");
});

test("unknown legacy source enum is malformed", () => {
  const invalid = {
    source: "UNKNOWN_SOURCE",
    documentId: SYNTHETIC_CODE,
    data: data(),
  } as unknown as LegacyInvitationSourceDocument;
  assert.equal(one([invalid]).migrationDisposition, "MALFORMED");
});

test("embedded code mismatch is malformed without exposing either code", () => {
  const manifest = one([source("ROOT_INVITES", { code: OTHER_SYNTHETIC_CODE })]);
  assert.equal(manifest.sourceClassification, "MALFORMED");
  assert.doesNotMatch(JSON.stringify(manifest), new RegExp(SYNTHETIC_CODE));
  assert.doesNotMatch(JSON.stringify(manifest), new RegExp(OTHER_SYNTHETIC_CODE));
});

test("workspace mismatch is a source conflict", () => {
  const manifest = one([
    source("ROOT_INVITES"), source("ROOT_INVITATIONS", { workspaceId: "workspace_b" }),
  ]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "workspaceId")?.result, "DIVERGENT");
});

test("nested path workspace mismatch is malformed", () => {
  const nested = source("NESTED_INVITE_CODES", { workspaceId: "workspace_b" });
  const manifest = one([{ ...nested, parentWorkspaceId: "workspace_a" }]);
  assert.equal(manifest.migrationDisposition, "MALFORMED");
});

test("role mismatch is a source conflict", () => {
  const manifest = one([source("ROOT_INVITES"), source("ROOT_INVITATIONS", { role: "viewer" })]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "role")?.result, "DIVERGENT");
});

test("status mismatch is a source conflict", () => {
  const manifest = one([source("ROOT_INVITES"), source("ROOT_INVITATIONS", { status: "revoked" })]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "status")?.result, "DIVERGENT");
});

test("revoked-state mismatch is a source conflict", () => {
  const manifest = one([
    source("ROOT_INVITES"),
    source("ROOT_INVITATIONS", { revokedAt: NOW - 2_000 }),
  ]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "revokedState")?.result, "DIVERGENT");
  assert.equal(manifest.migrationDisposition, "SOURCE_CONFLICT");
});

test("usage mismatch is a source conflict", () => {
  const manifest = one([source("ROOT_INVITES"), source("ROOT_INVITATIONS", { usedCount: 1 })]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "usage")?.result, "DIVERGENT");
});

test("createdAt difference is metadata-only safe normalization without tolerance", () => {
  const manifest = one([
    source("ROOT_INVITES", { createdAt: NOW - 100_000 }),
    source("ROOT_INVITATIONS", { createdAt: NOW - 1 }),
  ]);
  const comparison = manifest.fieldComparisons.find((item) => item.field === "createdAt");
  assert.equal(comparison?.result, "SAFE_NORMALIZATION");
  assert.equal(comparison?.reasonCode, "CREATED_AT_METADATA_DIFFERENCE");
});

test("unknown semantic field fails closed", () => {
  const manifest = one([source("ROOT_INVITES", { undocumentedAuthorityFlag: true })]);
  assert.equal(manifest.fieldComparisons.find((item) => item.field === "unknownFields")?.result, "SEMANTIC_UNKNOWN");
  assert.equal(manifest.migrationDisposition, "MANUAL_REVIEW");
});

test("unproven usage aliases remain semantic unknown", () => {
  const legacy = data({ maxUses: undefined, usedCount: undefined, useLimit: 2, useCount: 0 });
  const manifest = one([{ source: "ROOT_INVITATIONS", documentId: SYNTHETIC_CODE, data: legacy }]);
  assert.equal(manifest.usageResolution.state, "UNKNOWN");
  assert.equal(manifest.migrationDisposition, "NEEDS_USAGE_RESOLUTION");
});

for (const badRole of ["principal", "system_owner"] as const) {
  test(`${badRole} is not a canonical invitation target role`, () => {
    const manifest = one([source("ROOT_INVITES", { role: badRole })]);
    assert.equal(manifest.migrationDisposition, "MALFORMED");
    assert.equal(manifest.roleResolution.state, "INVALID");
  });
}

test("unknown expiration representation is not coerced", () => {
  const manifest = one([source("ROOT_INVITES", { expiresAt: { seconds: 123 } })]);
  assert.equal(manifest.expirationResolution.state, "UNKNOWN");
  assert.notEqual(manifest.migrationDisposition, "MIGRATABLE_CANONICAL");
});

test("missing expiration does not receive an invented default", () => {
  const legacy = data();
  delete legacy.expiresAt;
  const manifest = one([{ source: "ROOT_INVITES", documentId: SYNTHETIC_CODE, data: legacy }]);
  assert.equal(manifest.expirationResolution.state, "MISSING");
  assert.equal(manifest.migrationDisposition, "MANUAL_REVIEW");
});

test("explicit no-expiry active invitation requires reissue", () => {
  const manifest = one([source("ROOT_INVITES", { expiresAt: null })]);
  assert.equal(manifest.expirationResolution.state, "NO_EXPIRY");
  assert.equal(manifest.migrationDisposition, "REISSUE_REQUIRED");
});

test("usedCount greater than maxUses is malformed", () => {
  const manifest = one([source("ROOT_INVITES", { maxUses: 1, usedCount: 2 })]);
  assert.equal(manifest.migrationDisposition, "MALFORMED");
});

test("active invitation with exhausted usage is archive-only, never redeemable", () => {
  const manifest = one([source("ROOT_INVITES", { maxUses: 1, usedCount: 1 })]);
  assert.equal(manifest.migrationDisposition, "MIGRATABLE_ARCHIVE_ONLY");
  assert.equal(manifest.canonicalPlan.createCodeHashIndex, false);
});

test("active status with revokedAt is malformed", () => {
  const manifest = one([source("ROOT_INVITES", { revokedAt: NOW - 1_000 })]);
  assert.equal(manifest.migrationDisposition, "MALFORMED");
});

test("missing role requires role resolution", () => {
  const manifest = one([source("ROOT_INVITES", { role: undefined })]);
  assert.equal(manifest.migrationDisposition, "NEEDS_ROLE_RESOLUTION");
});

test("missing status requires status resolution", () => {
  const manifest = one([source("ROOT_INVITES", { status: undefined })]);
  assert.equal(manifest.migrationDisposition, "NEEDS_STATUS_RESOLUTION");
});

test("missing workspace requires workspace resolution", () => {
  const manifest = one([source("ROOT_INVITES", { workspaceId: undefined })]);
  assert.equal(manifest.migrationDisposition, "NEEDS_WORKSPACE_RESOLUTION");
});

test("unresolved workspace cannot be treated as valid", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_VERIFIED_STRONG", {
    resolveWorkspace: () => "UNKNOWN",
  }));
  assert.equal(manifest.migrationDisposition, "NEEDS_WORKSPACE_RESOLUTION");
});

test("active invitation with unknown secret strength is never auto-migrated", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_STRENGTH_UNKNOWN"));
  assert.equal(manifest.migrationDisposition, "NEEDS_SECRET_SECURITY_REVIEW");
  assert.equal(manifest.canonicalPlan.action, "REISSUE");
  assert.equal(manifest.canonicalPlan.preserveLegacyCode, false);
});

test("weak active secret requires reissue", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_WEAK_OR_INVALID"));
  assert.equal(manifest.migrationDisposition, "REISSUE_REQUIRED");
  assert.equal(manifest.canonicalPlan.createCodeHashIndex, false);
});

test("verified strong synthetic secret can become a candidate only after all gates", () => {
  const manifest = one([source("ROOT_INVITES")]);
  assert.equal(manifest.migrationDisposition, "MIGRATABLE_CANONICAL");
  assert.equal(manifest.canonicalPlan.invitationIdStrategy, "KEYED_DETERMINISTIC_V1");
  assert.equal(manifest.canonicalPlan.executionWriteImplemented, false);
});

for (const inactive of [
  { status: "revoked", usedCount: 0, maxUses: 3 },
  { status: "expired", usedCount: 0, maxUses: 3 },
  { status: "used", usedCount: 3, maxUses: 3 },
] as const) {
  test(`${inactive.status} historical record is archive-only`, () => {
    const manifest = one([source("ROOT_INVITATIONS", inactive)], options("LEGACY_SECRET_STRENGTH_UNKNOWN"));
    assert.equal(manifest.migrationDisposition, "MIGRATABLE_ARCHIVE_ONLY");
    assert.equal(manifest.secretSecurityClassification, "LEGACY_SECRET_NOT_RELEVANT_INACTIVE");
    assert.equal(manifest.canonicalPlan.createCodeHashIndex, false);
  });
}

test("trusted clock marks an elapsed active invitation archive-only without rewriting status", () => {
  const manifest = one([source("ROOT_INVITES", { expiresAt: NOW - 1 })]);
  assert.equal(manifest.migrationDisposition, "MIGRATABLE_ARCHIVE_ONLY");
  assert.equal(manifest.statusResolution.canonicalStatus, "active");
});

test("raw legacy code is absent from manifest and console-safe representation", () => {
  const manifest = one([source("ROOT_INVITES")]);
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, new RegExp(SYNTHETIC_CODE));
  assert.equal(isConsoleSafeLegacyManifest(manifest), true);
});

test("classifier error does not include the raw legacy code", () => {
  assert.throws(
    () => createLegacyInvitationDryRun([source("ROOT_INVITES")], { ...options(), nowMillis: Number.NaN }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, new RegExp(SYNTHETIC_CODE));
      return true;
    },
  );
});

test("grouping is deterministic and source-order independent", () => {
  const left = createLegacyInvitationDryRun([
    source("ROOT_INVITATIONS"), source("ROOT_INVITES"), source("NESTED_INVITE_CODES"),
  ], options());
  const right = createLegacyInvitationDryRun([
    source("NESTED_INVITE_CODES"), source("ROOT_INVITES"), source("ROOT_INVITATIONS"),
  ], options());
  assert.deepEqual(left, right);
});

test("multiple groups sort deterministically by fingerprint", () => {
  const first = source("ROOT_INVITES");
  const second = source("ROOT_INVITES", {}, OTHER_SYNTHETIC_CODE);
  const summaries = summarizeLegacyInvitationGroups([second, first]);
  assert.equal(summaries.length, 2);
  assert.ok((summaries[0]?.legacyGroupFingerprint ?? "") < (summaries[1]?.legacyGroupFingerprint ?? ""));
});

test("synthetic 3 shared plus 2 invitations-only inventory yields the audited shape", () => {
  const docs: LegacyInvitationSourceDocument[] = [];
  for (let index = 0; index < 5; index += 1) {
    const code = `SYNTHETIC-AUDIT-GROUP-${String(index).padStart(8, "0")}`;
    docs.push(source("ROOT_INVITATIONS", {}, code));
    if (index < 3) docs.push(source("ROOT_INVITES", {}, code));
  }
  const manifests = createLegacyInvitationDryRun(docs, options());
  assert.equal(manifests.filter((item) => item.sourceClassification === "SHARED_ROOTS").length, 3);
  assert.equal(manifests.filter((item) => item.sourceClassification === "INVITATIONS_ONLY").length, 2);
  assert.equal(manifests.flatMap((item) => item.sources)
    .filter((item) => item.source === "NESTED_INVITE_CODES").length, 0);
});

test("duplicate same-path source in one group is malformed", () => {
  const manifest = one([source("ROOT_INVITES"), source("ROOT_INVITES")]);
  assert.equal(manifest.sourceClassification, "MALFORMED");
});

test("canonical invitation collision fails closed for manual review", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_VERIFIED_STRONG", {
    resolveCollision: () => ({
      canonicalInvitationExists: true,
      codeHashIndexExists: false,
      migrationFingerprintConsumed: false,
    }),
  }));
  assert.equal(manifest.migrationDisposition, "MANUAL_REVIEW");
});

test("code index collision fails closed for manual review", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_VERIFIED_STRONG", {
    resolveCollision: () => ({
      canonicalInvitationExists: false,
      codeHashIndexExists: true,
      migrationFingerprintConsumed: false,
    }),
  }));
  assert.equal(manifest.migrationDisposition, "MANUAL_REVIEW");
});

test("consumed migration fingerprint is already migrated", () => {
  const manifest = one([source("ROOT_INVITES")], options("LEGACY_SECRET_VERIFIED_STRONG", {
    resolveCollision: () => ({
      canonicalInvitationExists: false,
      codeHashIndexExists: false,
      migrationFingerprintConsumed: true,
    }),
  }));
  assert.equal(manifest.migrationDisposition, "ALREADY_MIGRATED");
});

test("dry-run contract contains no writer and performs no Firestore operation", () => {
  const manifest = one([source("ROOT_INVITES")]);
  assert.equal(LEGACY_MIGRATION_EXECUTION_CONTRACT.executionWriterImplemented, false);
  assert.equal(manifest.canonicalPlan.executionWriteImplemented, false);
  assert.equal(MIGRATION_INVITATION_ID_STRATEGY, "KEYED_DETERMINISTIC_V1");
});

test("legacy classifier source imports no Firebase SDK or write primitive", () => {
  const sourceText = readFileSync(
    new URL("../src/invitations/legacy/legacyInvitationClassifier.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(sourceText, /firebase-admin|firebase\/firestore|\bsetDoc\b|\baddDoc\b|\bupdateDoc\b|\bdeleteDoc\b|\bwriteBatch\b|\brunTransaction\b/);
});

test("manifest contains no PII-shaped source fields", () => {
  const manifest = one([source("ROOT_INVITES", {
    email: "fixture@example.invalid",
    inviterEmail: "inviter@example.invalid",
  })]);
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /@example\.invalid/);
  assert.doesNotMatch(serialized, /fixture_creator/);
  assert.doesNotMatch(serialized, /fixture_workspace/);
});
