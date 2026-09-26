import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildGlobalAuthorizationContext,
  buildWorkspaceAuthorizationContext,
  buildWorkspaceAuthorizationContextWithOwnerOverride,
} from "../src/authz/authorizationContext.js";
import {
  AuthorizationError,
  logSafeAuthorizationDecision,
} from "../src/authz/authzErrors.js";
import type { AuthorizationContext } from "../src/authz/authorizationTypes.js";
import {
  requireGlobalSystemOwner,
  requireWorkspaceRole,
  requireWorkspaceRoleOrSystemOwner,
} from "../src/authz/policies.js";
import {
  DEFERRED_PERMISSION_NAMES,
  IMPLEMENT_NOW_PERMISSION_NAMES,
  PERMISSION_CATALOG,
  PERMISSION_DOMAINS,
  PERMISSION_IMPLEMENTATION_STATUSES,
  PERMISSION_NAMES,
  PERMISSION_RISK_LEVELS,
  PERMISSION_SCOPE_KINDS,
  WORKSPACE_READ_EXCLUDED_DOMAINS,
  ROLE_PERMISSION_POLICY_VERSION,
  isPermissionName,
} from "../src/authz/permissions.js";
import {
  ROLE_PERMISSION_POLICY,
  getPermissionPolicyRule,
} from "../src/authz/permissionPolicy.js";
import {
  requirePermission,
  resolveActorPermission,
} from "../src/authz/permissionResolver.js";
import { resolveTeacherAssignedScope } from "../src/authz/assignmentScopeResolver.js";
import { resolvePermissionWithAssignedScope } from "../src/authz/scopeAuthorization.js";
import {
  parseAssignedScopeTarget,
  parseCanonicalTeacherAssignment,
} from "../src/teacherAssignments/teacherAssignmentContract.js";
import { createTeacherAssignmentRepository } from "../src/teacherAssignments/teacherAssignmentRepository.js";
import { parseCanonicalStudentEnrollment } from "../src/relationships/studentEnrollmentContract.js";
import { createStudentEnrollmentRepository } from "../src/relationships/studentEnrollmentRepository.js";
import { resolveStudentEnrollmentRelationship } from "../src/authz/relationshipScopeResolver.js";
import { parseStudentRegistryDocument } from "../src/registries/studentRegistryContract.js";
import { parseClassRegistryDocument } from "../src/registries/classRegistryContract.js";
import { parseSubjectRegistryDocument } from "../src/registries/subjectRegistryContract.js";
import { isCanonicalEntityVersion } from "../src/registries/entityRegistryContract.js";
import { createEntityRegistryRepository } from "../src/registries/entityRegistryRepository.js";
import { validateEnrollmentReferences } from "../src/relationships/enrollmentReferentialValidator.js";
import { WORKSPACE_MEMBER_DELEGATION_MATRIX } from "../src/workspaceMembers/workspaceMemberPolicy.js";
import {
  FIXTURE_WORKSPACE,
  fixtureActor,
  membershipV1,
  ownerV1,
} from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

function mapReader(documents: ReadonlyMap<string, Record<string, unknown>>, onRead: () => void = () => undefined) {
  return Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      onRead();
      const data = documents.get(pathSegments.join("/"));
      return Object.freeze({ exists: Boolean(data), data });
    },
  });
}

function context(
  owner: AuthorizationContext["global"]["systemOwner"],
  membership: AuthorizationContext["workspace"]["membership"],
  workspaceId: string | null = FIXTURE_WORKSPACE,
): AuthorizationContext {
  return Object.freeze({
    actor: fixtureActor(),
    operation: "fixture.operation",
    global: Object.freeze({ systemOwner: owner }),
    workspace: Object.freeze({
      workspaceId,
      membership,
      role: membership.state === "ACTIVE" ? membership.role : null,
    }),
    capability: Object.freeze({ resolution: "unresolved" }),
    assignment: Object.freeze({ resolution: "unresolved" }),
    resolution: "complete",
  });
}

function expectAuthzCode(run: () => void, code: string): void {
  assert.throws(
    run,
    (error: unknown) => error instanceof AuthorizationError && error.code === code,
  );
}

function assignmentDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    workspaceId: FIXTURE_WORKSPACE,
    teacherUid: fixtureActor().uid,
    target: { type: "student", studentId: "student-a" },
    status: "active",
    source: "manual_admin",
    createdAt: 100,
    updatedAt: 100,
    createdBy: "admin-a",
    ...overrides,
  };
}

function assignmentDependencies(documents: readonly Record<string, unknown>[], nowMs = 100): {
  readonly assignments: { listForTeacher(workspaceId: string, teacherUid: string): Promise<readonly { exists: boolean; data?: Record<string, unknown> }[]> };
  readonly registries: ReturnType<typeof registryDependencies>["registries"];
  readonly nowMs: () => number;
} {
  return Object.freeze({
    assignments: Object.freeze({
      async listForTeacher() {
        return Object.freeze(documents.map((data) => Object.freeze({ exists: true, data })));
      },
    }),
    ...registryDependencies(),
    nowMs: () => nowMs,
  });
}

function enrollmentDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    version: 1,
    workspaceId: FIXTURE_WORKSPACE,
    studentId: "student-a",
    classId: "class-a",
    subjectIds: ["subject-a"],
    status: "active",
    source: "manual_admin",
    createdAt: 100,
    updatedAt: 100,
    createdBy: "admin-a",
    ...overrides,
  };
}

function relationshipDependencies(documents: readonly Record<string, unknown>[]) {
  return Object.freeze({
    relationships: Object.freeze({
      async listForStudent() {
        return Object.freeze(documents.map((data) => Object.freeze({ exists: true, data })));
      },
    }),
    ...registryDependencies(),
  });
}

function studentRegistryDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    version: 1,
    workspaceId: FIXTURE_WORKSPACE,
    studentId: "student-a",
    status: "active",
    source: "manual_admin",
    createdAt: 100,
    updatedAt: 100,
    createdBy: "admin-a",
    displayName: "Student A",
    studentNumber: "1001",
    ...overrides,
  };
}

function classRegistryDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    version: 1,
    workspaceId: FIXTURE_WORKSPACE,
    classId: "class-a",
    status: "active",
    source: "manual_admin",
    createdAt: 100,
    updatedAt: 100,
    createdBy: "admin-a",
    displayName: "Class A",
    schoolYear: "2026",
    grade: "1",
    ...overrides,
  };
}

function subjectRegistryDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    version: 1,
    workspaceId: FIXTURE_WORKSPACE,
    subjectId: "subject-a",
    status: "active",
    source: "manual_admin",
    createdAt: 100,
    updatedAt: 100,
    createdBy: "admin-a",
    displayName: "Subject A",
    subjectCode: "SUB-A",
    ...overrides,
  };
}

