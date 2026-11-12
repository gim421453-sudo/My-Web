import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../services/firebaseProvider";
import type { AppSession, AuthPhase } from "../auth/authTypes";
import { activeTimetablePeriods, timetableWorkspaceMatches, timetableOperationMode } from "./appNextTimetableRowCrudUtils";
import { localDateString, parseTimetableDate, periodBelongsToSet, periodTimeDocumentId, setPatch, timetableManagementPolicy, validatePeriodDraft, validateTimetableSetDraft, type PeriodDraft, type TimetableSetDraft } from "./appNextTimetableManagementUtils";

interface Context { phase: AuthPhase; session: AppSession | null; workspaceId: string; operationMode: string }
function fail(code: string): never { throw Object.assign(new Error("Timetable management could not be confirmed."), { code }); }
function assertContext(input: Context) {
  if (input.phase !== "authenticated" || input.session?.status !== "active" || !input.session.uid) fail("session-invalid");
  if (!input.workspaceId || input.workspaceId.includes("/") || input.workspaceId !== input.session.currentWorkspaceId) fail("workspace-mismatch");
  if (!timetableManagementPolicy(input).canManage) fail("permission-denied");
}
async function contextRefs(input: Context) {
  const db = getFirebaseDb();
  const workspaceRef = doc(db, "workspaces", input.workspaceId);
  const settingsRef = doc(db, "workspaces", input.workspaceId, "settings", "app");
  const [workspace, settings] = await Promise.all([getDocFromServer(workspaceRef), getDocFromServer(settingsRef)]);
  if (!workspace.exists()) fail("workspace-mismatch");
  const mode = timetableOperationMode(workspace.data() || {}, settings.data() || {});
  if (!timetableManagementPolicy({ ...input, operationMode: mode }).canManage) fail("permission-denied");
  return { db, workspaceRef, settingsRef, mode };
}
async function confirmList(input: Context): Promise<{ sets: Array<Record<string, unknown>>; periods: Array<Record<string, unknown>>; rows: Array<Record<string, unknown>> }> {
  const db = getFirebaseDb();
  const [sets, periods, rows] = await Promise.all(["timetableSets", "periodTimes", "timetable"].map((key) => getDocsFromServer(collection(db, "workspaces", input.workspaceId, key))));
  if ([sets, periods, rows].some((snapshot) => snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites)) fail("app-next-write-unconfirmed");
  return {
    sets: sets.docs.map((item): Record<string, unknown> => ({ ...item.data(), id: item.id })),
    periods: periods.docs.map((item): Record<string, unknown> => ({ ...item.data(), id: item.id })),
    rows: rows.docs.map((item): Record<string, unknown> => ({ ...item.data(), id: item.id })),
  };
}
function assertSet(set: Record<string, unknown>, workspaceId: string) {
  if (!timetableWorkspaceMatches(set, workspaceId) || set.deleted === true || set.archived === true) fail("set-invalid");
}
function statusFromDates(startDate: string, endDate: string, today = localDateString()) {
  return endDate && endDate < today ? "ended" : startDate > today ? "scheduled" : "active";
}
function validateUniqueName(sets: Array<Record<string, unknown>>, name: string, exceptId = "") {
  if (sets.some((set) => set.id !== exceptId && String(set.name || "").trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()
    && set.deleted !== true && set.archived !== true)) fail("set-name-duplicate");
}

