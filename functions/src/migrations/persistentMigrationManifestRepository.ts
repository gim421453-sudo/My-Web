import { sha256Canonical } from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import type { TrustedTransaction, TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import type { MigrationPlan } from "./migrationDryRunOrchestrator.js";
import { parsePersistentMigrationManifest, parsePersistentMigrationOperation } from "./persistentMigrationManifestContract.js";

export interface PersistentManifestOperation {
  readonly operationKey: string;
  readonly entityType: "student" | "class" | "subject" | "enrollment";
  readonly targetId: string;
  readonly sourceFingerprint: string;
  readonly plannedPayloadHash: string;
}
export interface PreparedPersistentManifestOperation {
  readonly status: string;
  readonly createdByPlan: boolean;
  readonly beforeExists: boolean;
  readonly afterFingerprint: string | null;
  readonly versionAfter: number | null;
}
export interface PersistentMigrationManifestPort {
  assertPrepared(transaction: TrustedTransaction, plan: MigrationPlan, workspaceId: string, operation: PersistentManifestOperation, migrationRunId?: string): Promise<PreparedPersistentManifestOperation>;
  markCompletion(transaction: TrustedTransaction, plan: MigrationPlan, workspaceId: string, operation: PersistentManifestOperation, completion: Readonly<{ status: "CREATED" | "ALREADY_CANONICAL"; createdByPlan: boolean; beforeExists: boolean; beforeFingerprint: string | null; afterFingerprint: string; versionAfter: 1; appliedRunId: string }>): Promise<void>;
}
export function persistentOperationId(planId: string, operationKey: string): string { return sha256Canonical({ planId, operationKey }); }
export function persistentPlanFingerprint(plan: MigrationPlan, workspaceId: string, operations: readonly PersistentManifestOperation[]): string {
  return sha256Canonical({ planVersion: plan.planVersion, planId: plan.planId, classifierVersion: plan.classifierVersion, mappingFingerprint: plan.mappingFingerprint, workspaceId, sources: [...plan.sourceFingerprintSet].sort(), operations: operations.map((operation) => ({ ...operation, operationIdHash: persistentOperationId(plan.planId, operation.operationKey) })).sort((a, b) => a.operationKey.localeCompare(b.operationKey)) });
}
export function persistentManifestPath(workspaceId: string, planId: string) { return ["workspaces", workspaceId, "migrationManifests", planId] as const; }
export function persistentManifestOperationPath(workspaceId: string, planId: string, operationKey: string) { return [...persistentManifestPath(workspaceId, planId), "operations", persistentOperationId(planId, operationKey)] as const; }
function assertWorkspace(plan: MigrationPlan, workspaceId: string): void {
  const expected = sha256Canonical({ workspaceId }).slice(0, 16);
  if (!plan.applyable || !plan.operations.length || plan.operations.some((operation) => operation.workspaceFingerprint !== expected)) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
}
export function createPersistentMigrationManifestService(runner: TrustedTransactionRunner) {
  const port: PersistentMigrationManifestPort = Object.freeze({
    assertPrepared: async (transaction: TrustedTransaction, plan: MigrationPlan, workspaceId: string, operation: PersistentManifestOperation, migrationRunId?: string) => {
      const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
      if (!root.exists || parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID" || !["PREPARED", "APPLYING", "PARTIAL", "APPLIED"].includes(root.data?.status as string)) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
      if (root.data?.status === "APPLYING" && root.data?.activeRunId !== migrationRunId) throw new OperationError("CONFLICT", "migration-run-owner");
      const op = await transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey));
      if (!op.exists || parsePersistentMigrationOperation(op.data, { workspaceId, planId: plan.planId, operationIdHash: persistentOperationId(plan.planId, operation.operationKey) }).state !== "VALID" || op.data?.plannedPayloadHash !== operation.plannedPayloadHash) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
      return Object.freeze({ status: op.data!.status as string, createdByPlan: op.data!.createdByPlan as boolean, beforeExists: op.data!.beforeExists as boolean, afterFingerprint: op.data!.afterFingerprint as string | null, versionAfter: op.data!.versionAfter as number | null });
    },
    markCompletion: async (transaction: TrustedTransaction, plan: MigrationPlan, workspaceId: string, operation: PersistentManifestOperation, completion: Readonly<{ status: "CREATED" | "ALREADY_CANONICAL"; createdByPlan: boolean; beforeExists: boolean; beforeFingerprint: string | null; afterFingerprint: string; versionAfter: 1; appliedRunId: string }>) => {
      await port.assertPrepared(transaction, plan, workspaceId, operation, completion.appliedRunId);
      transaction.update(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey), { status: completion.status, createdByPlan: completion.createdByPlan, beforeExists: completion.beforeExists, beforeFingerprint: completion.beforeFingerprint, afterFingerprint: completion.afterFingerprint, versionAfter: completion.versionAfter, appliedRunId: completion.appliedRunId, updatedAt: transaction.now });
    },
  });
  return Object.freeze({
    port,
    prepare: async (plan: MigrationPlan, workspaceId: string, actorUid: string, operations: readonly PersistentManifestOperation[]) => {
      assertWorkspace(plan, workspaceId);
      if (operations.length !== plan.operations.length || operations.some((operation) => !plan.operations.some((planned) => planned.operationKey === operation.operationKey && planned.entityType === operation.entityType && planned.sourceFingerprint === operation.sourceFingerprint && planned.destination.endsWith(`/${operation.targetId}`)))) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
      const fingerprint = persistentPlanFingerprint(plan, workspaceId, operations);
      await runner.run(async (transaction) => {
        const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
        if (!root.exists) transaction.create(persistentManifestPath(workspaceId, plan.planId), { schemaVersion: 1, version: 1, workspaceId, planId: plan.planId, planFingerprint: fingerprint, classifierVersion: plan.classifierVersion, mappingFingerprint: plan.mappingFingerprint, sourceSetFingerprint: sha256Canonical([...plan.sourceFingerprintSet].sort()), status: "PREPARING", operationCount: operations.length, createdAt: transaction.now, createdBy: actorUid, updatedAt: transaction.now, updatedBy: actorUid, activeRunId: null });
        else if (parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID" || root.data?.planFingerprint !== fingerprint) throw new OperationError("CONFLICT", "migration-manifest");
      });
      for (const operation of operations) await runner.run(async (transaction) => {
        const snapshot = await transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey));
        const data = { schemaVersion: 1, workspaceId, planId: plan.planId, operationIdHash: persistentOperationId(plan.planId, operation.operationKey), entityType: operation.entityType, targetId: operation.targetId, sourceFingerprint: operation.sourceFingerprint, plannedPayloadHash: operation.plannedPayloadHash, status: "PLANNED", createdByPlan: false, beforeExists: false, beforeFingerprint: null, afterFingerprint: null, versionAfter: null, appliedRunId: null, rollbackStatus: null, createdAt: transaction.now, updatedAt: transaction.now };
        if (!snapshot.exists) transaction.create(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey), data);
        else if (parsePersistentMigrationOperation(snapshot.data, { workspaceId, planId: plan.planId, operationIdHash: data.operationIdHash }).state !== "VALID" || snapshot.data?.plannedPayloadHash !== operation.plannedPayloadHash) throw new OperationError("CONFLICT", "migration-manifest");
      });
      await runner.run(async (transaction) => {
        const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
        if (!root.exists || !["PREPARING", "PREPARED"].includes(root.data?.status as string)) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
        for (const operation of operations) if (!(await transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey))).exists) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
        if (root.data?.status === "PREPARING") transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "PREPARED", version: 2, updatedAt: transaction.now, updatedBy: actorUid });
      });
      return Object.freeze({ planFingerprint: fingerprint, status: "PREPARED" as const });
    },
  });
}