function registryFixtures(overrides: Readonly<Record<string, Record<string, unknown>>> = {}): Record<string, Record<string, unknown>> {
  return {
    [`workspaces/${FIXTURE_WORKSPACE}/studentRegistry/student-a`]: studentRegistryDocument(overrides.student ?? {}),
    [`workspaces/${FIXTURE_WORKSPACE}/classRegistry/class-a`]: classRegistryDocument(overrides.class ?? {}),
    [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-a`]: subjectRegistryDocument(overrides.subjectA ?? {}),
    [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-b`]: subjectRegistryDocument({ subjectId: "subject-b", displayName: "Subject B", subjectCode: "SUB-B", ...(overrides.subjectB ?? {}) }),
  };
}

function registryDependencies(documents: Record<string, Record<string, unknown>> = registryFixtures()) {
  function document(path: string): Record<string, unknown> | undefined {
    return documents[path];
  }
  return Object.freeze({
    registries: Object.freeze({
      async getStudent(workspaceId: string, studentId: string) {
        const data = document(`workspaces/${workspaceId}/studentRegistry/${studentId}`);
        return data === undefined
          ? Object.freeze({ state: "MISSING" as const })
          : parseStudentRegistryDocument(data, { workspaceId, entityId: studentId });
      },
      async getClass(workspaceId: string, classId: string) {
        const data = document(`workspaces/${workspaceId}/classRegistry/${classId}`);
        return data === undefined
          ? Object.freeze({ state: "MISSING" as const })
          : parseClassRegistryDocument(data, { workspaceId, entityId: classId });
      },
      async getSubject(workspaceId: string, subjectId: string) {
        const data = document(`workspaces/${workspaceId}/subjectRegistry/${subjectId}`);
        return data === undefined
          ? Object.freeze({ state: "MISSING" as const })
          : parseSubjectRegistryDocument(data, { workspaceId, entityId: subjectId });
      },
    }),
  });
}

function canonicalScopeDependencies(
  assignments: readonly Record<string, unknown>[],
  enrollments: readonly Record<string, unknown>[] = [],
  registries: Record<string, Record<string, unknown>> = registryFixtures(),
) {
  return Object.freeze({
    ...assignmentDependencies(assignments),
    ...relationshipDependencies(enrollments),
    ...registryDependencies(registries),
  });
}

function teacherContext(
  membership: AuthorizationContext["workspace"]["membership"] = { state: "ACTIVE", role: "teacher", source: "system_bootstrap" },
  workspaceId: string | null = FIXTURE_WORKSPACE,
): AuthorizationContext {
  return context({ state: "NOT_OWNER" }, membership, workspaceId);
}

test("global context performs exactly one owner read", async () => {
  let reads = 0;
  const result = await buildGlobalAuthorizationContext(fixtureActor(), "global.inspect", {
    reader: mapReader(new Map([[`systemOwners/${fixtureActor().uid}`, ownerV1()]]), () => { reads += 1; }),
  });
  assert.equal(reads, 1);
  assert.equal(result.global.systemOwner.state, "ACTIVE");
  assert.equal(result.workspace.membership.state, "UNRESOLVED");
});

test("workspace context performs exactly one membership read", async () => {
  let reads = 0;
  const result = await buildWorkspaceAuthorizationContext(fixtureActor(), "workspace.inspect", FIXTURE_WORKSPACE, {
    reader: mapReader(new Map([[
      `workspaces/${FIXTURE_WORKSPACE}/members/${fixtureActor().uid}`,
      membershipV1(),
    ]]), () => { reads += 1; }),
  });
  assert.equal(reads, 1);
  assert.equal(result.workspace.membership.state, "ACTIVE");
  assert.equal(result.global.systemOwner.state, "UNRESOLVED");
});

test("explicit owner override context performs exactly two reads", async () => {
  let reads = 0;
  const documents = new Map([
    [`systemOwners/${fixtureActor().uid}`, ownerV1()],
    [`workspaces/${FIXTURE_WORKSPACE}/members/${fixtureActor().uid}`, membershipV1()],
  ]);
  const result = await buildWorkspaceAuthorizationContextWithOwnerOverride(
    fixtureActor(),
    "workspace.override",
    FIXTURE_WORKSPACE,
    { reader: mapReader(documents, () => { reads += 1; }) },
  );
  assert.equal(reads, 2);
  assert.equal(result.global.systemOwner.state, "ACTIVE");
  assert.equal(result.workspace.membership.state, "ACTIVE");
});

test("invalid operation is blocked before reads", async () => {
  let reads = 0;
  await assert.rejects(
    buildGlobalAuthorizationContext(fixtureActor(), "invalid operation", {
      reader: mapReader(new Map(), () => { reads += 1; }),
    }),
    (error: unknown) => error instanceof AuthorizationError && error.code === "AUTHZ_CONTEXT_MALFORMED",
  );
  assert.equal(reads, 0);
});

test("invalid workspace path is blocked before reads", async () => {
  let reads = 0;
  await assert.rejects(
    buildWorkspaceAuthorizationContext(fixtureActor(), "workspace.inspect", "bad/path", {
      reader: mapReader(new Map(), () => { reads += 1; }),
    }),
    (error: unknown) => error instanceof AuthorizationError && error.code === "AUTHZ_CONTEXT_MALFORMED",
  );
  assert.equal(reads, 0);
});

test("AuthorizationContext remains capability and assignment unresolved", async () => {
  const result = await buildGlobalAuthorizationContext(fixtureActor(), "global.inspect", {
    reader: mapReader(new Map()),
  });
  assert.equal(result.capability.resolution, "unresolved");
  assert.equal(result.assignment.resolution, "unresolved");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.global), true);
});

test("active owner passes global owner policy", () => {
  assert.doesNotThrow(() => requireGlobalSystemOwner(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "UNRESOLVED" },
    null,
  )));
});

for (const state of ["NOT_OWNER", "DISABLED", "MIGRATION_REQUIRED"] as const) {
  test(`${state} owner is denied by global owner policy`, () => {
    expectAuthzCode(() => requireGlobalSystemOwner(context({ state }, { state: "UNRESOLVED" }, null)), "AUTHZ_SYSTEM_OWNER_REQUIRED");
  });
}

test("owner read error is not converted to NOT_OWNER", () => {
  expectAuthzCode(
    () => requireGlobalSystemOwner(context({ state: "READ_ERROR" }, { state: "UNRESOLVED" }, null)),
    "AUTHZ_INTERNAL_ERROR",
  );
});

test("active manager passes explicit manager allowlist", () => {
  assert.doesNotThrow(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["super_manager", "manager"]));
});

test("teacher fails manager-only allowlist", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "teacher", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_ROLE_DENIED");
});

test("numeric role hierarchy is not inferred", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_ROLE_DENIED");
});

test("system owner does not bypass ordinary workspace role policy", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "MISSING" },
  ), ["manager"]), "AUTHZ_MEMBERSHIP_MISSING");
});

test("system owner bypasses only explicit owner override policy", () => {
  assert.doesNotThrow(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "MISSING" },
  ), ["manager"]));
});

test("ordinary active membership passes explicit owner override policy", () => {
  assert.doesNotThrow(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "NOT_OWNER" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["manager"]));
});

