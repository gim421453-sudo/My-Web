import type { VerifiedActor } from "../auth/verifiedActor.js";

export const WORKSPACE_ROLES = Object.freeze([
  "super_manager",
  "manager",
  "teacher",
  "normal",
  "viewer",
  "print_account",
] as const);

export type WorkspaceRole = typeof WORKSPACE_ROLES[number];
export type SystemOwnerSource = "trusted_migration" | "system_bootstrap";
export type MembershipSource =
  | "invite"
  | "admin_approval"
  | "trusted_migration"
  | "student_link"
  | "system_bootstrap";

export type SystemOwnerResolution =
  | Readonly<{ state: "ACTIVE"; source: SystemOwnerSource }>
  | Readonly<{ state: "NOT_OWNER" }>
  | Readonly<{ state: "DISABLED" }>
  | Readonly<{ state: "MIGRATION_REQUIRED" }>
  | Readonly<{ state: "MALFORMED" }>
  | Readonly<{ state: "READ_ERROR" }>;

export type WorkspaceMembershipResolution =
  | Readonly<{ state: "ACTIVE"; role: WorkspaceRole; source: MembershipSource }>
  | Readonly<{ state: "MISSING" }>
  | Readonly<{ state: "DISABLED" }>
  | Readonly<{ state: "INACTIVE" }>
  | Readonly<{ state: "MIGRATION_REQUIRED" }>
  | Readonly<{ state: "MALFORMED" }>
  | Readonly<{ state: "WRONG_UID" }>
  | Readonly<{ state: "WRONG_WORKSPACE" }>
  | Readonly<{ state: "UNKNOWN_ROLE" }>
  | Readonly<{ state: "READ_ERROR" }>;

export type UnresolvedAuthority = Readonly<{ state: "UNRESOLVED" }>;

export interface AuthorityDocumentSnapshot {
  exists: boolean;
  data?: Record<string, unknown>;
}

export interface AuthorityDocumentReader {
  getDocument(pathSegments: readonly string[]): Promise<AuthorityDocumentSnapshot>;
}

export interface AuthorizationContext {
  readonly actor: VerifiedActor;
  readonly operation: string;
  readonly global: Readonly<{
    systemOwner: SystemOwnerResolution | UnresolvedAuthority;
  }>;
  readonly workspace: Readonly<{
    workspaceId: string | null;
    membership: WorkspaceMembershipResolution | UnresolvedAuthority;
    role: WorkspaceRole | null;
  }>;
  readonly capability: Readonly<{ resolution: "unresolved" }>;
  readonly assignment: Readonly<{ resolution: "unresolved" }>;
  readonly resolution: "complete";
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && (WORKSPACE_ROLES as readonly string[]).includes(value);
}
