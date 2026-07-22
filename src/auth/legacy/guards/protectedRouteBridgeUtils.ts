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
}

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
}: ResolveLegacyAuthGuardPreviewFlagInput = {}): boolean {
  return resolveDevAuthFeatureFlag({
    search,
    envValue,
    isDev,
    queryKey: "newAuthProtectedRoute",
  });
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