test("unresolved owner cannot pass owner override policy", () => {
  expectAuthzCode(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_CONTEXT_REQUIRED");
});

test("unresolved membership cannot pass workspace role policy", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "UNRESOLVED" },
  ), ["manager"]), "AUTHZ_CONTEXT_MALFORMED");
});

test("disabled membership receives a distinct denial", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "DISABLED" },
  ), ["manager"]), "AUTHZ_MEMBERSHIP_DISABLED");
});

test("workspace read error fails closed", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "READ_ERROR" },
  ), ["manager"]), "AUTHZ_INTERNAL_ERROR");
});

test("safe authorization log excludes actor and workspace identifiers", () => {
  const logs: unknown[] = [];
  logSafeAuthorizationDecision({
    requestId: "fixture-request",
    operation: "workspace.inspect",
    decision: "deny",
    reasonCode: "AUTHZ_ROLE_DENIED",
    emulator: true,
  }, (_label, entry) => logs.push(entry));
  const text = JSON.stringify(logs);
  assert.equal(text.includes(fixtureActor().uid), false);
  assert.equal(text.includes(FIXTURE_WORKSPACE), false);
  assert.equal(text.includes("manager"), false);
});

test("safe authorization log sanitizes caller supplied labels", () => {
  const logs: unknown[] = [];
  logSafeAuthorizationDecision({
    requestId: "fixture-request token-like value",
    operation: "workspace.inspect/fixture-secret",
    decision: "error",
    reasonCode: "AUTHZ_INTERNAL_ERROR",
    emulator: true,
  }, (_label, entry) => logs.push(entry));
  assert.deepEqual(logs, [{
    requestId: "invalid",
    operation: "invalid",
    decision: "error",
    reasonCode: "AUTHZ_INTERNAL_ERROR",
    emulator: true,
  }]);
});

test("P1.5-A permission catalog is unique, complete, and status-reconciled", () => {
  assert.equal(PERMISSION_CATALOG.length, 44);
  assert.equal(IMPLEMENT_NOW_PERMISSION_NAMES.length, 38);
  assert.equal(DEFERRED_PERMISSION_NAMES.length, 6);
  assert.equal(PERMISSION_NAMES.length, IMPLEMENT_NOW_PERMISSION_NAMES.length + DEFERRED_PERMISSION_NAMES.length);
  assert.equal(new Set(PERMISSION_NAMES).size, PERMISSION_NAMES.length);
  assert.deepEqual(DEFERRED_PERMISSION_NAMES, [
    "system.policy.manage",
    "system.recovery.execute",
    "print.execute",
    "export.file",
    "export.sensitive",
    "audit.read",
  ]);
});

test("P1.5-A permission metadata has matching finite contract values", () => {
  const domains = new Set<string>(PERMISSION_DOMAINS);
  const risks = new Set<string>(PERMISSION_RISK_LEVELS);
  const scopes = new Set<string>(PERMISSION_SCOPE_KINDS);
  const statuses = new Set<string>(PERMISSION_IMPLEMENTATION_STATUSES);
  const roleNames = new Set(["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"]);
  for (const permission of PERMISSION_CATALOG) {
    assert.match(permission.name, /^[a-z][a-z_]*\.[a-z][a-z_]*(?:\.[a-z][a-z_]*)*$/);
    assert.equal(permission.name.split(".")[0], permission.domain);
    assert.equal(domains.has(permission.domain), true);
    assert.equal(risks.has(permission.riskLevel), true);
    assert.equal(scopes.has(permission.scopeKind), true);
    assert.equal(statuses.has(permission.implementationStatus), true);
    assert.equal(permission.name.split(".").some((segment) => roleNames.has(segment)), false);
    assert.equal(permission.name.includes("*"), false);
  }
});

test("P1.5-A permission validator is exact and fail-closed", () => {
  assert.equal(isPermissionName("grade.write"), true);
  assert.equal(isPermissionName("grade.approve"), true);
  assert.equal(isPermissionName("student.enrollment.manage"), true);
  assert.equal(isPermissionName("student.registry.manage"), true);
  assert.equal(isPermissionName("academic.registry.manage"), true);
  assert.equal(isPermissionName("STUDENT.ENROLLMENT.MANAGE"), false);
  assert.equal(isPermissionName(" student.enrollment.manage"), false);
  assert.equal(isPermissionName("student.enrollment.manage "), false);
  assert.equal(isPermissionName("student.enrollment"), false);
  assert.equal(isPermissionName("student.enrollment.update"), false);
  assert.equal(isPermissionName("STUDENT.REGISTRY.MANAGE"), false);
  assert.equal(isPermissionName("academic.registry.manage "), false);
  assert.equal(isPermissionName("academic.manage"), false);
  assert.equal(isPermissionName("GRADE.WRITE"), false);
  assert.equal(isPermissionName(" grade.write"), false);
  assert.equal(isPermissionName("grade.write "), false);
  assert.equal(isPermissionName("grade.write.extra"), false);
  assert.equal(isPermissionName("system.all"), false);
  assert.equal(isPermissionName("admin.*"), false);
  assert.equal(isPermissionName(null), false);
});

test("P1.5-A preserves permission boundaries without granting authority", () => {
  assert.notEqual("member.role.assign", "member.role.change");
  assert.notEqual("teaching_assignment.manage", "assignment.write");
  assert.notEqual("grade.write", "grade.approve");
  assert.notEqual("print.execute", "export.file");
  assert.notEqual("export.file", "export.sensitive");
  assert.notEqual("student.enrollment.manage", "student.read");
  assert.notEqual("student.enrollment.manage", "teaching_assignment.manage");
  assert.notEqual("student.enrollment.manage", "member.role.change");
  assert.notEqual("student.enrollment.manage", "workspace.settings.update");
  assert.notEqual("student.enrollment.manage", "grade.write");
  assert.notEqual("student.enrollment.manage", "record.write");
  assert.notEqual("student.registry.manage", "student.enrollment.manage");
  assert.notEqual("academic.registry.manage", "grade.write");
  assert.notEqual("academic.registry.manage", "attendance.write");
  assert.notEqual("academic.registry.manage", "record.write");
  assert.equal(isPermissionName("billing.manage"), false);
  assert.equal(isPermissionName("subscription.manage"), false);
  assert.equal(WORKSPACE_READ_EXCLUDED_DOMAINS.includes("grade"), true);
  assert.equal(WORKSPACE_READ_EXCLUDED_DOMAINS.includes("member"), true);
});

