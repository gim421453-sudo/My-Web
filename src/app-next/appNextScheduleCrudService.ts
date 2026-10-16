import { collection, doc, setDoc, updateDoc, deleteDoc, getDocFromServer, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../services/firebaseProvider";
import type { AppSession, AuthPhase } from "../auth/authTypes";
import { appNextScheduleWritePolicy, cleanAppNextScheduleDraft, scheduleManagementRecord, scheduleMatchesWorkspace, scheduleWriteConfirmed, validateAppNextScheduleDraft, type AppNextScheduleDraft } from "./appNextScheduleCrudUtils";

interface ScheduleWriteContext {
  phase: AuthPhase;
  session: AppSession | null;
  workspaceId: string;
}

function fail(code: string): never {
  throw Object.assign(new Error("Schedule operation could not be confirmed."), { code });
}

function assertAllowed(input: ScheduleWriteContext, action: "canCreate" | "canUpdate" | "canDelete") {
  if (input.phase !== "authenticated" || input.session?.status !== "active") fail("session-invalid");
  const policy = appNextScheduleWritePolicy(input);
  if (!input.workspaceId || policy.workspaceId !== input.workspaceId) fail("workspace-mismatch");
  if (!policy[action]) fail("permission-denied");
}

function validatedDraft(draft: AppNextScheduleDraft) {
  if (validateAppNextScheduleDraft(draft)) fail("invalid-argument");
  return cleanAppNextScheduleDraft(draft);
}

async function existingReference(input: ScheduleWriteContext & { scheduleId: string }, action: "canUpdate" | "canDelete") {
  assertAllowed(input, action);
  if (!input.scheduleId || input.scheduleId.includes("/")) fail("invalid-argument");
  const ref = doc(getFirebaseDb(), "workspaces", input.workspaceId, "schedules", input.scheduleId);
  const existing = await getDocFromServer(ref);
  if (!existing.exists()) fail("not-found");
  const data = existing.data()!;
  if (!scheduleMatchesWorkspace(data, input.workspaceId)) fail("workspace-mismatch");
  if (!scheduleManagementRecord(ref.id, data, input.workspaceId)) fail("schema-unsupported");
  return ref;
}

export async function createAppNextSchedule(input: ScheduleWriteContext & AppNextScheduleDraft) {
  assertAllowed(input, "canCreate");
  const draft = validatedDraft(input);
  const ref = doc(collection(getFirebaseDb(), "workspaces", input.workspaceId, "schedules"));
  await setDoc(ref, {
    ...draft, id: ref.id, workspaceId: input.workspaceId, workspace_id: input.workspaceId,
    createdByUid: input.session!.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.hasPendingWrites || !scheduleWriteConfirmed(confirmed.data(), input.workspaceId, draft)) fail("app-next-write-unconfirmed");
  return { id: ref.id };
}

export async function updateAppNextSchedule(input: ScheduleWriteContext & AppNextScheduleDraft & { scheduleId: string }) {
  const draft = validatedDraft(input);
  const ref = await existingReference(input, "canUpdate");
  await updateDoc(ref, { ...draft, updatedAt: serverTimestamp() });
  const confirmed = await getDocFromServer(ref);
  if (!confirmed.exists() || confirmed.metadata.hasPendingWrites || !scheduleWriteConfirmed(confirmed.data(), input.workspaceId, draft)) fail("app-next-write-unconfirmed");
  return { id: ref.id };
}

export async function deleteAppNextSchedule(input: ScheduleWriteContext & { scheduleId: string }) {
  const ref = await existingReference(input, "canDelete");
  await deleteDoc(ref);
  const confirmed = await getDocFromServer(ref);
  if (confirmed.exists() || confirmed.metadata.hasPendingWrites) fail("app-next-write-unconfirmed");
  return { id: ref.id };
}
