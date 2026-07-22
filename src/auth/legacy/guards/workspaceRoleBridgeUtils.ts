import type {
  AuthPhase,
} from "../../authTypes";
import type {
  WorkspaceRole,
} from "../../../permissions/roles";
import {
  normalizeWorkspaceRole,
} from "./legacyGuardDecisionUtils";
import type {
  ResolveLegacyAuthGuardPreviewFlagInput,
} from "./legacyGuardTypes";
import {
  resolveDevAuthFeatureFlag,
} from "./requireAuthBridgeUtils";

export type RequireWorkspaceRoleBridgeMode =
  | "legacy"
  | "new";

export type WorkspaceRoleExpectedDestination =
  | "/login"
  | "/pending"
  | "/rejected"
  | "/disabled"
  | "/workspace-select"
  | "/unauthorized"
  | null;

export interface WorkspaceRoleDecision {
  state:
    | "loading"
    | "allow"
    | "deny";
  allow: boolean;
  reason:
    | "AUTH_INITIALIZING"
    | "SESSION_LOADING"
    | "SIGNED_OUT"
    | "ACCOUNT_PENDING"
    | "ACCOUNT_REJECTED"
    | "ACCOUNT_DISABLED"
    | "SESSION_ERROR"
    | "WORKSPACE_REQUIRED"
    | "WORKSPACE_ROLE_MISSING"
    | "WORKSPACE_ROLE_NOT_ALLOWED"
    | "SYSTEM_OWNER"
    | "WORKSPACE_ROLE_ALLOWED";
  expectedDestination: WorkspaceRoleExpectedDestination;
}

export interface WorkspaceRoleAccessInput {
  phase: AuthPhase;
  loading: boolean;
  isAuthenticated: boolean;
  status: string | null;
  globalRole: string | null;
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;
  isSystemOwner: boolean;
  error: string | null;
  allowedRoles: readonly WorkspaceRole[];
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
}

export interface RequireWorkspaceRoleBridgeSnapshot {
  mode: RequireWorkspaceRoleBridgeMode;
  phase: AuthPhase | "legacy";
  loading: boolean;
  isAuthenticated: boolean;
  status: string | null;
  globalRole: string | null;
  currentWorkspaceRole: string | null;
  isSystemOwner: boolean;
  hasCurrentWorkspaceId: boolean;
  allowedRoles: readonly string[];
  requireWorkspace: boolean;
  allowSystemOwnerBypass: boolean;
  warnings: readonly string[];
  decision: WorkspaceRoleDecision;
  childrenRendered: boolean;
  expectedDestination: WorkspaceRoleExpectedDestination;
  redirectAttempted: boolean;
  automaticSignOutOccurred: false;
}

function expectedDestinationForReason(
  reason: WorkspaceRoleDecision["reason"],
): WorkspaceRoleExpectedDestination {
  switch (reason) {
    case "SIGNED_OUT":
      return "/login";
    case "ACCOUNT_PENDING":
      return "/pending";
    case "ACCOUNT_REJECTED":
      return "/rejected";
    case "ACCOUNT_DISABLED":
      return "/disabled";
    case "WORKSPACE_REQUIRED":
      return "/workspace-select";
    case "WORKSPACE_ROLE_MISSING":
    case "WORKSPACE_ROLE_NOT_ALLOWED":
    case "SESSION_ERROR":
      return "/unauthorized";
    default:
      return null;
  }
}

function loadingReasonFromPhase(
  phase: AuthPhase,
): WorkspaceRoleDecision["reason"] {
  return phase === "initializing" ? "AUTH_INITIALIZING" : "SESSION_LOADING";
}

function loadingDecision(
  reason: "AUTH_INITIALIZING" | "SESSION_LOADING",
): WorkspaceRoleDecision {
  return {
    state: "loading",
    allow: false,
    reason,
    expectedDestination: null,
  };
}

function denyDecision(
  reason: Exclude<WorkspaceRoleDecision["reason"], "AUTH_INITIALIZING" | "SESSION_LOADING" | "SYSTEM_OWNER" | "WORKSPACE_ROLE_ALLOWED">,
): WorkspaceRoleDecision {
  return {
    state: "deny",
    allow: false,
    reason,
    expectedDestination: expectedDestinationForReason(reason),
  };
}

function allowDecision(
  reason: "SYSTEM_OWNER" | "WORKSPACE_ROLE_ALLOWED",
): WorkspaceRoleDecision {
  return {
    state: "allow",
    allow: true,
    reason,
    expectedDestination: null,
  };
}