test("P1.5-B static policy has exact explicit role snapshots", () => {
  const expected = {
    system_owner: [
      "system.owner.manage", "workspace.read", "workspace.settings.update", "workspace.lifecycle.manage", "workspace.mode.change",
      "member.read", "member.role.assign", "member.role.change", "member.status.change", "member.remove",
      "invitation.read", "invitation.create", "invitation.revoke", "application.review", "join.review",
      "account.disable", "account.enable", "teaching_assignment.manage",
      "student.enrollment.manage",
      "student.registry.manage", "academic.registry.manage",
    ],
    super_manager: [
      "workspace.read", "workspace.settings.update", "member.read", "member.role.assign", "member.role.change",
      "member.status.change", "member.remove", "invitation.read", "invitation.create", "invitation.revoke", "teaching_assignment.manage",
      "student.enrollment.manage",
      "student.registry.manage", "academic.registry.manage",
    ],
    manager: [
      "workspace.read", "workspace.settings.update", "member.read", "member.role.assign", "member.role.change",
      "member.status.change", "member.remove", "invitation.read", "invitation.create", "invitation.revoke",
    ],
    teacher: ["student.read", "attendance.read", "attendance.write", "grade.read", "grade.write", "record.read", "record.write"],
    normal: ["workspace.read"],
    viewer: ["workspace.read"],
    print_account: ["workspace.read"],
  } as const;

  for (const [role, permissions] of Object.entries(expected)) {
    assert.deepEqual(ROLE_PERMISSION_POLICY[role as keyof typeof ROLE_PERMISSION_POLICY], permissions);
  }
  assert.equal(Object.values(expected).flat().length, Object.values(ROLE_PERMISSION_POLICY).flat().length);
});

test("P1.5-B resolves every catalog permission deterministically for canonical roles", () => {
  const roles = ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"] as const;
  for (const permission of IMPLEMENT_NOW_PERMISSION_NAMES) {
    for (const role of roles) {
      const owner = role === "system_owner" ? { state: "ACTIVE", source: "system_bootstrap" } as const : { state: "NOT_OWNER" } as const;
      const membership = role === "system_owner"
        ? { state: "MISSING" } as const
        : { state: "ACTIVE", role, source: "system_bootstrap" } as const;
      const outcome = resolveActorPermission(context(owner, membership), permission);
      assert.equal(["ALLOW", "DENY", "REQUIRES_SCOPE"].includes(outcome.decision), true);
      assert.equal(outcome.policyVersion, "ROLE_PERMISSION_POLICY_V1_2");
    }
  }
  for (const permission of DEFERRED_PERMISSION_NAMES) {
    for (const role of roles) {
      const owner = role === "system_owner" ? { state: "ACTIVE", source: "system_bootstrap" } as const : { state: "NOT_OWNER" } as const;
      const membership = role === "system_owner"
        ? { state: "MISSING" } as const
        : { state: "ACTIVE", role, source: "system_bootstrap" } as const;
      assert.equal(resolveActorPermission(context(owner, membership), permission).decision, "DEFERRED");
    }
  }
});

test("P1.5-B denies wildcard, unknown, inactive, and missing-workspace authority", () => {
  const activeManager = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "manager", source: "system_bootstrap" });
  assert.equal(resolveActorPermission(activeManager, "admin.*").reasonCode, "PERMISSION_UNKNOWN");
  assert.equal(resolveActorPermission(activeManager, "billing.manage").decision, "DENY");
  assert.equal(resolveActorPermission(context({ state: "DISABLED" }, { state: "INACTIVE" }), "workspace.read").reasonCode, "AUTHORITY_INACTIVE");
  assert.equal(resolveActorPermission(context({ state: "ACTIVE", source: "system_bootstrap" }, { state: "MISSING" }, null), "workspace.read").reasonCode, "WORKSPACE_CONTEXT_REQUIRED");
});

test("P1.5-B protects explicit system-owner and delegated role boundaries", () => {
  const owner = context({ state: "ACTIVE", source: "system_bootstrap" }, { state: "MISSING" });
  assert.equal(resolveActorPermission(owner, "grade.read").decision, "DENY");
  assert.equal(resolveActorPermission(owner, "notice.read").decision, "DENY");
  assert.equal(resolveActorPermission(owner, "system.policy.manage").decision, "DEFERRED");

  assert.deepEqual(WORKSPACE_MEMBER_DELEGATION_MATRIX.super_manager, ["manager", "teacher", "normal", "viewer", "print_account"]);
  assert.deepEqual(WORKSPACE_MEMBER_DELEGATION_MATRIX.manager, ["teacher", "normal", "viewer", "print_account"]);
  assert.equal(WORKSPACE_MEMBER_DELEGATION_MATRIX.manager.includes("manager"), false);
  assert.equal(WORKSPACE_MEMBER_DELEGATION_MATRIX.super_manager.includes("super_manager"), false);
});

test("P1.5-B preserves scope requirements and generic requirePermission fails closed", () => {
  const teacher = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "teacher", source: "system_bootstrap" });
  const teacherGrade = resolveActorPermission(teacher, "grade.write");
  assert.deepEqual(teacherGrade, {
    decision: "REQUIRES_SCOPE",
    permission: "grade.write",
    policyVersion: "ROLE_PERMISSION_POLICY_V1_2",
    requiredScope: "assigned",
    reasonCode: "SCOPE_VERIFICATION_REQUIRED",
    role: "teacher",
  });
  expectAuthzCode(() => requirePermission(teacher, "grade.write"), "AUTHZ_SCOPE_DENIED");

  const normal = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "normal", source: "system_bootstrap" });
  assert.equal(resolveActorPermission(normal, "assignment.write").decision, "DENY");
  const viewer = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "viewer", source: "system_bootstrap" });
  assert.equal(resolveActorPermission(viewer, "notice.manage").decision, "DENY");
  const printAccount = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "print_account", source: "system_bootstrap" });
  assert.equal(resolveActorPermission(printAccount, "student.read").decision, "DENY");
  assert.equal(resolveActorPermission(printAccount, "print.execute").decision, "DEFERRED");
});

test("P1.5-A1 grants canonical enrollment management only to explicit workspace authorities", () => {
  const permission = "student.enrollment.manage";
  const metadata = PERMISSION_CATALOG.find((entry) => entry.name === permission);
  assert.deepEqual(metadata, {
    name: permission,
    domain: "student",
    riskLevel: "high",
    scopeKind: "workspace",
    implementationStatus: "IMPLEMENT_NOW",
    auditRequired: true,
    freshAuthRequired: false,
    confirmationRequired: true,
  });
  assert.equal(ROLE_PERMISSION_POLICY_VERSION, "ROLE_PERMISSION_POLICY_V1_2");

  const owner = context({ state: "ACTIVE", source: "system_bootstrap" }, { state: "MISSING" });
  assert.equal(resolveActorPermission(owner, permission).decision, "ALLOW");
  const superManager = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" });
  assert.equal(resolveActorPermission(superManager, permission).decision, "ALLOW");

  for (const role of ["manager", "teacher", "normal", "viewer", "print_account"] as const) {
    const candidate = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role, source: "system_bootstrap" });
    assert.equal(resolveActorPermission(candidate, permission).decision, "DENY", `${role} must not receive enrollment authority`);
  }
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "MISSING" }, "other-workspace"), permission).decision, "DENY");
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "INACTIVE" }, FIXTURE_WORKSPACE), permission).decision, "DENY");
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" }, null), permission).reasonCode, "WORKSPACE_CONTEXT_REQUIRED");
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "manager", source: "system_bootstrap" }), permission).role, "manager");
  assert.equal(getPermissionPolicyRule("unknown", permission), null);
});

