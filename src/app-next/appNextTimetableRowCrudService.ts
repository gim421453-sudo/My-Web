import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../services/firebaseProvider";
import type { AppSession, AuthPhase } from "../auth/authTypes";
import { normalizeAppNextTimetableDay, appNextTimetablePeriodNumber } from "./appNextTimetableReadonlyUtils";
import {
  activeTimetablePeriods, timetableCellDocumentId, timetableCellRows, timetableOperationMode,
  timetableProgramBinding, timetableRowBelongsToSet, timetableRowPatch, timetableRowWritePolicy,
  timetableSetWritable, timetableWorkspaceMatches, validateTimetableRowDraft, timetableRowDeleted,
  type TimetableRowDraft, type TimetableRowTarget,
} from "./appNextTimetableRowCrudUtils";

interface RowContext { phase: AuthPhase; session: AppSession | null; workspaceId: string }
type RowInput = RowContext & TimetableRowTarget;
type Action = "create" | "update" | "delete";
function fail(code: string): never {
  throw Object.assign(new Error("Timetable row operation could not be confirmed."), { code });
}

function assertContext(input: RowInput) {
  if (input.phase !== "authenticated" || input.session?.status !== "active" || !input.session.uid) fail("session-invalid");
  if (!input.workspaceId || input.workspaceId.includes("/") || input.workspaceId !== input.session.currentWorkspaceId) fail("workspace-mismatch");
  if (!input.setId || input.setId.includes("/")) fail("set-invalid");
  if (!["월", "화", "수", "목", "금", "토", "일"].includes(input.day)
    || input.period !== `${appNextTimetablePeriodNumber(input.period)}교시`) fail("period-invalid");
  if (input.rowId !== undefined && (!input.rowId || input.rowId.includes("/"))) fail("invalid-argument");
}

function assertPolicy(input: RowInput, action: Action, mode: string) {
  const policy = timetableRowWritePolicy({ ...input, operationMode: mode });
  if (!policy[action === "create" ? "canCreate" : action === "update" ? "canUpdate" : "canDelete"]) fail("permission-denied");
}

function assertSetAndPeriod(input: RowInput, set: Record<string, unknown>, periods: Array<Record<string, unknown>>) {
  if (!timetableWorkspaceMatches(set, input.workspaceId) || !timetableSetWritable(set)) fail("set-invalid");
  const period = activeTimetablePeriods(input.setId, set, periods).find((item) => item.periodNumber === appNextTimetablePeriodNumber(input.period));
  if (!period) fail("period-invalid");
  if (timetableProgramBinding({ ...set, id: input.setId }) === false) fail("program-invalid");
  return period;
}

function assertRow(input: RowInput, row: Record<string, unknown>, set: Record<string, unknown>) {
  if (timetableRowDeleted(row)) fail("not-found");
  if (!timetableWorkspaceMatches(row, input.workspaceId) || !timetableRowBelongsToSet(row, input.setId)) fail("workspace-mismatch");
  if (normalizeAppNextTimetableDay(row.day || row.weekday || row.dayName) !== input.day
    || appNextTimetablePeriodNumber(row.period || row.periodLabel) !== appNextTimetablePeriodNumber(input.period)) fail("invalid-argument");
  const program = timetableProgramBinding({ ...set, id: input.setId });
  if (program && (row.programId && row.programId !== program.programId)) fail("program-invalid");
  if (!program && (row.programId || row.sourceType && !["school", "general"].includes(String(row.sourceType)))) fail("program-invalid");
}

