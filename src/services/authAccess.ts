import type {
  User,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  GLOBAL_ROLES,
  USER_STATUSES,
  isWorkspaceRole,
  type GlobalRole,
  type UserStatus,
} from "../constants/roles";

import type {
  AppSession,
} from "../types/auth";

type UnknownDocument =
  Record<string, unknown>;

function resolveUserStatus(
  data: UnknownDocument,
): UserStatus {
  if (
    data.status ===
      USER_STATUSES.ACTIVE ||
    data.status ===
      USER_STATUSES.PENDING ||
    data.status ===
      USER_STATUSES.REJECTED ||
    data.status ===
      USER_STATUSES.DISABLED
  ) {
    return data.status;
  }

  /**
   * 기존 사용자 문서 임시 호환용입니다.
   * 최종적으로 status 필드 하나만 사용하게 되면
   * 이 부분을 제거합니다.
   */
  if (
    data.disabled === true ||
    data.active === false
  ) {
    return USER_STATUSES.DISABLED;
  }

  if (data.active === true) {
    return USER_STATUSES.ACTIVE;
  }

  return USER_STATUSES.PENDING;
}

function resolveGlobalRole(
  value: unknown,
): GlobalRole {
  if (
    value ===
    GLOBAL_ROLES.SYSTEM_OWNER
  ) {
    return GLOBAL_ROLES.SYSTEM_OWNER;
  }

  return GLOBAL_ROLES.USER;
}

export function validateUserStatus(
  status: UserStatus,
): void {
  if (
    status ===
    USER_STATUSES.DISABLED
  ) {
    throw new Error(
      "비활성화된 계정입니다.",
    );
  }

  if (
    status ===
    USER_STATUSES.REJECTED
  ) {
    throw new Error(
      "가입 또는 관리자 신청이 거절된 계정입니다.",
    );
  }

  if (
    status ===
    USER_STATUSES.PENDING
  ) {
    throw new Error(
      "가입 승인을 기다리고 있는 계정입니다.",
    );
  }

  if (
    status !==
    USER_STATUSES.ACTIVE
  ) {
    throw new Error(
      "현재 사용할 수 없는 계정입니다.",
    );
  }
}

export async function loadAppSession(
  firebaseUser: User,
): Promise<AppSession> {
  const userRef = doc(
    db,
    "users",
    firebaseUser.uid,
  );

  const userSnapshot =
    await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error(
      "Firestore 사용자 문서가 존재하지 않습니다.",
    );
  }

  const userData =
    userSnapshot.data();

  const status =
    resolveUserStatus(userData);

  validateUserStatus(status);

  const globalRole =
    resolveGlobalRole(
      userData.globalRole,
    );

  const currentWorkspaceId =
    typeof userData.currentWorkspaceId ===
      "string" &&
    userData.currentWorkspaceId.trim() !== ""
      ? userData.currentWorkspaceId
      : null;

  const baseSession: AppSession = {
    uid: firebaseUser.uid,

    email:
      typeof userData.email === "string"
        ? userData.email
        : firebaseUser.email,

    displayName:
      typeof userData.displayName ===
        "string"
        ? userData.displayName
        : firebaseUser.displayName,

    globalRole,
    status,

    currentWorkspaceId,
    currentRole: null,
  };

  /**
   * 워크스페이스가 없어도
   * 서비스 로그인 자체는 허용합니다.
   */
  if (!currentWorkspaceId) {
    return baseSession;
  }

  const memberRef = doc(
    db,
    "workspaces",
    currentWorkspaceId,
    "members",
    firebaseUser.uid,
  );

  const memberSnapshot =
    await getDoc(memberRef);

  /**
   * 이전 워크스페이스가 삭제됐거나
   * 멤버 문서가 없더라도 로그인은 허용합니다.
   *
   * 단, 워크스페이스 권한은 부여하지 않습니다.
   */
  if (!memberSnapshot.exists()) {
    return {
      ...baseSession,
      currentWorkspaceId: null,
      currentRole: null,
    };
  }

  const memberData =
    memberSnapshot.data();

  const memberStatus =
    typeof memberData.status === "string"
      ? memberData.status
      : "disabled";

  if (memberStatus !== "active") {
    return {
      ...baseSession,
      currentWorkspaceId: null,
      currentRole: null,
    };
  }

  if (
    !isWorkspaceRole(
      memberData.role,
    )
  ) {
    console.error(
      "잘못된 워크스페이스 역할:",
      memberData.role,
    );

    return {
      ...baseSession,
      currentWorkspaceId: null,
      currentRole: null,
    };
  }

  return {
    ...baseSession,
    currentWorkspaceId,
    currentRole:
      memberData.role,
  };
}