test("P1.5-A2 grants registry administration only to explicit workspace authorities", () => {
  const permissions = ["student.registry.manage", "academic.registry.manage"] as const;
  for (const permission of permissions) {
    const metadata = PERMISSION_CATALOG.find((entry) => entry.name === permission);
    assert.deepEqual(metadata, {
      name: permission,
      domain: permission.startsWith("student.") ? "student" : "academic",
      riskLevel: "high",
      scopeKind: "workspace",
      implementationStatus: "IMPLEMENT_NOW",
      auditRequired: true,
      freshAuthRequired: false,
      confirmationRequired: true,
    });
    const owner = context({ state: "ACTIVE", source: "system_bootstrap" }, { state: "MISSING" });
    const superManager = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" });
    assert.equal(resolveActorPermission(owner, permission).decision, "ALLOW");
    assert.equal(resolveActorPermission(superManager, permission).decision, "ALLOW");
    for (const role of ["manager", "teacher", "normal", "viewer", "print_account"] as const) {
      const candidate = context({ state: "NOT_OWNER" }, { state: "ACTIVE", role, source: "system_bootstrap" });
      assert.equal(resolveActorPermission(candidate, permission).decision, "DENY", `${role} must not receive ${permission}`);
    }
    assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "MISSING" }, "other-workspace"), permission).decision, "DENY");
    assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "INACTIVE" }, FIXTURE_WORKSPACE), permission).decision, "DENY");
    assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" }, null), permission).reasonCode, "WORKSPACE_CONTEXT_REQUIRED");
    assert.equal(getPermissionPolicyRule("unknown", permission), null);
  }
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" }), "grade.write").decision, "DENY");
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" }), "attendance.write").decision, "DENY");
  assert.equal(resolveActorPermission(context({ state: "NOT_OWNER" }, { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" }), "record.write").decision, "DENY");
});

test("P1.5-B static policy is canonical-context only and has no legacy authority fallback", () => {
  assert.equal(getPermissionPolicyRule("teacher", "grade.write")?.granted, true);
  assert.equal(getPermissionPolicyRule("teacher", "grade.approve")?.granted, false);
  assert.equal(getPermissionPolicyRule("admin", "grade.write"), null);

  const source = readFileSync(fileURLToPath(new URL("../../src/authz/permissionResolver.ts", import.meta.url)), "utf8");
  for (const forbidden of ["users.role", "users.globalRole", "workspace_members", "workspaceMembers", "currentRole", "operationMode"]) {
    assert.equal(source.includes(forbidden), false, `resolver must not reference ${forbidden}`);
  }
});

test("P1.5-C parses only versioned canonical teacher assignment documents", () => {
  const valid = parseCanonicalTeacherAssignment(assignmentDocument());
  assert.equal(valid.state, "VALID");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ schemaVersion: 2 })).state, "MALFORMED");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ target: { type: "unknown", id: "x" } })).state, "MALFORMED");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ target: { type: "student", studentId: " " } })).state, "MALFORMED");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ target: { type: "class_subject", classId: "class-a" } })).state, "MALFORMED");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ validFrom: 200, validUntil: 100 })).state, "MALFORMED");
  assert.equal(parseCanonicalTeacherAssignment(assignmentDocument({ freeTextScope: "Class A" })).state, "MALFORMED");
  assert.deepEqual(parseAssignedScopeTarget({ type: "student", studentId: "student-a" }), { type: "student", studentId: "student-a" });
  assert.equal(parseAssignedScopeTarget({ type: "student", studentId: "student-a", name: "Student" }), null);
});

test("P1.5-C repository queries only the canonical nested teacherAssignments path", async () => {
  const runner = new MemoryTransactionRunner({
    [`workspaces/${FIXTURE_WORKSPACE}/teacherAssignments/assignment-a`]: assignmentDocument(),
  });
  const rows = await runner.run(async (transaction) => (
    createTeacherAssignmentRepository(transaction).listForTeacher(FIXTURE_WORKSPACE, fixtureActor().uid)
  ));
  assert.equal(rows.length, 1);
  assert.deepEqual(runner.reads, [`workspaces/${FIXTURE_WORKSPACE}/teacherAssignments?teacherUid==${fixtureActor().uid}`]);
  assert.deepEqual(runner.writes, []);
});

test("P1.5-C allows only an active exact direct student assignment", async () => {
  const allowed = await resolveTeacherAssignedScope(
    teacherContext(),
    FIXTURE_WORKSPACE,
    { type: "student", studentId: "student-a" },
    assignmentDependencies([assignmentDocument()]),
  );
  assert.deepEqual(allowed, { decision: "SCOPE_ALLOWED", reasonCode: "ASSIGNED_SCOPE_ALLOWED" });
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, { type: "student", studentId: "student-b" }, assignmentDependencies([assignmentDocument()]),
  )).reasonCode, "ASSIGNED_SCOPE_TARGET_MISMATCH");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), "other-workspace", { type: "student", studentId: "student-a" }, assignmentDependencies([assignmentDocument()]),
  )).reasonCode, "ASSIGNED_SCOPE_CONTEXT_INVALID");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, { type: "student", studentId: "student-a" }, assignmentDependencies([assignmentDocument({ teacherUid: "teacher-b" })]),
  )).reasonCode, "ASSIGNED_SCOPE_CONTEXT_INVALID");
});

test("P1.5-C denies inactive missing malformed and out-of-period assignments", async () => {
  const target = { type: "student", studentId: "student-a" };
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([]))).reasonCode, "ASSIGNED_SCOPE_ASSIGNMENT_MISSING");
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument({ status: "inactive" })]))).reasonCode, "ASSIGNED_SCOPE_ASSIGNMENT_INACTIVE");
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument({ schemaVersion: 9 })]))).reasonCode, "ASSIGNED_SCOPE_ASSIGNMENT_MALFORMED");
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument({ validFrom: 101 })], 100))).reasonCode, "ASSIGNED_SCOPE_ASSIGNMENT_OUTSIDE_VALIDITY");
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument({ validUntil: 99 })], 100))).reasonCode, "ASSIGNED_SCOPE_ASSIGNMENT_OUTSIDE_VALIDITY");
  assert.equal((await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument({ validFrom: 100, validUntil: 100 })], 100))).decision, "SCOPE_ALLOWED");
});

test("P1.5-C requires active canonical teacher membership before assignments matter", async () => {
  const target = { type: "student", studentId: "student-a" };
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext({ state: "INACTIVE" }), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument()]),
  )).reasonCode, "ASSIGNED_SCOPE_MEMBERSHIP_REQUIRED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext({ state: "ACTIVE", role: "normal", source: "system_bootstrap" }), FIXTURE_WORKSPACE, target, assignmentDependencies([assignmentDocument()]),
  )).reasonCode, "ASSIGNED_SCOPE_ROLE_REQUIRED");
});

