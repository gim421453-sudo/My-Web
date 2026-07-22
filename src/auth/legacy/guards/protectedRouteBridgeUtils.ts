import type {
  AuthPhase,
} from "../../authTypes";
import type {
  WorkspaceRole,
} from "../../../permissions/roles";
import {
  canAccessMenu,
  resolvePermissionRole,
  type PermissionRole,
} from "../../../services/permissionService";
import type {
  GuardDecision,
  GuardExpectedDestination,
  ResolveLegacyAuthGuardPreviewFlagInput,
} from "./legacyGuardTypes";
import {
  resolveDevAuthFeatureFlag,
} from "./requireAuthBridgeUtils";

export type ProtectedRouteBridgeMode =
  | "legacy"
  | "new";

export interface ProtectedRouteDecision {
  state:
    | "loading"
    | "allow"
    | "deny";
  allow: boolean;
  reason:
    | GuardDecision["reason"]
    | "MENU_ROLE_MISSING"
    | "MENU_ACCESS_DENIED";
  expectedDestination: GuardExpectedDestination;
  permissionRole: PermissionRole | null;
}

export interface ProtectedRouteDecisionInput {
  phase: AuthPhase;
  loading: boolean;
  isAuthenticated: boolean;
  status: string | null;
  globalRole: string | null;
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;
  isSystemOwner: boolean;
  error: string | null;
  menuKey?: string;
}

export interface ProtectedRouteBridgeSnapshot {
  mode: ProtectedRouteBridgeMode;
  currentRoute?: string;
  requestedRoute?: string;
  requiredPolicy?: string;
  phase: AuthPhase | "legacy";
  loading: boolean;
  isAuthenticated: boolean;
  status: string | null;
  globalRole: string | null;
  currentWorkspaceRole: string | null;
  isSystemOwner: boolean;
  hasCurrentWorkspaceId: boolean;
  warnings: readonly string[];
  decision: ProtectedRouteDecision;
  childrenRendered: boolean;
  expectedDestination: GuardExpectedDestination;
  redirectAttempted: boolean;
  automaticSignOutOccurred: false;
  authListenerCount?: number;
  firestoreReadCount?: number;
  firestoreWriteAttemptCount?: number;
}

export interface ProtectedRouteDiagnosticsSnapshot {
  providerMode: ProtectedRouteBridgeMode | "unknown";
  currentRoute: string;
  requestedRoute: string;
  requiredPolicy: string;
  decision: string;
  accessAllowed: boolean;
  redirectCount: number;
  allowCount: number;
  denyCount: number;
  protectedChildRenderCount: number;
  protectedChildBlockedCount: number;
  lastDenyReason: string;
  globalRoleCategory: string;
  workspaceRoleCategory: string;
  hasWorkspace: boolean;
  isSystemOwner: boolean;
  menuVisible: boolean;
  directUrlBlockedCount: number;
  policyMismatchDetected: boolean;
  authListenerCount: number;
  firestoreReadCount: number;
  firestoreWriteAttemptCount: number;
  restoreConflictDetected: boolean;
}

let latestProtectedRouteSnapshot: ProtectedRouteBridgeSnapshot | null = null;
let protectedRouteRedirectCount = 0;
let protectedRouteAllowCount = 0;
let protectedRouteDenyCount = 0;
let protectedChildRenderCount = 0;
let protectedChildBlockedCount = 0;
let directUrlBlockedCount = 0;
let lastRedirectKey: string | null = null;
let lastAllowKey: string | null = null;
let lastDenyKey: string | null = null;

function protectedRouteSnapshotKey(snapshot: ProtectedRouteBridgeSnapshot): string {
  return JSON.stringify({
    mode: snapshot.mode,
    currentRoute: snapshot.currentRoute,
    requestedRoute: snapshot.requestedRoute,
    policy: snapshot.requiredPolicy,
    phase: snapshot.phase,
    status: snapshot.status,
    reason: snapshot.decision.reason,
    allow: snapshot.decision.allow,
    childrenRendered: snapshot.childrenRendered,
  });
}

function safeRoleCategory(role: string | null | undefined): string {
  if (role === "system_owner") return "system_owner";
  if (role === "super_manager") return "super_manager";
  if (role === "manager") return "manager";
  if (role === "teacher") return "teacher";
  if (role === "normal") return "normal";
  if (role === "viewer") return "viewer";
  if (role === "print_account") return "print_account";
  if (!role) return "none";
  return "unknown";
}

