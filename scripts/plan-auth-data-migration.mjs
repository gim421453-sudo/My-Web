import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const OUTPUT_DIR = "output";
const WORKSPACE_AUDIT_PATH = path.join(OUTPUT_DIR, "workspace-integrity-audit.json");
const AUTH_AUDIT_PATH = path.join(OUTPUT_DIR, "auth-data-audit.json");
const NO_OUTPUT = process.argv.includes("--no-output");

if (process.argv.includes("--write") || process.argv.includes("--apply")) {
  console.error("This script is dry-run only. Firestore/Auth writes are intentionally not implemented.");
  process.exit(2);
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run the read-only audit scripts before planning.`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function rowId(item) {
  return item.uidMasked || item.uid || item.documentId || item.workspaceId || JSON.stringify(item);
}

function table(rows, columns) {
  if (!rows.length) return "- 없음";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

function buildPlan(workspaceAudit, authAudit) {
  const ownerWorkspaceId = "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1";
  const secondaryWorkspaceId = "ws_RAOf0oP1TegBjP1xV8wqwr04Vax1";
  const ownerAccounts = asArray(workspaceAudit.ownerAccounts);
  const systemOwnerSyncCandidates = ownerAccounts
    .filter((account) => account.systemOwnersDocExists && account.usersGlobalRole !== "system_owner")
    .map((account) => ({
      uidMasked: account.uidMasked || account.uid || "",
      emailMasked: account.emailMasked || account.email || "",
      currentGlobalRole: account.usersGlobalRole || "(missing)",
      proposedGlobalRole: "system_owner",
      currentRole: account.usersRole || "(missing)",
      proposedRole: "system_owner",
      reason: "systemOwners/{uid} exists and is the transitional authority source.",
      writeAllowedNow: false,
      requiresApproval: true,
    }));

  const disabledStringCandidates = [
    ...asArray(authAudit.users?.disabledStringFalse).map((user) => ({
      uidMasked: user.uidMasked || user.uid || "",
      emailMasked: user.emailMasked || user.email || "",
      currentDisabled: '"false"',
      proposedDisabled: false,
      reason: "String disabled value should become boolean false after approval.",
      writeAllowedNow: false,
      requiresApproval: true,
    })),
    ...asArray(authAudit.users?.disabledStringTrue).map((user) => ({
      uidMasked: user.uidMasked || user.uid || "",
      emailMasked: user.emailMasked || user.email || "",
      currentDisabled: '"true"',
      proposedDisabled: true,
      reason: "String disabled value should become boolean true after approval.",
      writeAllowedNow: false,
      requiresApproval: true,
    })),
  ];

  const statusNormalizationCandidates = [
    ...asArray(authAudit.users?.invalidStatusUsers).map((user) => ({
      uidMasked: user.uidMasked || user.uid || "",
      emailMasked: user.emailMasked || user.email || "",
      currentStatus: user.status,
      proposedStatus: "manual-review-required",
      reason: "Status is outside the allowed pending/active/rejected/disabled set.",
      writeAllowedNow: false,
      requiresApproval: true,
    })),
    ...Object.entries(authAudit.users?.conflicts || {}).flatMap(([conflictType, users]) => asArray(users).map((user) => ({
      uidMasked: user.uidMasked || user.uid || "",
      emailMasked: user.emailMasked || user.email || "",
      conflictType,
      proposedStatus: "manual-review-required",
      reason: "status/active/disabled fields conflict and must be normalized by an approved table.",
      writeAllowedNow: false,
      requiresApproval: true,
    }))),
  ];

  const currentWorkspaceIdNullKeepTargets = asArray(authAudit.workspaceRefs?.currentWorkspaceIdNullActive).map((user) => ({
    uidMasked: user.uidMasked || user.uid || "",
    emailMasked: user.emailMasked || user.email || "",
    currentWorkspaceId: null,
    proposedAction: "keep-null-until-user-selects-or-admin-approves",
    reason: "Active users with no currentWorkspaceId must not be auto-attached.",
    writeAllowedNow: false,
    requiresApproval: true,
  }));

  const deletedWorkspaceReferenceRemovalCandidates = uniqueBy([
    ...asArray(authAudit.workspaceRefs?.currentWorkspaceIdInvalid),
    ...asArray(authAudit.workspaceRefs?.workspaceIdInvalid),
    ...asArray(authAudit.workspaceRefs?.workspace_idInvalid),
  ].map((user) => ({
    uidMasked: user.uidMasked || user.uid || "",
    emailMasked: user.emailMasked || user.email || "",
    currentWorkspaceId: user.currentWorkspaceId,
    workspaceId: user.workspaceId,
    workspace_id: user.workspace_id,
    proposedAction: "remove-or-repoint-after-owner-confirms-workspace",
    reason: "The user document points at a workspace that does not exist in the valid workspace set.",
    writeAllowedNow: false,
    requiresApproval: true,
  })), (item) => `${item.uidMasked}|${item.currentWorkspaceId}|${item.workspaceId}|${item.workspace_id}`);

  const validNestedMembershipKeepTargets = asArray(authAudit.memberships?.validNestedOwnerWorkspaceMemberships).map((membership) => ({
    collection: membership.collection,
    docId: membership.docId,
    workspaceId: membership.workspaceId,
    uidMasked: membership.uidMasked || membership.uid || "",
    role: membership.role,
    status: membership.status,
    proposedAction: "keep-as-authoritative-nested-member",
    reason: "Nested member exists under a valid owner workspace.",
    writeAllowedNow: false,
  }));

  const legacyDuplicateCleanupCandidates = asArray(authAudit.memberships?.issues?.duplicateCombos).map((combo) => ({
    key: combo.key,
    entries: asArray(combo.entries).map((entry) => ({
      collection: entry.collection,
      docId: entry.docId,
      workspaceId: entry.workspaceId,
      uidMasked: entry.uidMasked || entry.uid || "",
      role: entry.role,
      status: entry.status,
    })),
    proposedAction: combo.key.startsWith(ownerWorkspaceId)
      ? "legacy-duplicate-cleanup-after-nested-confirmed"
      : "manual-review-before-cleanup",
    reason: combo.key.startsWith(ownerWorkspaceId)
      ? "Nested canonical member already exists for owner workspace."
      : "Duplicate legacy records reference a deleted or unconfirmed workspace.",
    writeAllowedNow: false,
    requiresApproval: true,
  }));

  const excludedFromMigration = [
    ...asArray(workspaceAudit.memberships?.orphanMemberships).map((membership) => ({
      kind: "orphan-membership",
      sourceCollection: membership.sourceCollection,
      documentId: membership.documentId,
      workspaceId: membership.workspaceId,
      uidMasked: membership.uidMasked || membership.uid || "",
      proposedAction: membership.workspaceId === "null" ? "cleanup-candidate" : "orphan-deleted-workspace",
      reason: "Null/missing/deleted workspace references are never migrated to nested members.",
    })),
    ...asArray(workspaceAudit.memberships?.legacyOnlyMemberships)
      .filter((membership) => membership.workspaceId === secondaryWorkspaceId)
      .map((membership) => ({
        kind: "secondary-workspace-legacy-membership",
        sourceCollection: membership.sourceCollection,
        documentId: membership.documentId,
        workspaceId: membership.workspaceId,
        uidMasked: membership.uidMasked || membership.uid || "",
        proposedAction: "manual-review-required",
        reason: "Secondary workspace is under deletion review; nested migration is forbidden for now.",
      })),
  ];

  const manualReviewTargets = [
    ...asArray(workspaceAudit.workspaces?.items)
      .filter((workspace) => workspace.workspaceId === secondaryWorkspaceId)
      .map((workspace) => ({
        kind: "secondary-workspace",
        workspaceId: workspace.workspaceId,
        classification: workspace.classification?.candidate,
        reason: "Workspace has subcollection data but no nested members or user currentWorkspaceId references.",
      })),
    ...asArray(workspaceAudit.systemOwnerMismatches).map((mismatch) => ({
      kind: mismatch.kind,
      uidMasked: mismatch.uidMasked || mismatch.uid || "",
      description: mismatch.description,
      reason: "System owner authority fields must be synchronized only after explicit approval.",
    })),
  ];

  return {
    generatedAt: new Date().toISOString(),
    mode: "DRY_RUN_ONLY",
    writesImplemented: false,
    sourceFiles: [WORKSPACE_AUDIT_PATH, AUTH_AUDIT_PATH],
    assumptions: {
      keepWorkspaceCandidate: ownerWorkspaceId,
      deletionReviewWorkspaceCandidate: secondaryWorkspaceId,
      systemOwnerAuthority: "systemOwners/{uid}",
      usersGlobalRolePolicy: "mirror systemOwners state after approval",
      legacyRolePolicy: "keep users.role for app.js compatibility until legacy removal",
    },
    groups: {
      A_systemOwnerGlobalRoleSyncCandidates: systemOwnerSyncCandidates,
      B_disabledStringToBooleanCandidates: disabledStringCandidates,
      C_statusNormalizationCandidates: statusNormalizationCandidates,
      D_currentWorkspaceIdNullKeepTargets: currentWorkspaceIdNullKeepTargets,
      E_deletedWorkspaceReferenceRemovalCandidates: deletedWorkspaceReferenceRemovalCandidates,
      F_validNestedMembershipKeepTargets: validNestedMembershipKeepTargets,
      G_legacyMembershipDuplicateCleanupCandidates: legacyDuplicateCleanupCandidates,
      H_excludedFromMigration: excludedFromMigration,
      I_manualReviewTargets: manualReviewTargets,
    },
    guardrails: [
      "No Firestore writes are implemented.",
      "No Firebase Auth writes are implemented.",
      "No Rules deployment is implemented.",
      "Secondary workspace legacy membership is excluded from nested migration until the workspace decision is confirmed.",
      "Null and deleted workspace memberships are excluded from nested migration.",
    ],
  };
}

function buildMarkdown(plan) {
  const groups = plan.groups;
  return `# Auth Data Migration Dry-run Plan

생성일: ${plan.generatedAt}

## 모드

- 실행 모드: ${plan.mode}
- 쓰기 구현 여부: ${plan.writesImplemented}
- 입력 파일: ${plan.sourceFiles.join(", ")}
- Firestore/Auth/Rules 변경: 없음

## 기준

- 유지 후보 workspace: ${plan.assumptions.keepWorkspaceCandidate}
- 삭제 검토 workspace: ${plan.assumptions.deletionReviewWorkspaceCandidate}
- 시스템 오너 권위 기준: ${plan.assumptions.systemOwnerAuthority}
- users.globalRole 정책: ${plan.assumptions.usersGlobalRolePolicy}
- users.role 정책: ${plan.assumptions.legacyRolePolicy}

## A. system owner globalRole 동기화 후보

${table(groups.A_systemOwnerGlobalRoleSyncCandidates, [
  { label: "uid", value: (row) => row.uidMasked },
  { label: "email", value: (row) => row.emailMasked },
  { label: "현재 globalRole", value: (row) => row.currentGlobalRole },
  { label: "변경 예정", value: (row) => row.proposedGlobalRole },
  { label: "현재 role", value: (row) => row.currentRole },
  { label: "근거", value: (row) => row.reason },
])}

## B. disabled 문자열 → Boolean 변환 후보

${table(groups.B_disabledStringToBooleanCandidates, [
  { label: "uid", value: (row) => row.uidMasked },
  { label: "email", value: (row) => row.emailMasked },
  { label: "현재 disabled", value: (row) => row.currentDisabled },
  { label: "변경 예정", value: (row) => row.proposedDisabled },
  { label: "근거", value: (row) => row.reason },
])}

## C. status 기준 정규화 후보

${table(groups.C_statusNormalizationCandidates, [
  { label: "uid", value: (row) => row.uidMasked },
  { label: "email", value: (row) => row.emailMasked },
  { label: "충돌/상태", value: (row) => row.conflictType || row.currentStatus },
  { label: "변경 예정", value: (row) => row.proposedStatus },
  { label: "근거", value: (row) => row.reason },
])}

## D. currentWorkspaceId null 유지 대상

${table(groups.D_currentWorkspaceIdNullKeepTargets, [
  { label: "uid", value: (row) => row.uidMasked },
  { label: "email", value: (row) => row.emailMasked },
  { label: "현재", value: (row) => row.currentWorkspaceId },
  { label: "조치", value: (row) => row.proposedAction },
])}

## E. 삭제 워크스페이스 참조 제거 후보

${table(groups.E_deletedWorkspaceReferenceRemovalCandidates, [
  { label: "uid", value: (row) => row.uidMasked },
  { label: "currentWorkspaceId", value: (row) => row.currentWorkspaceId },
  { label: "workspaceId", value: (row) => row.workspaceId },
  { label: "workspace_id", value: (row) => row.workspace_id },
  { label: "조치", value: (row) => row.proposedAction },
])}

## F. 유효 nested membership 유지 대상

${table(groups.F_validNestedMembershipKeepTargets, [
  { label: "doc", value: (row) => row.docId },
  { label: "workspaceId", value: (row) => row.workspaceId },
  { label: "uid", value: (row) => row.uidMasked },
  { label: "role", value: (row) => row.role },
  { label: "status", value: (row) => row.status },
])}

## G. legacy membership 중복 정리 후보

${table(groups.G_legacyMembershipDuplicateCleanupCandidates, [
  { label: "key", value: (row) => row.key },
  { label: "entries", value: (row) => row.entries.length },
  { label: "조치", value: (row) => row.proposedAction },
  { label: "근거", value: (row) => row.reason },
])}

## H. 실제 마이그레이션 제외 대상

${table(groups.H_excludedFromMigration, [
  { label: "kind", value: (row) => row.kind },
  { label: "source/doc", value: (row) => `${row.sourceCollection || "-"} / ${row.documentId || "-"}` },
  { label: "workspaceId", value: (row) => row.workspaceId || "-" },
  { label: "uid", value: (row) => row.uidMasked || "-" },
  { label: "조치", value: (row) => row.proposedAction },
  { label: "근거", value: (row) => row.reason },
])}

## I. 수동 검토 대상

${table(groups.I_manualReviewTargets, [
  { label: "kind", value: (row) => row.kind },
  { label: "target", value: (row) => row.workspaceId || row.uidMasked || "-" },
  { label: "상태", value: (row) => row.classification || row.description || "-" },
  { label: "근거", value: (row) => row.reason },
])}

## 안전장치

${plan.guardrails.map((item) => `- ${item}`).join("\n")}
`;
}

function main() {
  const workspaceAudit = readJson(WORKSPACE_AUDIT_PATH);
  const authAudit = readJson(AUTH_AUDIT_PATH);
  const plan = buildPlan(workspaceAudit, authAudit);

  if (!NO_OUTPUT) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(path.join(OUTPUT_DIR, "auth-migration-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    writeFileSync(path.join(OUTPUT_DIR, "auth-migration-plan.md"), buildMarkdown(plan), "utf8");
  }

  console.log(JSON.stringify({
    mode: plan.mode,
    writesImplemented: plan.writesImplemented,
    A_systemOwnerGlobalRoleSyncCandidates: plan.groups.A_systemOwnerGlobalRoleSyncCandidates.length,
    B_disabledStringToBooleanCandidates: plan.groups.B_disabledStringToBooleanCandidates.length,
    C_statusNormalizationCandidates: plan.groups.C_statusNormalizationCandidates.length,
    D_currentWorkspaceIdNullKeepTargets: plan.groups.D_currentWorkspaceIdNullKeepTargets.length,
    E_deletedWorkspaceReferenceRemovalCandidates: plan.groups.E_deletedWorkspaceReferenceRemovalCandidates.length,
    F_validNestedMembershipKeepTargets: plan.groups.F_validNestedMembershipKeepTargets.length,
    G_legacyMembershipDuplicateCleanupCandidates: plan.groups.G_legacyMembershipDuplicateCleanupCandidates.length,
    H_excludedFromMigration: plan.groups.H_excludedFromMigration.length,
    I_manualReviewTargets: plan.groups.I_manualReviewTargets.length,
    output: NO_OUTPUT ? "not written" : ["output/auth-migration-plan.json", "output/auth-migration-plan.md"],
  }, null, 2));
}

main();
