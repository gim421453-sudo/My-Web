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
    | "UNKNOWN_WORKSPACE_ROLE"
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
  currentWorkspaceRole: WorkspaceRole | string | null;
  isSystemOwner: boolean;
  error: string | null;
  allowedRoles: readonly WorkspaceRole[];
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
}

export interface RequireWorkspaceRoleBridgeSnapshot {
  mode: RequireWorkspaceRoleBridgeMode;
  currentRoute?: string;
  requestedRoute?: string;
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
  menuVisible?: boolean;
  warnings: readonly string[];
  decision: WorkspaceRoleDecision;
  childrenRendered: boolean;
  expectedDestination: WorkspaceRoleExpectedDestination;
  redirectAttempted: boolean;
  automaticSignOutOccurred: false;
  authListenerCount?: number;
  workspaceListenerCount?: number;
  firestoreReadCount?: number;
  firestoreWriteAttemptCount?: number;
}

export interface RequireWorkspaceRoleDiagnosticsSnapshot {
  providerMode: RequireWorkspaceRoleBridgeMode | "unknown";
  currentRoute: string;
  requestedRoute: string;
  decision: string;
  accessAllowed: boolean;
  hasWorkspace: boolean;
  workspaceRoleCategory: string;
  globalRoleCategory: string;
  isSystemOwner: boolean;
  allowSystemOwner: boolean;
  requiredWorkspaceRoles: readonly string[];
  allowCount: number;
  denyCount: number;
  redirectCount: number;
  protectedChildRenderCount: number;
  protectedChildBlockedCount: number;
  lastDenyReason: string;
  menuVisible: boolean;
  directUrlBlockedCount: number;
  policyMismatchDetected: boolean;
  authListenerCount: number;
  workspaceListenerCount: number;
  firestoreReadCount: number;
  firestoreWriteAttemptCount: number;
  restoreConflictDetected: boolean;
}

let latestRequireWorkspaceRoleSnapshot: RequireWorkspaceRoleBridgeSnapshot | null = null;
let workspaceRoleAllowCount = 0;
let workspaceRoleDenyCount = 0;
let workspaceRoleRedirectCount = 0;
let workspaceProtectedChildRenderCount = 0;
let workspaceProtectedChildBlockedCount = 0;
let workspaceDirectUrlBlockedCount = 0;
let lastWorkspaceAllowKey: string | null = null;
let lastWorkspaceDenyKey: string | null = null;
let lastWorkspaceRedirectKey: string | null = null;

function workspaceSnapshotKey(snapshot: RequireWorkspaceRoleBridgeSnapshot): string {
  return JSON.stringify({
    mode: snapshot.mode,
    currentRoute: snapshot.currentRoute,
    requestedRoute: snapshot.requestedRoute,
    phase: snapshot.phase,
    status: snapshot.status,
    globalRole: snapshot.globalRole,
    workspaceRole: snapshot.currentWorkspaceRole,
    hasWorkspace: snapshot.hasCurrentWorkspaceId,
    allowSystemOwner: snapshot.allowSystemOwnerBypass,
    allowedRoles: snapshot.allowedRoles,
    reason: snapshot.decision.reason,
    allow: snapshot.decision.allow,
    childrenRendered: snapshot.childrenRendered,
  });
}

function safeRoleCategory(role: string | null | undefined): string {
  if (role === "system_owner") return "system_owner";
  if (role === "user") return "user";
  if (role === "super_manager") return "super_manager";
  if (role === "manager") return "manager";
  if (role === "teacher") return "teacher";
  if (role === "normal") return "normal";
  if (role === "viewer") return "viewer";
  if (role === "print_account") return "print_account";
  if (!role) return "none";
  return "unknown";
}

export function recordRequireWorkspaceRoleBridgeSnapshot(
  snapshot: RequireWorkspaceRoleBridgeSnapshot,
): void {
  latestRequireWorkspaceRoleSnapshot = snapshot;
  const key = workspaceSnapshotKey(snapshot);

  if (snapshot.redirectAttempted && key !== lastWorkspaceRedirectKey) {
    workspaceRoleRedirectCount += 1;
    lastWorkspaceRedirectKey = key;
  }

  if (snapshot.decision.allow && key !== lastWorkspaceAllowKey) {
    workspaceRoleAllowCount += 1;
    lastWorkspaceAllowKey = key;
  }

  if (!snapshot.loading && !snapshot.decision.allow && key !== lastWorkspaceDenyKey) {
    workspaceRoleDenyCount += 1;
    lastWorkspaceDenyKey = key;
    if (snapshot.currentRoute === "workspace-preview") {
      workspaceDirectUrlBlockedCount += 1;
    }
  }

  if (snapshot.childrenRendered) {
    workspaceProtectedChildRenderCount = workspaceRoleAllowCount;
  } else if (!snapshot.loading) {
    workspaceProtectedChildBlockedCount = workspaceRoleDenyCount;
  }
}