test("P1.5-C keeps relationship-dependent target transitions unverifiable", async () => {
  const target = { type: "student", studentId: "student-a" };
  const classAssignment = assignmentDocument({ target: { type: "class", classId: "class-a" } });
  assert.deepEqual(await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, assignmentDependencies([classAssignment]),
  ), { decision: "SCOPE_UNVERIFIABLE", reasonCode: "ASSIGNED_SCOPE_RELATIONSHIP_UNVERIFIABLE" });
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, { type: "class", classId: "class-a" }, assignmentDependencies([classAssignment]),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, { type: "subject", subjectId: "subject-a" }, assignmentDependencies([
      assignmentDocument({ target: { type: "subject", subjectId: "subject-a" } }),
    ]),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, { type: "class_subject", classId: "class-a", subjectId: "subject-b" }, assignmentDependencies([
      assignmentDocument({ target: { type: "class_subject", classId: "class-a", subjectId: "subject-a" } }),
    ]),
  )).reasonCode, "ASSIGNED_SCOPE_RELATIONSHIP_UNVERIFIABLE");
});

test("P1.5-C composes permission and scope without rescuing deny or deferred permissions", async () => {
  const target = { type: "student", studentId: "student-a" };
  const dependencies = assignmentDependencies([assignmentDocument(), assignmentDocument()]);
  const teacherAllowed = await resolvePermissionWithAssignedScope(teacherContext(), "grade.write", target, dependencies);
  assert.equal(teacherAllowed.decision, "ALLOW");
  assert.equal(teacherAllowed.scope?.decision, "SCOPE_ALLOWED");
  assert.equal((await resolvePermissionWithAssignedScope(teacherContext(), "grade.write", { type: "student", studentId: "student-b" }, dependencies)).decision, "DENY");
  const normal = teacherContext({ state: "ACTIVE", role: "normal", source: "system_bootstrap" });
  assert.equal((await resolvePermissionWithAssignedScope(normal, "grade.write", target, dependencies)).decision, "DENY");
  const viewer = teacherContext({ state: "ACTIVE", role: "viewer", source: "system_bootstrap" });
  assert.equal((await resolvePermissionWithAssignedScope(viewer, "grade.read", target, dependencies)).decision, "DENY");
  const owner = context({ state: "ACTIVE", source: "system_bootstrap" }, { state: "MISSING" });
  assert.equal((await resolvePermissionWithAssignedScope(owner, "grade.read", target, dependencies)).decision, "DENY");
  assert.equal((await resolvePermissionWithAssignedScope(teacherContext(), "print.execute", target, dependencies)).permission.decision, "DEFERRED");
});

test("P1.5-C source excludes legacy authority client state and operation-mode inputs", () => {
  const source = [
    readFileSync(fileURLToPath(new URL("../../src/authz/assignmentScopeResolver.ts", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../../src/authz/scopeAuthorization.ts", import.meta.url)), "utf8"),
  ].join("\n");
  for (const forbidden of ["users.role", "users.globalRole", "workspace_members", "workspaceMembers", "currentRole", "operationMode", "localStorage"]) {
    assert.equal(source.includes(forbidden), false, `scope resolver must not reference ${forbidden}`);
  }
});

test("P1.5-C1 parses only canonical workspace-bound student enrollment", () => {
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument()).state, "VALID");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ version: 2 })).state, "VALID");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ version: undefined })).state, "MALFORMED");
  for (const version of [0, -1, 1.5, "1", null, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ version })).state, "MALFORMED");
  }
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ schemaVersion: 2 })).state, "MALFORMED");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ classId: "Class A" })).state, "MALFORMED");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ subjectIds: ["subject-a", "subject-a"] })).state, "MALFORMED");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ subjectIds: "subject-a" })).state, "MALFORMED");
  assert.equal(parseCanonicalStudentEnrollment(enrollmentDocument({ displayName: "Student A" })).state, "MALFORMED");
});

test("P1.5-C1 repository queries only canonical nested studentEnrollments", async () => {
  const runner = new MemoryTransactionRunner({
    [`workspaces/${FIXTURE_WORKSPACE}/studentEnrollments/enrollment-a`]: enrollmentDocument(),
  });
  const rows = await runner.run(async (transaction) => (
    createStudentEnrollmentRepository(transaction).listForStudent(FIXTURE_WORKSPACE, "student-a")
  ));
  assert.equal(rows.length, 1);
  assert.deepEqual(runner.reads, [`workspaces/${FIXTURE_WORKSPACE}/studentEnrollments?studentId==student-a`]);
  assert.deepEqual(runner.writes, []);
});

test("P1.5-C1 resolves canonical student class and subject relationships", async () => {
  const dependencies = relationshipDependencies([enrollmentDocument()]);
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", classId: "class-a",
  }, dependencies.relationships, dependencies.registries)).decision, "RELATIONSHIP_MATCH");
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", subjectId: "subject-a",
  }, dependencies.relationships, dependencies.registries)).decision, "RELATIONSHIP_MATCH");
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", classId: "class-a", subjectId: "subject-a",
  }, dependencies.relationships, dependencies.registries)).decision, "RELATIONSHIP_MATCH");
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", classId: "class-b",
  }, dependencies.relationships, dependencies.registries)).decision, "RELATIONSHIP_NO_MATCH");
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", subjectId: "subject-b",
  }, dependencies.relationships, dependencies.registries)).decision, "RELATIONSHIP_NO_MATCH");
});

test("P1.5-C1 denies malformed inactive cross-workspace and display-only relationships", async () => {
  const request = { workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", classId: "class-a" };
  const missing = relationshipDependencies([]);
  assert.equal((await resolveStudentEnrollmentRelationship(request, missing.relationships, missing.registries)).reasonCode, "RELATIONSHIP_MISSING");
  const wrongWorkspace = relationshipDependencies([
    enrollmentDocument({ workspaceId: "other-workspace" }),
  ]);
  assert.equal((await resolveStudentEnrollmentRelationship(request, wrongWorkspace.relationships, wrongWorkspace.registries)).reasonCode, "RELATIONSHIP_WORKSPACE_MISMATCH");
  const inactive = relationshipDependencies([
    enrollmentDocument({ status: "inactive" }),
  ]);
  assert.equal((await resolveStudentEnrollmentRelationship(request, inactive.relationships, inactive.registries)).reasonCode, "RELATIONSHIP_INACTIVE");
  const malformed = relationshipDependencies([
    enrollmentDocument({ subjectIds: "Math" }),
  ]);
  assert.equal((await resolveStudentEnrollmentRelationship(request, malformed.relationships, malformed.registries)).decision, "RELATIONSHIP_UNVERIFIABLE");
  const valid = relationshipDependencies([enrollmentDocument()]);
  assert.equal((await resolveStudentEnrollmentRelationship({
    workspaceId: FIXTURE_WORKSPACE, studentId: "student-a", classId: " ",
  }, valid.relationships, valid.registries)).reasonCode, "RELATIONSHIP_INPUT_INVALID");
});

test("P1.5-C1 enables class subject and class_subject assignments only with both canonical proofs", async () => {
  const target = { type: "student", studentId: "student-a" };
  const enrollment = relationshipDependencies([enrollmentDocument()]);
  const classScope = await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, {
    ...assignmentDependencies([assignmentDocument({ target: { type: "class", classId: "class-a" } })]),
    ...enrollment,
  });
  assert.equal(classScope.decision, "SCOPE_ALLOWED");
  const subjectScope = await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, {
    ...assignmentDependencies([assignmentDocument({ target: { type: "subject", subjectId: "subject-a" } })]),
    ...enrollment,
  });
  assert.equal(subjectScope.decision, "SCOPE_ALLOWED");
  const bothScope = await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, {
    ...assignmentDependencies([assignmentDocument({ target: { type: "class_subject", classId: "class-a", subjectId: "subject-a" } })]),
    ...enrollment,
  });
  assert.equal(bothScope.decision, "SCOPE_ALLOWED");
  const onlyClass = await resolveTeacherAssignedScope(teacherContext(), FIXTURE_WORKSPACE, target, {
    ...assignmentDependencies([assignmentDocument({ target: { type: "class_subject", classId: "class-a", subjectId: "subject-b" } })]),
    ...enrollment,
  });
  assert.equal(onlyClass.decision, "SCOPE_DENIED");
  assert.equal((await resolvePermissionWithAssignedScope(teacherContext(), "grade.write", target, {
    ...assignmentDependencies([assignmentDocument({ target: { type: "class", classId: "class-a" } })]),
    ...enrollment,
  })).decision, "ALLOW");
});

