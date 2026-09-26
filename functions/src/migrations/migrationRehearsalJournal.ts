export type MigrationJournalResult = "CREATED" | "ALREADY_CANONICAL" | "REPLAYED" | "FAILED";
export interface MigrationJournalEntry { readonly planId: string; readonly migrationRunId: string; readonly operationKey: string; readonly entityType: "student" | "class" | "subject" | "enrollment"; readonly workspaceId: string; readonly targetId: string; readonly beforeExists: boolean; readonly beforeFingerprint: string | null; readonly afterFingerprint: string | null; readonly createdByPlan: boolean; readonly result: MigrationJournalResult; readonly versionAfter: number | null; }
export class InMemoryMigrationRehearsalJournal {
  private readonly entries = new Map<string, MigrationJournalEntry>();
  record(entry: MigrationJournalEntry): void { this.entries.set(`${entry.planId}:${entry.operationKey}`, Object.freeze({ ...entry })); }
  get(planId: string, operationKey: string): MigrationJournalEntry | null { return this.entries.get(`${planId}:${operationKey}`) ?? null; }
  list(planId: string): readonly MigrationJournalEntry[] { return Object.freeze([...this.entries.values()].filter((entry) => entry.planId === planId).sort((a, b) => b.entityType.localeCompare(a.entityType) || b.operationKey.localeCompare(a.operationKey))); }
}
