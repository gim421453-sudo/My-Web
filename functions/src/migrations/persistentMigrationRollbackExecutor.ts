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
import type { MigrationPlan } from "./migrationDryRunOrchestrator.js";
import { parsePersistentMigrationManifest, parsePersistentMigrationOperation } from "./persistentMigrationManifestContract.js";
import { persistentManifestOperationPath, persistentManifestPath, persistentOperationId } from "./persistentMigrationManifestRepository.js";

type EntityType = "student" | "class" | "subject" | "enrollment";
type Decision = "ROLLBACK_ALLOWED" | "ROLLBACK_ALREADY_ABSENT" | "ROLLBACK_NOT_OWNED" | "ROLLBACK_CONFLICT";
const CONFIG: Readonly<Record<EntityType, Readonly<{ collection: string; permission: PermissionName }>>> = Object.freeze({
  student: Object.freeze({ collection: "studentRegistry", permission: "student.registry.manage" }),
  class: Object.freeze({ collection: "classRegistry", permission: "academic.registry.manage" }),
  subject: Object.freeze({ collection: "subjectRegistry", permission: "academic.registry.manage" }),
  enrollment: Object.freeze({ collection: "studentEnrollments", permission: "student.enrollment.manage" }),
});

function current(entityType: EntityType, workspaceId: string, targetId: string, value: unknown) {
  const parsed = entityType === "student" ? parseStudentRegistryDocument(value, { workspaceId, entityId: targetId })
    : entityType === "class" ? parseClassRegistryDocument(value, { workspaceId, entityId: targetId })
      : entityType === "subject" ? parseSubjectRegistryDocument(value, { workspaceId, entityId: targetId })
        : parseCanonicalStudentEnrollment(value);
  if (parsed.state === "MALFORMED") return null;
  const entity = "entity" in parsed ? parsed.entity : parsed.enrollment;
  const { createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...semantic } = entity;
  return Object.freeze({ source: entity.source, version: entity.version, fingerprint: sha256Canonical(semantic) });
}

async function authorize(actor: VerifiedActor, workspaceId: string, entityType: EntityType, runner: TrustedTransactionRunner): Promise<void> {
  await runner.run(async (transaction) => {
    try {
      const repositories = createCanonicalAuthorityRepositories(transaction);
      const context = await repositories.systemOwners.buildWorkspaceAuthorizationContext(actor, "migration.rollback", workspaceId);
      requirePermission(context, CONFIG[entityType].permission);
      requireActiveWorkspace(await repositories.workspaces.get(workspaceId, actor.request.requestId), workspaceId, actor.request.requestId);
    } catch (error) {
      if (error instanceof AuthorizationError) throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", actor.request.requestId);
      throw error;
    }
  });
}