export function recordProtectedRouteBridgeSnapshot(
  snapshot: ProtectedRouteBridgeSnapshot,
): void {
  latestProtectedRouteSnapshot = snapshot;
  const key = protectedRouteSnapshotKey(snapshot);

  if (snapshot.redirectAttempted && key !== lastRedirectKey) {
    protectedRouteRedirectCount += 1;
    lastRedirectKey = key;
  }

  if (snapshot.decision.allow && key !== lastAllowKey) {
    protectedRouteAllowCount += 1;
    lastAllowKey = key;
  }

  if (!snapshot.loading && !snapshot.decision.allow && key !== lastDenyKey) {
    protectedRouteDenyCount += 1;
    lastDenyKey = key;
    if (snapshot.currentRoute === "admin-preview") {
      directUrlBlockedCount += 1;
    }
  }

  if (snapshot.childrenRendered) {
    protectedChildRenderCount = protectedRouteAllowCount;
  } else if (!snapshot.loading) {
    protectedChildBlockedCount = protectedRouteDenyCount;
  }
}

export function getProtectedRouteDiagnosticsSnapshot(): ProtectedRouteDiagnosticsSnapshot {
  const snapshot = latestProtectedRouteSnapshot;
  const permissionRole = snapshot?.decision.permissionRole ?? null;
  const menuVisible = snapshot?.requiredPolicy === "admin"
    ? snapshot.decision.allow
    : Boolean(snapshot?.decision.allow);

  return {
    providerMode: snapshot?.mode ?? "unknown",
    currentRoute: snapshot?.currentRoute ?? "unknown",
    requestedRoute: snapshot?.requestedRoute ?? "unknown",
    requiredPolicy: snapshot?.requiredPolicy ?? "none",
    decision: snapshot?.decision.reason ?? "none",
    accessAllowed: Boolean(snapshot?.decision.allow),
    redirectCount: protectedRouteRedirectCount,
    allowCount: protectedRouteAllowCount,
    denyCount: protectedRouteDenyCount,
    protectedChildRenderCount,
    protectedChildBlockedCount,
    lastDenyReason: snapshot && !snapshot.decision.allow
      ? snapshot.decision.reason
      : "none",
    globalRoleCategory: safeRoleCategory(snapshot?.globalRole),
    workspaceRoleCategory: safeRoleCategory(snapshot?.currentWorkspaceRole),
    hasWorkspace: Boolean(snapshot?.hasCurrentWorkspaceId),
    isSystemOwner: Boolean(snapshot?.isSystemOwner),
    menuVisible,
    directUrlBlockedCount,
    policyMismatchDetected: menuVisible !== Boolean(snapshot?.decision.allow && permissionRole),
    authListenerCount: snapshot?.authListenerCount ?? 0,
    firestoreReadCount: snapshot?.firestoreReadCount ?? 0,
    firestoreWriteAttemptCount: snapshot?.firestoreWriteAttemptCount ?? 0,
    restoreConflictDetected: false,
  };
}

function installProtectedRouteDiagnostics(): void {
  if (typeof window === "undefined") return;

  (window as typeof window & {
    PMProtectedRouteDiagnostics?: {
      snapshot(): ProtectedRouteDiagnosticsSnapshot;
    };
  }).PMProtectedRouteDiagnostics = {
    snapshot: getProtectedRouteDiagnosticsSnapshot,
  };
}

installProtectedRouteDiagnostics();

function expectedDestinationForStatus(
  reason: ProtectedRouteDecision["reason"],
): GuardExpectedDestination {
  switch (reason) {
    case "SIGNED_OUT":
      return "/login";
    case "ACCOUNT_PENDING":
      return "/pending";
    case "ACCOUNT_REJECTED":
      return "/rejected";
    case "ACCOUNT_DISABLED":
      return "/disabled";
    case "SESSION_ERROR":
      return "/forbidden";
    default:
      return null;
  }
}

function loadingReasonFromPhase(
  phase: AuthPhase,
): ProtectedRouteDecision["reason"] {
  return phase === "initializing" ? "AUTH_INITIALIZING" : "SESSION_LOADING";
}

export function resolveNewAuthProtectedRouteFlag({
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
    queryKey: "newAuthProtectedRoute",
  });

  if (resolved) return true;
  const normalizedEnv = String(envValue ?? "").trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalizedEnv)) return false;

  if (isDev) {
    const normalizedSearch = String(search || "").toLowerCase();
    if (normalizedSearch.includes("newauthprotectedroute=off")) return false;
  }

  return defaultEnabled;
}

export function protectedRouteModeForFlag(
  enabled: boolean,
): ProtectedRouteBridgeMode {
  return enabled ? "new" : "legacy";
}

