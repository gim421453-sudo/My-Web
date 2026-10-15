import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";
import {
  getFirebaseDb,
} from "../services/firebaseProvider";
import {
  appNextWorkspaceNoticeWritePolicy,
  canManageAppNextWorkspaceNotice,
  validateAppNextWorkspaceNoticeDraft,
  type AppNextWorkspaceNoticeManagementRecord,
  type AppNextWorkspaceNoticeDraft,
} from "./appNextWorkspaceNoticeCrudUtils";

interface NoticeWriteContext {
  phase: AuthPhase;
  session: AppSession | null;
  workspaceId: string;
}

export class AppNextWorkspaceNoticeWriteError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AppNextWorkspaceNoticeWriteError";
    this.code = code;
  }
}

function noticeReference(workspaceId: string, noticeId: string) {
  return doc(getFirebaseDb(), "workspaces", workspaceId, "notices", noticeId);
}

function assertCreateAllowed({ phase, session, workspaceId }: NoticeWriteContext) {
  const policy = appNextWorkspaceNoticeWritePolicy({ phase, session });
  if (!policy.canCreate || policy.workspaceId !== workspaceId) {
    throw new AppNextWorkspaceNoticeWriteError("permission-denied", "Notice create is not allowed.");
  }
  return policy;
}

async function assertManagedNoticeAllowed(
  context: NoticeWriteContext,
  noticeId: string,
): Promise<ReturnType<typeof noticeReference>> {
  if (!noticeId || noticeId.includes("/")) {
    throw new AppNextWorkspaceNoticeWriteError("invalid-argument", "Invalid notice id.");
  }

  const ref = noticeReference(context.workspaceId, noticeId);
  const snapshot = await getDocFromServer(ref);
  const data = snapshot.data();
  const policy = appNextWorkspaceNoticeWritePolicy(context);
  if (
    !snapshot.exists()
    || data?.appNextManaged !== true
    || data.workspaceId !== context.workspaceId
    || typeof data.authorUid !== "string"
    || !canManageAppNextWorkspaceNotice(policy, data.authorUid)
  ) {
    throw new AppNextWorkspaceNoticeWriteError("permission-denied", "Notice is not managed by this account.");
  }
  return ref;
}

function assertConfirmedNotice(
  exists: boolean,
  data: Record<string, unknown> | undefined,
  workspaceId: string,
  uid: string,
  draft: AppNextWorkspaceNoticeDraft,
) {
  if (
    !exists
    || data?.appNextManaged !== true
    || data.workspaceId !== workspaceId
    || data.authorUid !== uid
    || data.title !== draft.title.trim()
    || data.content !== draft.content.trim()
  ) {
    throw new AppNextWorkspaceNoticeWriteError("app-next-write-unconfirmed", "Server confirmation did not match the notice write.");
  }
}

function validateDraft(draft: AppNextWorkspaceNoticeDraft) {
  if (validateAppNextWorkspaceNoticeDraft(draft)) {
    throw new AppNextWorkspaceNoticeWriteError("invalid-argument", "Invalid notice draft.");
  }
}

export async function createAppNextWorkspaceNotice(input: NoticeWriteContext & AppNextWorkspaceNoticeDraft) {
  const policy = assertCreateAllowed(input);
  validateDraft(input);

  const draft = {
    title: input.title.trim(),
    content: input.content.trim(),
  };
  const ref = await addDoc(
    collection(getFirebaseDb(), "workspaces", input.workspaceId, "notices"),
    {
      ...draft,
      workspaceId: input.workspaceId,
      source: "App Next",
      category: "일반",
      scope: "workspace",
      createdFrom: "app-next",
      appNextManaged: true,
      authorUid: policy.uid,
      authorRole: input.session?.isSystemOwner ? "system_owner" : input.session?.currentWorkspaceRole,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    },
  );
  const confirmed = await getDocFromServer(ref);
  assertConfirmedNotice(confirmed.exists(), confirmed.data(), input.workspaceId, policy.uid, draft);
  return { id: ref.id, ...draft, authorUid: policy.uid } satisfies AppNextWorkspaceNoticeManagementRecord;
}

export async function updateAppNextWorkspaceNotice(input: NoticeWriteContext & AppNextWorkspaceNoticeDraft & { noticeId: string }) {
  validateDraft(input);
  const ref = await assertManagedNoticeAllowed(input, input.noticeId);
  const draft = {
    title: input.title.trim(),
    content: input.content.trim(),
  };
  await updateDoc(ref, {
    ...draft,
    updatedAt: serverTimestamp(),
  });
  const confirmed = await getDocFromServer(ref);
  const data = confirmed.data();
  if (
    !confirmed.exists()
    || data?.appNextManaged !== true
    || data.workspaceId !== input.workspaceId
    || data.title !== draft.title
    || data.content !== draft.content
  ) {
    throw new AppNextWorkspaceNoticeWriteError("app-next-write-unconfirmed", "Server confirmation did not match the notice update.");
  }
  return { id: input.noticeId, ...draft };
}

export async function deleteAppNextWorkspaceNotice(input: NoticeWriteContext & { noticeId: string }) {
  const ref = await assertManagedNoticeAllowed(input, input.noticeId);
  await deleteDoc(ref);
  const confirmed = await getDocFromServer(ref);
  if (confirmed.exists()) {
    throw new AppNextWorkspaceNoticeWriteError("app-next-write-unconfirmed", "Server still returns the deleted notice.");
  }
  return { id: input.noticeId, deleted: true as const };
}
