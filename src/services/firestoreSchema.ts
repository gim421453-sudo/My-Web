import type {
  GlobalRole,
  UserStatus,
  WorkspaceRole,
} from "../constants/roles";

export const collections = {
  users: "users",
  workspaces: "workspaces",

  /**
   * 반드시 다음 중첩 경로에 사용합니다.
   *
   * workspaces/{workspaceId}/members/{uid}
   *
   * 최상위 members 컬렉션으로 사용하면 안 됩니다.
   */
  workspaceMembers: "members",

  invitations: "invitations",
  userDevices: "user_devices",
  notifications: "notifications",
} as const;

/**
 * Firestore:
 * users/{uid}
 *
 * 실제 사용자 문서에 저장되는 타입입니다.
 *
 * currentRole은 저장하지 않습니다.
 * role과 workspaceRole도 저장하지 않습니다.
 */
export type UserProfileDoc = {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;

  globalRole: GlobalRole;
  status: UserStatus;

  currentWorkspaceId: string | null;

  createdAt: unknown;
  updatedAt?: unknown;
  lastLoginAt: unknown | null;

  approvedAt?: unknown;
  approvedBy?: string | null;

  pendingInviteCodeId?:
    | string
    | null;

  pendingWorkspaceId?:
    | string
    | null;

  /**
   * 기존 문서 호환용입니다.
   * 모든 코드가 status를 사용하도록 변경된 뒤 제거합니다.
   */
  active?: boolean;
  disabled?: boolean;

  disabledAt?: unknown;
  disabledBy?: string | null;

  rejectedAt?: unknown;
  rejectedBy?: string | null;
};

/**
 * Firestore:
 * workspaces/{workspaceId}
 */
export type WorkspaceDoc = {
  workspaceId: string;
  name: string;
  ownerUid: string;
  plan: string;

  createdAt: unknown;
  updatedAt: unknown;
};

/**
 * Firestore:
 * workspaces/{workspaceId}/members/{uid}
 *
 * 역할의 실제 저장 위치입니다.
 */
export type WorkspaceMemberDoc = {
  uid: string;
  role: WorkspaceRole;

  status:
    | "active"
    | "invited"
    | "disabled";

  /**
   * 사용자 목록을 표시할 때
   * users 문서를 한 명씩 다시 읽지 않도록
   * 목록용 기본 정보를 복제해 둡니다.
   */
  displayName: string;
  email: string | null;

  joinedAt: unknown;
  updatedAt?: unknown;

  invitedBy: string | null;
  updatedBy?: string | null;
};

/**
 * 화면에서 사용할 조회 결과 타입입니다.
 *
 * id와 workspaceId는 문서 내부 저장값이 아니라
 * Firestore 문서 경로에서 만들어 붙이는 값입니다.
 */
export type WorkspaceMemberRecord =
  WorkspaceMemberDoc & {
    id: string;
    workspaceId: string;
  };

export type UserDeviceDoc = {
  deviceId: string;
  uid: string;

  workspaceId:
    | string
    | null;

  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;

  lastLoginAt: unknown;
  lastActiveAt: unknown;

  pushToken: string | null;
  isCurrentDevice: boolean;
  revokedAt: unknown | null;
};

export type NotificationDoc = {
  notificationId: string;

  workspaceId:
    | string
    | null;

  uid: string;
  type: string;
  title: string;
  message: string;
  read: boolean;

  createdAt: unknown;
  relatedId: string | null;
};