export const collections = {
  users: "users",
  workspaces: "workspaces",
  workspaceMembers: "workspace_members",
  invitations: "invitations",
  userDevices: "user_devices",
  notifications: "notifications"
} as const;

export type WorkspaceRole =
  | "system_owner"
  | "super_manager"
  | "manager"
  | "teacher"
  | "normal"
  | "viewer"
  | "print_account";

export type UserProfileDoc = {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  globalRole: "system_owner" | "user";
  currentWorkspaceId?: string;
  currentRole?: WorkspaceRole;
  createdAt: unknown;
  lastLoginAt: unknown;
  disabled: boolean;
};

export type WorkspaceDoc = {
  workspaceId: string;
  name: string;
  ownerUid: string;
  plan: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type WorkspaceMemberDoc = {
  id: string;
  workspaceId: string;
  uid: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  joinedAt: unknown;
  invitedBy: string | null;
};

export type UserDeviceDoc = {
  deviceId: string;
  uid: string;
  workspaceId: string;
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
  workspaceId: string;
  uid: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: unknown;
  relatedId: string | null;
};