export function getRequireWorkspaceRoleDiagnosticsSnapshot(): RequireWorkspaceRoleDiagnosticsSnapshot {
  const snapshot = latestRequireWorkspaceRoleSnapshot;
  const menuVisible = Boolean(snapshot?.menuVisible);
  const accessAllowed = Boolean(snapshot?.decision.allow);

  return {
    providerMode: snapshot?.mode ?? "unknown",
    currentRoute: snapshot?.currentRoute ?? "unknown",
    requestedRoute: snapshot?.requestedRoute ?? "unknown",
    decision: snapshot?.decision.reason ?? "none",
    accessAllowed,
    hasWorkspace: Boolean(snapshot?.hasCurrentWorkspaceId),
    workspaceRoleCategory: safeRoleCategory(snapshot?.currentWorkspaceRole),
    globalRoleCategory: safeRoleCategory(snapshot?.globalRole),
    isSystemOwner: Boolean(snapshot?.isSystemOwner),
    allowSystemOwner: Boolean(snapshot?.allowSystemOwnerBypass),
    requiredWorkspaceRoles: snapshot?.allowedRoles ?? [],
    allowCount: workspaceRoleAllowCount,
    denyCount: workspaceRoleDenyCount,
    redirectCount: workspaceRoleRedirectCount,
    protectedChildRenderCount: workspaceProtectedChildRenderCount,
    protectedChildBlockedCount: workspaceProtectedChildBlockedCount,
    lastDenyReason: snapshot && !snapshot.decision.allow
      ? snapshot.decision.reason
      : "none",
    menuVisible,
    directUrlBlockedCount: workspaceDirectUrlBlockedCount,
    policyMismatchDetected: menuVisible !== accessAllowed,
    authListenerCount: snapshot?.authListenerCount ?? 0,
    workspaceListenerCount: snapshot?.workspaceListenerCount ?? 0,
    firestoreReadCount: snapshot?.firestoreReadCount ?? 0,
    firestoreWriteAttemptCount: snapshot?.firestoreWriteAttemptCount ?? 0,
    restoreConflictDetected: false,
  };
}

function installRequireWorkspaceRoleDiagnostics(): void {
  if (typeof window === "undefined") return;

  (window as typeof window & {
    PMRequireWorkspaceRoleDiagnostics?: {
      snapshot(): RequireWorkspaceRoleDiagnosticsSnapshot;
    };
  }).PMRequireWorkspaceRoleDiagnostics = {
    snapshot: getRequireWorkspaceRoleDiagnosticsSnapshot,
  };
}

installRequireWorkspaceRoleDiagnostics();

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
    case "UNKNOWN_WORKSPACE_ROLE":
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
  defaultEnabled = false,
}: ResolveLegacyAuthGuardPreviewFlagInput & {
  defaultEnabled?: boolean;
} = {}): boolean {
  const resolved = resolveDevAuthFeatureFlag({
    search,
    envValue,
    isDev,
    queryKey: "newAuthRequireWorkspaceRole",
  });

  if (resolved) return true;
  const normalizedEnv = String(envValue ?? "").trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalizedEnv)) return false;

  if (isDev) {
    const normalizedSearch = String(search || "").toLowerCase();
    if (normalizedSearch.includes("newauthrequireworkspacerole=off")) return false;
  }

  return defaultEnabled;
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

  if (!input.currentWorkspaceId && input.requireWorkspace !== false) {
    return denyDecision("WORKSPACE_REQUIRED");
  }

  if (
    input.isSystemOwner &&
    input.globalRole === "system_owner" &&
    input.allowSystemOwnerBypass === true
  ) {
    return allowDecision("SYSTEM_OWNER");
  }

  const currentWorkspaceRole = normalizeWorkspaceRole(input.currentWorkspaceRole);
  if (input.currentWorkspaceRole && !currentWorkspaceRole) {
    return denyDecision("UNKNOWN_WORKSPACE_ROLE");
  }
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
    case "UNKNOWN_WORKSPACE_ROLE":
      return "The workspace role is unknown.";
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