async function mutate(input: RowInput, action: Action, draft?: TimetableRowDraft) {
  assertContext(input);
  if (action !== "delete" && (!draft || validateTimetableRowDraft(draft))) fail("invalid-argument");
  if (action !== "create" && !input.rowId) fail("invalid-argument");
  const db = getFirebaseDb();
  const workspaceRef = doc(db, "workspaces", input.workspaceId);
  const settingsRef = doc(db, "workspaces", input.workspaceId, "settings", "app");
  const setRef = doc(db, "workspaces", input.workspaceId, "timetableSets", input.setId);
  const [workspace, settings, setSnapshot, periodSnapshot, rowSnapshot] = await Promise.all([
    getDocFromServer(workspaceRef), getDocFromServer(settingsRef), getDocFromServer(setRef),
    getDocsFromServer(collection(db, "workspaces", input.workspaceId, "periodTimes")),
    getDocsFromServer(collection(db, "workspaces", input.workspaceId, "timetable")),
  ]);
  assertPolicy(input, action, timetableOperationMode(workspace.data() || {}, settings.data() || {}));
  if (!workspace.exists() || !setSnapshot.exists()) fail("set-invalid");
  const periods = periodSnapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
  assertSetAndPeriod(input, setSnapshot.data()!, periods);
  const existingRows = rowSnapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
  if (action === "create" && timetableCellRows(existingRows, input).length) fail("duplicate-cell");

  const rowId = action === "create" ? timetableCellDocumentId(input) : input.rowId!;
  if (rowId.length > 1400) fail("invalid-argument");
  const rowRef = doc(db, "workspaces", input.workspaceId, "timetable", rowId);
  const patch = draft ? timetableRowPatch(draft) : {};
  let expectedCreate: Record<string, unknown> = {};
  // Only the row is mutated. Reads participate in retries when set/mode/period metadata changes.
  await runTransaction(db, async (transaction) => {
    const [freshWorkspace, freshSettings, freshSet, row, ...freshPeriods] = await Promise.all([
      transaction.get(workspaceRef), transaction.get(settingsRef), transaction.get(setRef), transaction.get(rowRef),
      ...periodSnapshot.docs.map((item) => transaction.get(item.ref)),
    ]);
    assertPolicy(input, action, timetableOperationMode(freshWorkspace.data() || {}, freshSettings.data() || {}));
    if (!freshWorkspace.exists() || !freshSet.exists()) fail("set-invalid");
    const set = freshSet.data()!;
    const period = assertSetAndPeriod(input, set, freshPeriods.filter((item) => item.exists()).map((item) => ({ ...item.data(), id: item.id })));
    if (action === "create") {
      if (row.exists()) fail("duplicate-cell");
      const program = timetableProgramBinding({ ...set, id: input.setId });
      const parts = period.time.split(/\s*[-~]\s*/);
      expectedCreate = { ...patch, id: rowId, setId: input.setId, day: input.day,
        period: `${period.periodNumber}교시`, time: period.time, start: parts[0] || "", end: parts[1] || "",
        workspaceId: input.workspaceId, workspace_id: input.workspaceId,
        ...(program || {}) };
      transaction.set(rowRef, { ...expectedCreate, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      if (!row.exists()) fail("not-found");
      assertRow(input, row.data()!, set);
      if (action === "delete") transaction.delete(rowRef);
      else transaction.update(rowRef, { ...patch, updatedAt: serverTimestamp() });
    }
  });
  const confirmed = await getDocFromServer(rowRef);
  if (confirmed.metadata.hasPendingWrites || confirmed.metadata.fromCache) fail("app-next-write-unconfirmed");
  if (action === "delete") {
    if (confirmed.exists()) fail("app-next-write-unconfirmed");
  } else {
    const data = confirmed.data();
    if (!confirmed.exists() || !data || !timetableWorkspaceMatches(data, input.workspaceId)
      || !timetableRowBelongsToSet(data, input.setId)
      || normalizeAppNextTimetableDay(data.day || data.weekday || data.dayName) !== input.day
      || appNextTimetablePeriodNumber(data.period || data.periodLabel) !== appNextTimetablePeriodNumber(input.period)
      || !Object.entries(patch).every(([key, value]) => data[key] === value)) fail("app-next-write-unconfirmed");
    if (action === "create" && !Object.entries(expectedCreate).every(([key, value]) => data[key] === value)) fail("app-next-write-unconfirmed");
  }
  return { id: rowId };
}

export const createAppNextTimetableRow = (input: RowInput & TimetableRowDraft) => mutate(input, "create", input);
export const updateAppNextTimetableRow = (input: RowInput & TimetableRowDraft) => mutate(input, "update", input);
export const deleteAppNextTimetableRow = (input: RowInput) => mutate(input, "delete");