export function resolveNewAuthRequireWorkspaceRoleFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveLegacyAuthGuardPreviewFlagInput = {}): boolean {
  return resolveDevAuthFeatureFlag({
    search,
    envValue,
    isDev,
    queryKey: "newAuthRequireWorkspaceRole",
  });
}

export function requireWorkspaceRoleModeForFlag(
  enabled: boolean,
): RequireWorkspaceRoleBridgeMode {
  return enabled ? "new" : "legacy";
}

export function decideWorkspaceRoleAccess(
  input: WorkspaceRoleAccessInput,
): WorkspaceRoleDecision {
  if (
    input.loading ||
    input.phase === "initializing" ||
    input.phase === "loading_session"
  ) {
    return loadingDecision(input.phase === "initializing"
      ? "AUTH_INITIALIZING"
      : "SESSION_LOADING");
  }

  if (input.error || input.phase === "error") {
    return denyDecision("SESSION_ERROR");
  }

  if (!input.isAuthenticated || input.phase === "signed_out") {
    return denyDecision("SIGNED_OUT");
  }

  if (input.status === "pending") return denyDecision("ACCOUNT_PENDING");
  if (input.status === "rejected") return denyDecision("ACCOUNT_REJECTED");
  if (input.status === "disabled") return denyDecision("ACCOUNT_DISABLED");
  if (input.status !== "active") return denyDecision("SESSION_ERROR");

  if (
    input.isSystemOwner &&
    input.globalRole === "system_owner" &&
    input.allowSystemOwnerBypass === true
  ) {
    return allowDecision("SYSTEM_OWNER");
  }

  if (!input.currentWorkspaceId && input.requireWorkspace !== false) {
    return denyDecision("WORKSPACE_REQUIRED");
  }

  const currentWorkspaceRole = normalizeWorkspaceRole(input.currentWorkspaceRole);
  if (!currentWorkspaceRole) {
    return denyDecision("WORKSPACE_ROLE_MISSING");
  }

  if (input.allowedRoles.includes(currentWorkspaceRole)) {
    return allowDecision("WORKSPACE_ROLE_ALLOWED");
  }

  return denyDecision("WORKSPACE_ROLE_NOT_ALLOWED");
}

export function workspaceRoleGuardMessage(
  decision: WorkspaceRoleDecision,
): string {
  switch (decision.reason) {
    case "AUTH_INITIALIZING":
    case "SESSION_LOADING":
      return "Checking workspace permissions.";
    case "SIGNED_OUT":
      return "Login is required.";
    case "ACCOUNT_PENDING":
      return "Account approval is pending.";
    case "ACCOUNT_REJECTED":
      return "Account approval was rejected.";
    case "ACCOUNT_DISABLED":
      return "This account is disabled.";
    case "WORKSPACE_REQUIRED":
      return "A workspace connection is required.";
    case "WORKSPACE_ROLE_MISSING":
      return "No workspace role is available.";
    case "WORKSPACE_ROLE_NOT_ALLOWED":
      return "You do not have the required workspace role.";
    case "SESSION_ERROR":
      return "Workspace permission could not be verified. Please try again.";
    case "SYSTEM_OWNER":
    case "WORKSPACE_ROLE_ALLOWED":
      return "Access allowed.";
  }
}

export function isRequireWorkspaceRoleRedirectLoop(
  currentPath: string,
  destination: WorkspaceRoleExpectedDestination,
): boolean {
  if (!destination) return false;
  const normalizedPath = currentPath.endsWith("/") && currentPath !== "/"
    ? currentPath.slice(0, -1)
    : currentPath;
  return normalizedPath === destination;
}

export function redirectDestinationForWorkspaceRoleDecision({
  decision,
  currentPath,
}: {
  decision: WorkspaceRoleDecision;
  currentPath: string;
}): WorkspaceRoleExpectedDestination {
  if (decision.state === "loading" || decision.allow) return null;
  if (isRequireWorkspaceRoleRedirectLoop(currentPath, decision.expectedDestination)) {
    return null;
  }
  return decision.expectedDestination;
}

export function shouldNavigateWorkspaceRoleDecision(
  decision: WorkspaceRoleDecision,
): boolean {
  return (
    decision.reason === "SIGNED_OUT" ||
    decision.reason === "WORKSPACE_ROLE_MISSING" ||
    decision.reason === "WORKSPACE_ROLE_NOT_ALLOWED"
  );
}

export function workspaceRoleDecisionLabel(
  decision: WorkspaceRoleDecision,
): string {
  if (decision.state === "loading") return "loading";
  if (decision.allow) return "allow";
  return "deny";
}
