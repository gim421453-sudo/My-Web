import type { MigrationJournalEntry } from "./migrationRehearsalJournal.js";
export type RollbackDecision = "ROLLBACK_ALLOWED" | "ROLLBACK_CONFLICT" | "ROLLBACK_NOT_OWNED" | "ROLLBACK_ALREADY_ABSENT";
export interface CurrentMigrationState { readonly exists: boolean; readonly source: string | null; readonly version: number | null; readonly fingerprint: string | null; }
export function evaluateRollback(entry: MigrationJournalEntry, current: CurrentMigrationState): RollbackDecision {
  if (!entry.createdByPlan) return "ROLLBACK_NOT_OWNED";
  if (!current.exists) return "ROLLBACK_ALREADY_ABSENT";
  if (current.source !== "migration" || current.version !== entry.versionAfter || current.fingerprint !== entry.afterFingerprint) return "ROLLBACK_CONFLICT";
  return "ROLLBACK_ALLOWED";
}
export function reverseRollbackOrder(entries: readonly MigrationJournalEntry[]): readonly MigrationJournalEntry[] { const phase = (entry: MigrationJournalEntry) => entry.entityType === "enrollment" ? 1 : entry.entityType === "subject" ? 2 : entry.entityType === "class" ? 3 : 4; return Object.freeze(entries.filter((entry) => entry.createdByPlan).sort((a, b) => phase(a) - phase(b) || a.operationKey.localeCompare(b.operationKey))); }
