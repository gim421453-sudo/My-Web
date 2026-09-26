import type { VerifiedActor } from "../auth/verifiedActor.js";
import { OperationError } from "../operations/operationErrors.js";
import type { TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import type { MigrationPlan } from "./migrationDryRunOrchestrator.js";
import type { MigrationRehearsalCommand, MigrationPlanApplyResult } from "./migrationRehearsalApplyAdapter.js";
import { parsePersistentMigrationManifest, parsePersistentMigrationOperation } from "./persistentMigrationManifestContract.js";
import { persistentManifestOperationPath, persistentManifestPath, persistentOperationId, persistentPlanFingerprint, type PersistentManifestOperation } from "./persistentMigrationManifestRepository.js";

interface FreshApplyPort {
  applyPlan(actor: VerifiedActor, commands: readonly MigrationRehearsalCommand[], migrationRunId: string): Promise<MigrationPlanApplyResult>;
}

// No process-local journal or previous adapter state is used. Recovery derives
// progress solely from the exact plan-bound persistent operation documents.
export function createPersistentMigrationRecoveryService(dependencies: Readonly<{ runner: TrustedTransactionRunner; beforeFinalizeApplied?: () => void }>) {
  const acquire = async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, migrationRunId: string) => dependencies.runner.run(async (transaction) => {
    const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
    if (!root.exists || !["PREPARED", "APPLYING", "PARTIAL"].includes(root.data?.status as string)) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
    if (root.data?.status === "APPLYING" && root.data?.activeRunId !== migrationRunId) throw new OperationError("CONFLICT", "migration-run-owner");
    if (root.data?.status !== "APPLYING") transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "APPLYING", activeRunId: migrationRunId, version: (root.data?.version as number) + 1, updatedAt: transaction.now, updatedBy: actor.uid });
    return Object.freeze({ acquired: true as const });
  });
  const inspect = async (plan: MigrationPlan, workspaceId: string) => dependencies.runner.run(async (transaction) => {
    const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
    const operations = await Promise.all(plan.operations.map((operation) => transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey))));
    const persistedCoverage = await transaction.queryEqual([...persistentManifestPath(workspaceId, plan.planId), "operations"], "planId", plan.planId);
    if (!root.exists || parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID") throw new OperationError("FAILED_PRECONDITION", "migration-manifest-required");
    const expectedOperationIds = new Set(plan.operations.map((operation) => persistentOperationId(plan.planId, operation.operationKey)));
    if (persistedCoverage.length !== expectedOperationIds.size || persistedCoverage.some((snapshot) => !snapshot.data || typeof snapshot.data.operationIdHash !== "string" || !expectedOperationIds.has(snapshot.data.operationIdHash))) throw new OperationError("CONFLICT", "migration-manifest-coverage");
    for (let index = 0; index < operations.length; index += 1) {
      const operation = plan.operations[index]!;
      const snapshot = operations[index]!;
      if (!snapshot.exists || parsePersistentMigrationOperation(snapshot.data, { workspaceId, planId: plan.planId, operationIdHash: persistentOperationId(plan.planId, operation.operationKey) }).state !== "VALID" || snapshot.data?.entityType !== operation.entityType || snapshot.data?.targetId !== operation.destination.split("/")[1]!) throw new OperationError("CONFLICT", "migration-manifest");
      if (snapshot.data?.status === "CREATED" && (snapshot.data?.createdByPlan !== true || snapshot.data?.beforeExists !== false || snapshot.data?.versionAfter !== 1 || typeof snapshot.data?.afterFingerprint !== "string")) throw new OperationError("CONFLICT", "migration-created-evidence");
    }
    const operationMaterial: PersistentManifestOperation[] = operations.map((snapshot, index) => {
      const data = snapshot.data!;
      return Object.freeze({ operationKey: plan.operations[index]!.operationKey, entityType: data.entityType, targetId: data.targetId, sourceFingerprint: data.sourceFingerprint, plannedPayloadHash: data.plannedPayloadHash }) as PersistentManifestOperation;
    });
    if (root.data?.planFingerprint !== persistentPlanFingerprint(plan, workspaceId, operationMaterial)) throw new OperationError("CONFLICT", "migration-manifest-fingerprint");
    return Object.freeze({ complete: operations.every((snapshot) => snapshot.data?.status === "CREATED" || snapshot.data?.status === "ALREADY_CANONICAL"), activeRunId: root.data?.activeRunId as string | null, operations: Object.freeze(operations.map((snapshot) => snapshot.data)) });
  });
  const finalizeApplied = async (plan: MigrationPlan, workspaceId: string, actorUid: string) => dependencies.runner.run(async (transaction) => {
    const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
    const operations = await Promise.all(plan.operations.map((operation) => transaction.get(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey))));
    if (!root.exists || parsePersistentMigrationManifest(root.data, { workspaceId, planId: plan.planId }).state !== "VALID" || !operations.every((snapshot) => snapshot.exists && (snapshot.data?.status === "CREATED" || snapshot.data?.status === "ALREADY_CANONICAL"))) throw new OperationError("FAILED_PRECONDITION", "migration-manifest");
    if (root.data?.status !== "APPLIED") transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "APPLIED", activeRunId: null, version: (root.data?.version as number) + 1, updatedAt: transaction.now, updatedBy: actorUid });
  });
  return Object.freeze({
    acquire,
    resume: async (actor: VerifiedActor, plan: MigrationPlan, workspaceId: string, commands: readonly MigrationRehearsalCommand[], freshAdapter: FreshApplyPort, migrationRunId: string) => {
      const state = await inspect(plan, workspaceId);
      if (state.complete) {
        const replay = await freshAdapter.applyPlan(actor, commands, state.activeRunId ?? migrationRunId);
        if (replay.state !== "COMPLETED") throw new OperationError("CONFLICT", "migration-recovery-reconcile");
        for (const result of replay.completed) {
          const index = plan.operations.findIndex((operation) => operation.operationKey === result.operationKey);
          const evidence = state.operations[index];
          if (evidence?.status === "CREATED" && evidence.afterFingerprint !== result.fingerprint) throw new OperationError("CONFLICT", "migration-created-fingerprint");
        }
        dependencies.beforeFinalizeApplied?.();
        await finalizeApplied(plan, workspaceId, actor.uid);
        return Object.freeze({ state: "COMPLETED" as const, resumed: false });
      }
      await acquire(actor, plan, workspaceId, migrationRunId);
      const result = await freshAdapter.applyPlan(actor, commands, migrationRunId);
      if (result.state !== "COMPLETED") {
        await dependencies.runner.run(async (transaction) => {
          const root = await transaction.get(persistentManifestPath(workspaceId, plan.planId));
          if (root.exists && root.data?.activeRunId === migrationRunId) transaction.update(persistentManifestPath(workspaceId, plan.planId), { status: "PARTIAL", activeRunId: null, version: (root.data?.version as number) + 1, updatedAt: transaction.now, updatedBy: actor.uid });
        });
        return Object.freeze({ state: "STOPPED_PARTIAL" as const, resumed: true });
      }
      dependencies.beforeFinalizeApplied?.();
      await finalizeApplied(plan, workspaceId, actor.uid);
      return Object.freeze({ state: "COMPLETED" as const, resumed: true });
    },
  });
}
