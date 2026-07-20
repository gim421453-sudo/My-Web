import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";

import type {
  WorkspaceRole,
} from "../constants/roles";

interface ApproveUserParams {
  targetUid: string;
  workspaceId: string;
  role: WorkspaceRole;
  approvedBy: string;
}

interface DisableUserParams {
  targetUid: string;
  disabledBy: string;
}

interface ReactivateUserParams {
  targetUid: string;
  reactivatedBy: string;
}

interface RejectUserParams {
  targetUid: string;
  rejectedBy: string;
}

/**
 * 사용자를 승인하고
 * 해당 워크스페이스 멤버 문서를 생성합니다.
 */
export async function approveUser({
  targetUid,
  workspaceId,
  role,
  approvedBy,
}: ApproveUserParams):
  Promise<void> {
  const normalizedTargetUid =
    targetUid.trim();

  const normalizedWorkspaceId =
    workspaceId.trim();

  if (!normalizedTargetUid) {
    throw new Error(
      "승인할 사용자 UID가 없습니다.",
    );
  }

  if (!normalizedWorkspaceId) {
    throw new Error(
      "승인할 워크스페이스 ID가 없습니다.",
    );
  }

  const userRef = doc(
    db,
    "users",
    normalizedTargetUid,
  );

  const userSnapshot =
    await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error(
      "승인할 사용자 문서가 존재하지 않습니다.",
    );
  }

  const userData =
    userSnapshot.data();

  const displayName =
    typeof userData.displayName ===
      "string"
      ? userData.displayName
      : "이름 없음";

  const email =
    typeof userData.email ===
      "string"
      ? userData.email
      : null;

  const memberRef = doc(
    db,
    "workspaces",
    normalizedWorkspaceId,
    "members",
    normalizedTargetUid,
  );

  const batch =
    writeBatch(db);

  batch.update(
    userRef,
    {
      status: "active",

      /**
       * 기존 코드 호환용입니다.
       * 최종적으로 status만 사용하게 되면 제거합니다.
       */
      active: true,
      disabled: false,

      globalRole:
        typeof userData.globalRole ===
          "string"
          ? userData.globalRole
          : "user",

      currentWorkspaceId:
        normalizedWorkspaceId,

      approvedAt:
        serverTimestamp(),

      approvedBy,

      rejectedAt:
        deleteField(),

      rejectedBy:
        deleteField(),

      disabledAt:
        deleteField(),

      disabledBy:
        deleteField(),

      pendingInviteCodeId:
        null,

      pendingWorkspaceId:
        null,

      updatedAt:
        serverTimestamp(),

      updatedBy:
        approvedBy,
    },
  );

  batch.set(
    memberRef,
    {
      uid:
        normalizedTargetUid,

      role,

      status:
        "active",

      displayName,
      email,

      joinedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      invitedBy:
        approvedBy,

      updatedBy:
        approvedBy,
    },
    {
      merge: true,
    },
  );

  await batch.commit();
}

/**
 * 서비스 전체 계정을 비활성화합니다.
 */
export async function disableUser({
  targetUid,
  disabledBy,
}: DisableUserParams):
  Promise<void> {
  const normalizedTargetUid =
    targetUid.trim();

  if (!normalizedTargetUid) {
    throw new Error(
      "비활성화할 사용자 UID가 없습니다.",
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      normalizedTargetUid,
    ),
    {
      status: "disabled",

      active: false,
      disabled: true,

      disabledAt:
        serverTimestamp(),

      disabledBy,

      updatedAt:
        serverTimestamp(),

      updatedBy:
        disabledBy,
    },
  );
}

/**
 * 거절 또는 비활성 사용자를 다시 활성화합니다.
 */
export async function reactivateUser({
  targetUid,
  reactivatedBy,
}: ReactivateUserParams):
  Promise<void> {
  const normalizedTargetUid =
    targetUid.trim();

  if (!normalizedTargetUid) {
    throw new Error(
      "재활성화할 사용자 UID가 없습니다.",
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      normalizedTargetUid,
    ),
    {
      status: "active",

      active: true,
      disabled: false,

      disabledAt:
        deleteField(),

      disabledBy:
        deleteField(),

      rejectedAt:
        deleteField(),

      rejectedBy:
        deleteField(),

      updatedAt:
        serverTimestamp(),

      updatedBy:
        reactivatedBy,
    },
  );
}

/**
 * 가입 또는 관리자 신청을 거절합니다.
 */
export async function rejectUser({
  targetUid,
  rejectedBy,
}: RejectUserParams):
  Promise<void> {
  const normalizedTargetUid =
    targetUid.trim();

  if (!normalizedTargetUid) {
    throw new Error(
      "거절할 사용자 UID가 없습니다.",
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      normalizedTargetUid,
    ),
    {
      status: "rejected",

      active: false,
      disabled: false,

      rejectedAt:
        serverTimestamp(),

      rejectedBy,

      updatedAt:
        serverTimestamp(),

      updatedBy:
        rejectedBy,
    },
  );
}