test("P1.5-C1 relationship data cannot rescue a denied permission or inactive prerequisite", async () => {
  const target = { type: "student", studentId: "student-a" };
  const dependencies = {
    ...assignmentDependencies([assignmentDocument({ target: { type: "class", classId: "class-a" } })]),
    ...relationshipDependencies([enrollmentDocument()]),
  };
  assert.equal((await resolvePermissionWithAssignedScope(
    teacherContext({ state: "ACTIVE", role: "normal", source: "system_bootstrap" }), "grade.write", target, dependencies,
  )).decision, "DENY");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext({ state: "INACTIVE" }), FIXTURE_WORKSPACE, target, dependencies,
  )).decision, "SCOPE_DENIED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, {
      ...assignmentDependencies([assignmentDocument({ target: { type: "class", classId: "class-a" }, status: "inactive" })]),
      ...relationshipDependencies([enrollmentDocument()]),
    },
  )).decision, "SCOPE_DENIED");
});

test("P1.5-C1 source excludes client legacy authority and mode inputs", () => {
  const source = [
    readFileSync(fileURLToPath(new URL("../../src/authz/relationshipScopeResolver.ts", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../../src/relationships/studentEnrollmentRepository.ts", import.meta.url)), "utf8"),
  ].join("\n");
  for (const forbidden of ["users.role", "users.globalRole", "workspace_members", "workspaceMembers", "currentRole", "operationMode", "localStorage", "className", "subjectName"]) {
    assert.equal(source.includes(forbidden), false, `relationship resolver must not reference ${forbidden}`);
  }
});

test("P1.5-C2B parses strict canonical student class and subject registries", () => {
  assert.equal(parseStudentRegistryDocument(studentRegistryDocument(), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
  }).state, "VALID");
  assert.equal(parseClassRegistryDocument(classRegistryDocument(), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "class-a",
  }).state, "VALID");
  assert.equal(parseSubjectRegistryDocument(subjectRegistryDocument(), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "subject-a",
  }).state, "VALID");
  assert.equal(parseStudentRegistryDocument(studentRegistryDocument({ version: 2 }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
  }).state, "VALID");

  assert.equal(parseStudentRegistryDocument(studentRegistryDocument({ status: "disabled" }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
  }).state, "MALFORMED");
  assert.equal(parseStudentRegistryDocument(studentRegistryDocument({ externalIds: {} }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
  }).state, "MALFORMED");
  assert.equal(parseStudentRegistryDocument(studentRegistryDocument({ workspaceId: "other-workspace" }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
  }).state, "MALFORMED");
  assert.equal(parseClassRegistryDocument(classRegistryDocument({ displayName: "" }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "class-a",
  }).state, "MALFORMED");
  assert.equal(parseSubjectRegistryDocument(subjectRegistryDocument({ subjectId: "subject a" }), {
    workspaceId: FIXTURE_WORKSPACE, entityId: "subject-a",
  }).state, "MALFORMED");
  for (const version of [undefined, 0, -1, 1.5, "1", null, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseStudentRegistryDocument(studentRegistryDocument({ version }), {
      workspaceId: FIXTURE_WORKSPACE, entityId: "student-a",
    }).state, "MALFORMED");
    assert.equal(parseClassRegistryDocument(classRegistryDocument({ version }), {
      workspaceId: FIXTURE_WORKSPACE, entityId: "class-a",
    }).state, "MALFORMED");
    assert.equal(parseSubjectRegistryDocument(subjectRegistryDocument({ version }), {
      workspaceId: FIXTURE_WORKSPACE, entityId: "subject-a",
    }).state, "MALFORMED");
  }
});

test("P1.5-C2B1 canonical entity version is a positive safe integer only", () => {
  assert.equal(isCanonicalEntityVersion(1), true);
  assert.equal(isCanonicalEntityVersion(2), true);
  for (const value of [0, -1, 1.5, "1", null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isCanonicalEntityVersion(value), false);
  }
});

test("P1.5-C2B registry repository performs exact read-only canonical lookups", async () => {
  const runner = new MemoryTransactionRunner(registryFixtures());
  const result = await runner.run(async (transaction) => {
    const registries = createEntityRegistryRepository(transaction);
    return Promise.all([
      registries.getStudent(FIXTURE_WORKSPACE, "student-a"),
      registries.getClass(FIXTURE_WORKSPACE, "class-a"),
      registries.getSubject(FIXTURE_WORKSPACE, "subject-a"),
      registries.getSubject(FIXTURE_WORKSPACE, "missing-subject"),
    ]);
  });
  assert.deepEqual(result.map((entry) => entry.state), ["VALID", "VALID", "VALID", "MISSING"]);
  assert.deepEqual(runner.reads, [
    `workspaces/${FIXTURE_WORKSPACE}/studentRegistry/student-a`,
    `workspaces/${FIXTURE_WORKSPACE}/classRegistry/class-a`,
    `workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-a`,
    `workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/missing-subject`,
  ]);
  assert.deepEqual(runner.writes, []);
});

