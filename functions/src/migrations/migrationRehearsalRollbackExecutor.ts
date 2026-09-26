import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requirePermission } from "../authz/permissionResolver.js";
import type { PermissionName } from "../authz/permissions.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import { sha256Canonical } from "../operations/operationContract.js";
import { createCanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import type { TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import { parseClassRegistryDocument } from "../registries/classRegistryContract.js";
import { parseStudentRegistryDocument } from "../registries/studentRegistryContract.js";
import { parseSubjectRegistryDocument } from "../registries/subjectRegistryContract.js";
import { parseCanonicalStudentEnrollment } from "../relationships/studentEnrollmentContract.js";
import type { MigrationJournalEntry } from "./migrationRehearsalJournal.js";
import { evaluateRollback, type RollbackDecision } from "./migrationRollbackPolicy.js";

const CONFIG = Object.freeze({
  student: Object.freeze({ collection: "studentRegistry", permission: "student.registry.manage" as PermissionName }),
  class: Object.freeze({ collection: "classRegistry", permission: "academic.registry.manage" as PermissionName }),
  subject: Object.freeze({ collection: "subjectRegistry", permission: "academic.registry.manage" as PermissionName }),
  enrollment: Object.freeze({ collection: "studentEnrollments", permission: "student.enrollment.manage" as PermissionName }),
});

function current(entry: MigrationJournalEntry, data: unknown) {
  const parsed = entry.entityType === "student" ? parseStudentRegistryDocument(data, { workspaceId: entry.workspaceId, entityId: entry.targetId })
    : entry.entityType === "class" ? parseClassRegistryDocument(data, { workspaceId: entry.workspaceId, entityId: entry.targetId })
      : entry.entityType === "subject" ? parseSubjectRegistryDocument(data, { workspaceId: entry.workspaceId, entityId: entry.targetId })
        : parseCanonicalStudentEnrollment(data);
  if (parsed.state === "MALFORMED") return Object.freeze({ exists: true, source: null, version: null, fingerprint: null });
  const entity = "entity" in parsed ? parsed.entity : parsed.enrollment;
  const { createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...semantic } = entity;
  return Object.freeze({ exists: true, source: entity.source, version: entity.version, fingerprint: sha256Canonical(semantic) });
}

async function authorize(actor: VerifiedActor, entry: MigrationJournalEntry, runner: TrustedTransactionRunner): Promise<void> {
  await runner.run(async (transaction) => {
    try {
      const repositories = createCanonicalAuthorityRepositories(transaction);
      const context = await repositories.systemOwners.buildWorkspaceAuthorizationContext(actor, "migration.rollback", entry.workspaceId);
      requirePermission(context, CONFIG[entry.entityType].permission);
      requireActiveWorkspace(await repositories.workspaces.get(entry.workspaceId, actor.request.requestId), entry.workspaceId, actor.request.requestId);
    } catch (error) {
      if (error instanceof AuthorizationError) throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", actor.request.requestId);
      throw error;
    }
  });
}

// Internal/test-only executor. It deletes one exact journal-proven path and has
// no default runner, public Function export, collection scan, or batch delete.
export function createMigrationRehearsalRollbackExecutor(dependencies: Readonly<{ runner: TrustedTransactionRunner }>) {
  return Object.freeze({
    rollback: async (actor: VerifiedActor, entry: MigrationJournalEntry): Promise<RollbackDecision> => {
      await authorize(actor, entry, dependencies.runner);
      return dependencies.runner.run(async (transaction) => {
        if (!entry.createdByPlan) return "ROLLBACK_NOT_OWNED";
        const config = CONFIG[entry.entityType];
        const path = ["workspaces", entry.workspaceId, config.collection, entry.targetId] as const;
        const snapshot = await transaction.get(path);
        if (!snapshot.exists) return "ROLLBACK_ALREADY_ABSENT";
        const decision = evaluateRollback(entry, current(entry, snapshot.data));
        if (decision !== "ROLLBACK_ALLOWED") return decision;
        transaction.delete(path);
        return "ROLLBACK_ALLOWED";
      });
    },
  });
}