// Backend-internal only. Ownership is reconstructed exclusively from the exact
// persistent manifest operation; source=migration is never enough to delete.
export function createPersistentMigrationRollbackExecutor(dependencies: Readonly<{ runner: TrustedTransactionRunner; beforeCommit?: (operationKey: string) => void; beforeRollbackOperation?: (operationKey: string) => void; afterRollbackCommitted?: (operationKey: string) => void; beforeFinalizeRolledBack?: () => void }>) {
  const rollback = async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, operationKey: string): Promise<Decision> => {
    const planned = plan.operations.find((operation) => operation.operationKey === operationKey);
    if (!planned) throw new OperationError("INVALID_ARGUMENT", actor.request.requestId);
    await authorize(actor, workspaceId, planned.entityType, dependencies.runner);
    return dependencies.runner.run(async (transaction) => {
      const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
      const op = await transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operationKey));
      const targetId = planned.destination.split("/")[1]!;
      const targetPath = ["workspaces", workspaceId, CONFIG[planned.entityType].collection, targetId] as const;
      const target = await transaction.get(targetPath);
      if (!root.exists || parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID") throw new OperationError("FAILED_PRECONDITION", "migration-manifest-required");
      if (!op.exists || parsePersistentMigrationOperation(op.data, { workspaceId, planId: plan.planId, operationIdHash: persistentOperationId(plan.planId, operationKey) }).state !== "VALID") throw new OperationError("FAILED_PRECONDITION", "migration-manifest-required");
      if (op.data?.entityType !== planned.entityType || op.data?.targetId !== targetId || op.data?.sourceFingerprint !== planned.sourceFingerprint || op.data?.status === "ALREADY_CANONICAL" || op.data?.createdByPlan !== true) return "ROLLBACK_NOT_OWNED";
      if (op.data?.status === "ROLLED_BACK") return "ROLLBACK_ALREADY_ABSENT";
      if (!target.exists) {
        transaction.update(persistentManifestOperationPath(workspaceId, plan.planId, operationKey), { status: "ROLLED_BACK", rollbackStatus: "ROLLED_BACK", updatedAt: transaction.now });
        return "ROLLBACK_ALREADY_ABSENT";
      }
      const actual = current(planned.entityType, workspaceId, targetId, target.data);
      if (!actual || actual.source !== "migration" || actual.version !== op.data?.versionAfter || actual.fingerprint !== op.data?.afterFingerprint) {
        transaction.update(persistentManifestOperationPath(workspaceId, plan.planId, operationKey), { status: "ROLLBACK_CONFLICT", rollbackStatus: "ROLLBACK_CONFLICT", updatedAt: transaction.now });
        return "ROLLBACK_CONFLICT";
      }
      dependencies.beforeCommit?.(operationKey);
      transaction.delete(targetPath);
      transaction.update(persistentManifestOperationPath(workspaceId, plan.planId, operationKey), { status: "ROLLED_BACK", rollbackStatus: "ROLLED_BACK", updatedAt: transaction.now });
      return "ROLLBACK_ALLOWED";
    });
  };
  const acquireRollback = async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, rollbackRunId: string) => dependencies.runner.run(async (transaction) => {
    const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
    if (!root.exists || parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID" || !["APPLIED", "ROLLING_BACK", "ROLLED_BACK"].includes(root.data?.status as string)) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
    if (root.data?.status === "ROLLED_BACK") return Object.freeze({ alreadyFinalized: true as const });
    if (root.data?.activeRunId !== null && root.data?.activeRunId !== rollbackRunId) throw new OperationError("CONFLICT", "migration-rollback-owner");
    if (root.data?.activeRunId !== rollbackRunId || root.data?.status !== "ROLLING_BACK") transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "ROLLING_BACK", activeRunId: rollbackRunId, version: (root.data?.version as number) + 1, updatedAt: transaction.now, updatedBy: actor.uid });
    return Object.freeze({ alreadyFinalized: false as const });
  });
  const checkpointRollback = async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, rollbackRunId: string) => dependencies.runner.run(async (transaction) => {
    const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
    if (!root.exists || root.data?.status !== "ROLLING_BACK" || root.data?.activeRunId !== rollbackRunId) throw new OperationError("CONFLICT", "migration-rollback-owner");
    transaction.update(persistentManifestPath(workspaceId, plan.planId), { activeRunId: null, version: (root.data?.version as number) + 1, updatedAt: transaction.now, updatedBy: actor.uid });
  });
  const rollbackPlan = async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, rollbackRunId = "rollback-default") => {
    if ((await acquireRollback(actor, plan, workspaceId, rollbackRunId)).alreadyFinalized) return Object.freeze({ state: "ROLLED_BACK" as const });
    const order = [...plan.operations].sort((left, right) => {
      const phase = (type: EntityType) => type === "enrollment" ? 1 : type === "subject" ? 2 : type === "class" ? 3 : 4;
      return phase(left.entityType) - phase(right.entityType) || left.operationKey.localeCompare(right.operationKey);
    });
    for (const operation of order) {
      dependencies.beforeRollbackOperation?.(operation.operationKey);
      await acquireRollback(actor, plan, workspaceId, rollbackRunId);
      const decision = await rollback(actor, plan, workspaceId, operation.operationKey);
      if (decision === "ROLLBACK_CONFLICT") {
        await dependencies.runner.run(async (transaction) => {
          const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
          if (root.exists) transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "ROLLBACK_CONFLICT", activeRunId: null, updatedAt: transaction.now, updatedBy: actor.uid });
        });
        return Object.freeze({ state: "ROLLBACK_CONFLICT" as const });
      }
      await checkpointRollback(actor, plan, workspaceId, rollbackRunId);
      if (decision === "ROLLBACK_ALLOWED") dependencies.afterRollbackCommitted?.(operation.operationKey);
    }
    dependencies.beforeFinalizeRolledBack?.();
    await acquireRollback(actor, plan, workspaceId, rollbackRunId);
    await dependencies.runner.run(async (transaction) => {
      const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
      const operations = await Promise.all(plan.operations.map((operation) => transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey))));
      if (!root.exists || root.data?.status !== "ROLLING_BACK" || root.data?.activeRunId !== rollbackRunId || !operations.every((snapshot) => snapshot.exists && (snapshot.data?.status === "ROLLED_BACK" || snapshot.data?.createdByPlan === false))) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
      transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "ROLLED_BACK", activeRunId: null, updatedAt: transaction.now, updatedBy: actor.uid });
    });
    return Object.freeze({ state: "ROLLED_BACK" as const });
  };
  return Object.freeze({ rollback, rollbackPlan });
}