export async function createAppNextTimetableSet(input: Context & TimetableSetDraft) {
  assertContext(input);
  const invalid = validateTimetableSetDraft(input);
  if (invalid) fail(invalid);
  const { db } = await contextRefs(input);
  const current = await confirmList(input);
  validateUniqueName(current.sets, input.name);
  const id = doc(collection(db, "workspaces", input.workspaceId, "timetableSets")).id;
  const ref = doc(db, "workspaces", input.workspaceId, "timetableSets", id);
  const patch = setPatch(input);
  await runTransaction(db, async (tx) => {
    const [existing, ...sets] = await Promise.all([tx.get(ref), ...current.sets.map((set) => tx.get(doc(db, "workspaces", input.workspaceId, "timetableSets", String(set.id))))]);
    if (existing.exists()) fail("set-name-duplicate");
    const fresh = sets.flatMap((snapshot) => snapshot.exists() ? [{ ...snapshot.data(), id: snapshot.id }] : []);
    validateUniqueName(fresh, input.name);
    tx.set(ref, { ...patch, id, status: statusFromDates(patch.startDate, patch.endDate), archived: false,
      workspaceId: input.workspaceId, workspace_id: input.workspaceId, createdByUid: input.session!.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.fromCache || confirmed.metadata.hasPendingWrites
    || !Object.entries(patch).every(([key, value]) => confirmed.data()?.[key] === value)) fail("app-next-write-unconfirmed");
  await confirmList(input);
  return { id };
}

export async function updateAppNextTimetableSet(input: Context & TimetableSetDraft & { setId: string }) {
  assertContext(input);
  if (!input.setId || input.setId.includes("/")) fail("set-invalid");
  const invalid = validateTimetableSetDraft(input);
  if (invalid) fail(invalid);
  const { db } = await contextRefs(input);
  const list = await confirmList(input);
  const existing = list.sets.find((set) => set.id === input.setId);
  if (!existing) fail("not-found");
  assertSet(existing, input.workspaceId);
  validateUniqueName(list.sets, input.name, input.setId);
  const ref = doc(db, "workspaces", input.workspaceId, "timetableSets", input.setId);
  const patch = { name: input.name.trim(), startDate: input.startDate, endDate: input.endDate || "", memo: input.memo.trim() };
  await runTransaction(db, async (tx) => {
    const [fresh, ...sets] = await Promise.all([tx.get(ref), ...list.sets.filter((set) => set.id !== input.setId)
      .map((set) => tx.get(doc(db, "workspaces", input.workspaceId, "timetableSets", String(set.id))))]);
    if (!fresh.exists()) fail("not-found");
    assertSet(fresh.data()!, input.workspaceId);
    validateUniqueName(sets.flatMap((s) => s.exists() ? [{ ...s.data(), id: s.id }] : []), input.name, input.setId);
    tx.update(ref, { ...patch, status: statusFromDates(patch.startDate, patch.endDate), updatedAt: serverTimestamp() });
  });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.fromCache || confirmed.metadata.hasPendingWrites
    || !Object.entries(patch).every(([key, value]) => confirmed.data()?.[key] === value)) fail("app-next-write-unconfirmed");
  await confirmList(input);
  return { id: input.setId };
}

export async function changeAppNextTimetableSetLifecycle(input: Context & { setId: string; action: "archive" | "unarchive" | "reactivate"; endDate?: string }) {
  assertContext(input);
  if (!input.setId || input.setId.includes("/")) fail("set-invalid");
  const { db } = await contextRefs(input);
  const list = await confirmList(input);
  const set = list.sets.find((item) => item.id === input.setId);
  if (!set) fail("not-found");
  if (!timetableWorkspaceMatches(set, input.workspaceId)) fail("workspace-mismatch");
  const today = localDateString();
  const endDate = input.endDate || "";
  if (input.action === "reactivate" && endDate && (!parseTimetableDate(endDate) || endDate < today)) fail("date-range-invalid");
  const next = input.action === "archive" ? { status: "archived", archived: true }
    : input.action === "reactivate" ? { startDate: today, endDate, status: statusFromDates(today, endDate), archived: false }
    : { status: statusFromDates(parseTimetableDate(set.startDate) || today, parseTimetableDate(set.endDate)), archived: false };
  const ref = doc(db, "workspaces", input.workspaceId, "timetableSets", input.setId);
  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists()) fail("not-found");
    if (!timetableWorkspaceMatches(fresh.data()!, input.workspaceId)) fail("workspace-mismatch");
    tx.update(ref, { ...next, updatedAt: serverTimestamp() });
  });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.fromCache || confirmed.metadata.hasPendingWrites
    || Object.entries(next).some(([key, value]) => confirmed.data()?.[key] !== value)) fail("app-next-write-unconfirmed");
  await confirmList(input);
  return { id: input.setId };
}

export async function saveAppNextTimetablePeriod(input: Context & { setId: string; draft: PeriodDraft; existingPeriod?: number }) {
  assertContext(input);
  if (!input.setId || input.setId.includes("/") || !input.draft) fail("period-invalid");
  const { db } = await contextRefs(input);
  const list = await confirmList(input);
  const set = list.sets.find((item) => item.id === input.setId);
  if (!set) fail("not-found");
  assertSet(set, input.workspaceId);
  const effective = activeTimetablePeriods(input.setId, set, list.periods).map((item) => ({
    period: item.periodNumber, start: item.time.split(/[-~]/)[0]?.trim() || "", end: item.time.split(/[-~]/)[1]?.trim() || "",
  }));
  const invalid = validatePeriodDraft(input.draft, effective, input.existingPeriod);
  if (invalid) fail(invalid);
  if (input.existingPeriod !== undefined && input.existingPeriod !== input.draft.period) fail("period-in-use");
  if (input.existingPeriod !== undefined && !effective.some((item) => item.period === input.existingPeriod)) fail("not-found");
  const same = list.periods.find((row) => periodBelongsToSet(row, input.setId) && Number(String(row.period || row.id).match(/\d+/)?.[0]) === (input.existingPeriod ?? input.draft.period));
  const periodId = same?.id ? String(same.id) : periodTimeDocumentId(input.setId, input.draft.period);
  const ref = doc(db, "workspaces", input.workspaceId, "periodTimes", periodId);
  const setRef = doc(db, "workspaces", input.workspaceId, "timetableSets", input.setId);
  await runTransaction(db, async (tx) => {
    const [freshSet, existed] = await Promise.all([tx.get(setRef), tx.get(ref)]);
    if (!freshSet.exists()) fail("not-found");
    assertSet(freshSet.data()!, input.workspaceId);
    const existingData = existed?.exists() ? existed.data()! : {};
    const periodLabel = `${input.draft.period}교시`;
    const payload = { ...existingData, id: periodId, timetableSetId: input.setId, period: periodLabel,
      start: input.draft.start, end: input.draft.end, time: `${input.draft.start}-${input.draft.end}`,
      workspaceId: input.workspaceId, workspace_id: input.workspaceId };
    if (existed?.exists()) tx.update(ref, { ...payload, updatedAt: serverTimestamp() });
    else tx.set(ref, { ...payload, createdByUid: input.session!.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const maxPeriod = Math.max(Number(freshSet.data()?.visiblePeriodCount || freshSet.data()?.periodCount || 0), input.draft.period);
    tx.update(setRef, { visiblePeriodCount: maxPeriod, updatedAt: serverTimestamp() });
  });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.fromCache || confirmed.metadata.hasPendingWrites
    || confirmed.data()?.period !== `${input.draft.period}교시` || confirmed.data()?.start !== input.draft.start || confirmed.data()?.end !== input.draft.end) fail("app-next-write-unconfirmed");
  await confirmList(input);
  return { id: periodId };
}

export async function deleteAppNextTimetablePeriod(input: Context & { setId: string; period: number }) {
  assertContext(input);
  if (!input.setId || input.setId.includes("/") || !Number.isInteger(input.period) || input.period < 1) fail("period-invalid");
  fail("period-delete-blocked");
}