export function decideProtectedRouteAccess(
  input: ProtectedRouteDecisionInput,
): ProtectedRouteDecision {
  if (
    input.loading ||
    input.phase === "initializing" ||
    input.phase === "loading_session"
  ) {
    return {
      state: "loading",
      allow: false,
      reason: loadingReasonFromPhase(input.phase),
      expectedDestination: null,
      permissionRole: null,
    };
  }

  if (input.error || input.phase === "error") {
    return {
      state: "deny",
      allow: false,
      reason: "SESSION_ERROR",
      expectedDestination: expectedDestinationForStatus("SESSION_ERROR"),
      permissionRole: null,
    };
  }

  if (!input.isAuthenticated || input.phase === "signed_out") {
    return {
      state: "deny",
      allow: false,
      reason: "SIGNED_OUT",
      expectedDestination: expectedDestinationForStatus("SIGNED_OUT"),
      permissionRole: null,
    };
  }

  if (input.status === "pending") {
    return {
      state: "deny",
      allow: false,
      reason: "ACCOUNT_PENDING",
      expectedDestination: expectedDestinationForStatus("ACCOUNT_PENDING"),
      permissionRole: null,
    };
  }

  if (input.status === "rejected") {
    return {
      state: "deny",
      allow: false,
      reason: "ACCOUNT_REJECTED",
      expectedDestination: expectedDestinationForStatus("ACCOUNT_REJECTED"),
      permissionRole: null,
    };
  }

  if (input.status === "disabled") {
    return {
      state: "deny",
      allow: false,
      reason: "ACCOUNT_DISABLED",
      expectedDestination: expectedDestinationForStatus("ACCOUNT_DISABLED"),
      permissionRole: null,
    };
  }

  if (input.status !== "active") {
    return {
      state: "deny",
      allow: false,
      reason: "SESSION_ERROR",
      expectedDestination: expectedDestinationForStatus("SESSION_ERROR"),
      permissionRole: null,
    };
  }

  const permissionRole = resolvePermissionRole(
    input.globalRole === "system_owner" || input.isSystemOwner
      ? "system_owner"
      : null,
    input.currentWorkspaceRole,
  );

  if (input.menuKey && !permissionRole) {
    return {
      state: "deny",
      allow: false,
      reason: "MENU_ROLE_MISSING",
      expectedDestination: null,
      permissionRole,
    };
  }

  if (
    input.menuKey &&
    !canAccessMenu(permissionRole, input.menuKey)
  ) {
    return {
      state: "deny",
      allow: false,
      reason: "MENU_ACCESS_DENIED",
      expectedDestination: null,
      permissionRole,
    };
  }

  return {
    state: "allow",
    allow: true,
    reason: input.currentWorkspaceId
      ? "AUTHENTICATED_ACTIVE"
      : "AUTHENTICATED_WITHOUT_WORKSPACE",
    expectedDestination: null,
    permissionRole,
  };
}

export function protectedRouteMessage(
  decision: ProtectedRouteDecision,
): string {
  switch (decision.reason) {
    case "AUTH_INITIALIZING":
    case "SESSION_LOADING":
      return "Checking account information.";
    case "SIGNED_OUT":
      return "Login is required.";
    case "ACCOUNT_PENDING":
      return "Account approval is pending.";
    case "ACCOUNT_REJECTED":
      return "Account approval was rejected.";
    case "ACCOUNT_DISABLED":
      return "This account is disabled.";
    case "SESSION_ERROR":
      return "Account status could not be verified. Please try again.";
    case "MENU_ROLE_MISSING":
      return "No workspace role is available for this menu.";
    case "MENU_ACCESS_DENIED":
      return "You do not have permission to view this screen.";
    case "AUTHENTICATED_WITHOUT_WORKSPACE":
    case "AUTHENTICATED_ACTIVE":
    case "SYSTEM_OWNER":
    case "WORKSPACE_ROLE_ALLOWED":
      return "Access allowed.";
    case "WORKSPACE_REQUIRED":
      return "A workspace is required.";
    case "WORKSPACE_ROLE_MISSING":
    case "WORKSPACE_ROLE_NOT_ALLOWED":
      return "You do not have the required workspace role.";
  }
}

export function isProtectedRouteRedirectLoop(
  currentPath: string,
  destination: GuardExpectedDestination,
): boolean {
  if (!destination) return false;
  const normalizedPath = currentPath.endsWith("/") && currentPath !== "/"
    ? currentPath.slice(0, -1)
    : currentPath;
  return normalizedPath === destination;
}

export function redirectDestinationForProtectedRouteDecision({
  decision,
  currentPath,
}: {
  decision: ProtectedRouteDecision;
  currentPath: string;
}): GuardExpectedDestination {
  if (decision.state === "loading" || decision.allow) return null;
  if (isProtectedRouteRedirectLoop(currentPath, decision.expectedDestination)) {
    return null;
  }
  return decision.expectedDestination;
}

export function protectedRouteDecisionLabel(
  decision: ProtectedRouteDecision,
): string {
  if (decision.state === "loading") return "loading";
  if (decision.allow) return "allow";
  return "deny";
}
