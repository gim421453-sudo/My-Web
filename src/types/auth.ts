import type {
  GlobalRole,
  UserStatus,
  WorkspaceRole,
} from "../constants/roles";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;

  globalRole: GlobalRole;
  status: UserStatus;

  currentWorkspaceId:
    | string
    | null;
}

export interface WorkspaceMembership {
  uid: string;
  role: WorkspaceRole;

  status:
    | "active"
    | "invited"
    | "disabled";

  displayName?: string;
  email?: string | null;
}

export interface AppSession {
  uid: string;
  email: string | null;
  displayName: string | null;

  globalRole: GlobalRole;
  status: UserStatus;

  currentWorkspaceId:
    | string
    | null;

  /**
   * Firestore users 문서에 저장하지 않습니다.
   * 로그인 시 멤버 문서에서 계산합니다.
   */
  currentRole:
    | WorkspaceRole
    | null;
}