test("P1.5-C2B enrollment references require active same-workspace registries", async () => {
  async function validate(documents: Record<string, Record<string, unknown>>, subjectIds: readonly string[] = ["subject-a"]) {
    const runner = new MemoryTransactionRunner(documents);
    return runner.run((transaction) => validateEnrollmentReferences({
      workspaceId: FIXTURE_WORKSPACE,
      studentId: "student-a",
      classId: "class-a",
      subjectIds,
    }, createEntityRegistryRepository(transaction)));
  }

  assert.equal((await validate(registryFixtures())).decision, "REFERENCES_VALID");
  assert.equal((await validate(registryFixtures(), [])).decision, "REFERENCES_VALID");
  assert.equal((await validate(registryFixtures(), ["subject-a", "subject-b"])).decision, "REFERENCES_VALID");
  assert.equal((await validate(registryFixtures({ student: { status: "inactive" } }))).reasonCode, "STUDENT_INACTIVE");
  assert.equal((await validate(registryFixtures({ class: { status: "inactive" } }))).reasonCode, "CLASS_INACTIVE");
  assert.equal((await validate(registryFixtures({ subjectA: { status: "inactive" } }))).reasonCode, "SUBJECT_INACTIVE");
  assert.equal((await validate(registryFixtures({ subjectA: { workspaceId: "other-workspace" } }))).decision, "REFERENCES_UNVERIFIABLE");
  assert.equal((await validate(registryFixtures(), ["subject-a", "subject-a"])).reasonCode, "INVALID_INPUT");
  assert.equal((await validate({})).reasonCode, "STUDENT_MISSING");
});

test("P1.5-C2B registry source has no legacy fallback authority or write APIs", () => {
  const source = [
    readFileSync(fileURLToPath(new URL("../../src/registries/entityRegistryRepository.ts", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../../src/relationships/enrollmentReferentialValidator.ts", import.meta.url)), "utf8"),
  ].join("\n");
  for (const forbidden of ["users.role", "users.globalRole", "workspace_members", "workspaceMembers", "localStorage", "setDoc", "addDoc", "updateDoc", "deleteDoc", "operationMode"]) {
    assert.equal(source.includes(forbidden), false, `registry code must not reference ${forbidden}`);
  }
});

test("P1.5-C2C direct student scope requires an active exact canonical registry", async () => {
  const target = { type: "student", studentId: "student-a" };
  const assignment = assignmentDocument();
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment]),
  )).decision, "SCOPE_ALLOWED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [], {}),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [], registryFixtures({ student: { status: "inactive" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [], registryFixtures({ student: { workspaceId: "other-workspace" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal(
    (await resolveTeacherAssignedScope(
      teacherContext(), FIXTURE_WORKSPACE, { type: "student", studentId: "student-b" }, canonicalScopeDependencies([assignment]),
    )).reasonCode,
    "ASSIGNED_SCOPE_TARGET_MISMATCH",
  );
});

test("P1.5-C2C class scope requires a complete active canonical enrollment graph", async () => {
  const target = { type: "student", studentId: "student-a" };
  const assignment = assignmentDocument({ target: { type: "class", classId: "class-a" } });
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument()]),
  )).decision, "SCOPE_ALLOWED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument({ subjectIds: [] })]),
  )).decision, "SCOPE_ALLOWED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment]),
  )).decision, "SCOPE_DENIED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument({ status: "inactive" })]),
  )).decision, "SCOPE_DENIED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument()], registryFixtures({ student: { status: "inactive" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument()], registryFixtures({ class: { status: "inactive" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal(
    (await resolveTeacherAssignedScope(
      teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignment], [enrollmentDocument({ classId: "class-b" })]),
    )).reasonCode,
    "ASSIGNED_SCOPE_TARGET_MISMATCH",
  );
});

test("P1.5-C2C subject and class_subject scope require exact validated subject membership", async () => {
  const target = { type: "student", studentId: "student-a" };
  const enrollment = [enrollmentDocument({ subjectIds: ["subject-a", "subject-b"] })];
  const subject = assignmentDocument({ target: { type: "subject", subjectId: "subject-a" } });
  const both = assignmentDocument({ target: { type: "class_subject", classId: "class-a", subjectId: "subject-a" } });
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([subject], enrollment),
  )).decision, "SCOPE_ALLOWED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([both], enrollment),
  )).decision, "SCOPE_ALLOWED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([subject], enrollment, registryFixtures({ subjectA: { status: "inactive" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([both], enrollment, registryFixtures({ subjectB: { status: "inactive" } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal(
    (await resolveTeacherAssignedScope(
      teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([
        assignmentDocument({ target: { type: "class_subject", classId: "class-a", subjectId: "subject-c" } }),
      ], enrollment),
    )).reasonCode,
    "ASSIGNED_SCOPE_TARGET_MISMATCH",
  );
});

test("P1.5-C2C complete registry proof cannot rescue denied deferred or inactive prerequisites", async () => {
  const target = { type: "student", studentId: "student-a" };
  const dependencies = canonicalScopeDependencies([assignmentDocument()], [enrollmentDocument()]);
  const normal = teacherContext({ state: "ACTIVE", role: "normal", source: "system_bootstrap" });
  const viewer = teacherContext({ state: "ACTIVE", role: "viewer", source: "system_bootstrap" });
  assert.equal((await resolvePermissionWithAssignedScope(normal, "grade.write", target, dependencies)).decision, "DENY");
  assert.equal((await resolvePermissionWithAssignedScope(viewer, "grade.read", target, dependencies)).decision, "DENY");
  assert.equal((await resolvePermissionWithAssignedScope(teacherContext(), "print.execute", target, dependencies)).permission.decision, "DEFERRED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext({ state: "INACTIVE" }), FIXTURE_WORKSPACE, target, dependencies,
  )).decision, "SCOPE_DENIED");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([assignmentDocument({ status: "inactive" })]),
  )).decision, "SCOPE_DENIED");
});

test("P1.5-C2B1 missing version in any canonical graph document fails closed", async () => {
  const target = { type: "student", studentId: "student-a" };
  const direct = assignmentDocument();
  const classAssignment = assignmentDocument({ target: { type: "class", classId: "class-a" } });
  const subjectAssignment = assignmentDocument({ target: { type: "subject", subjectId: "subject-a" } });
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([direct], [], registryFixtures({ student: { version: undefined } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([classAssignment], [enrollmentDocument()], registryFixtures({ class: { version: undefined } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([subjectAssignment], [enrollmentDocument()], registryFixtures({ subjectA: { version: undefined } })),
  )).decision, "SCOPE_UNVERIFIABLE");
  assert.equal((await resolveTeacherAssignedScope(
    teacherContext(), FIXTURE_WORKSPACE, target, canonicalScopeDependencies([classAssignment], [enrollmentDocument({ version: undefined })]),
  )).decision, "SCOPE_UNVERIFIABLE");
});

test("P1.5-C2C integration source uses only canonical injected registry inputs", () => {
  const source = [
    readFileSync(fileURLToPath(new URL("../../src/authz/assignmentScopeResolver.ts", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../../src/authz/relationshipScopeResolver.ts", import.meta.url)), "utf8"),
  ].join("\n");
  for (const forbidden of ["users.role", "users.globalRole", "workspace_members", "workspaceMembers", "localStorage", "operationMode", "people_fallback", "studentRosterService", "workspaceDataService", "className", "subjectName"]) {
    assert.equal(source.includes(forbidden), false, `C2C integration must not reference ${forbidden}`);
  }
});
