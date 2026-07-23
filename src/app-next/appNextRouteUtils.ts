import type {
  AppNextAccountState,
} from "./appNextUtils";
import type {
  AppSession,
} from "../auth/authTypes";
import {
  canAccessMenu,
  resolvePermissionRole,
} from "../services/permissionService";

export type AppNextRoute =
  | "dashboard"
  | "account"
  | "settings-readonly"
  | "timetable-readonly"
  | "devices"
  | "notifications"
  | "notices"
  | "admin-preview"
  | "workspace-preview"
  | "workspace-required"
  | "access-denied"
  | "login"
  | "pending"
  | "rejected"
  | "disabled"
  | "error";

export type AppNextRouteFallbackReason =
  | "none"
  | "unknown-route"
  | "signed-out"
  | "account-pending"
  | "account-rejected"
  | "account-disabled"
  | "session-error";

export interface ResolvedAppNextRoute {
  requestedRoute: string;
  currentRoute: AppNextRoute;
  fallbackReason: AppNextRouteFallbackReason;
  isProtectedRoute: boolean;
}

export interface AppNextAuthRouteMatrixInput {
  requestedRoute: string;
  currentRoute: AppNextRoute;
  state: AppNextAccountState;
  session: AppSession | null | undefined;
  requireAuthEnabled: boolean;
  protectedRouteEnabled: boolean;
  requireWorkspaceRoleEnabled: boolean;
}

export interface AppNextAuthRouteMatrixSnapshot {
  currentRoute: string;
  requestedRoute: string;
  accountStatus: string;
  globalRoleCategory: string;
  workspaceRoleCategory: string;
  hasWorkspace: boolean;
  requireAuthDecision: string;
  protectedRouteDecision: string;
  requireWorkspaceRoleDecision: string;
  finalDecision: string;
  renderedScreen: string;
  menuVisible: boolean;
  directUrlAllowed: boolean;
  protectedChildRenderAllowed: boolean;
  policyMismatchDetected: boolean;
  requiresAuth: boolean;
  requiresProtectedRoute: boolean;
  requiresWorkspaceRole: boolean;
  workspaceRequired: boolean;
  allowSystemOwner: boolean;
  requiredWorkspaceRoles: readonly string[];
}

const APP_NEXT_ROUTES = new Set<AppNextRoute>([
  "dashboard",
  "account",
  "settings-readonly",
  "timetable-readonly",
  "devices",
  "notifications",
  "notices",
  "admin-preview",
  "workspace-preview",
  "workspace-required",
  "access-denied",
  "login",
  "pending",
  "rejected",
  "disabled",
  "error",
]);

const PROTECTED_ROUTES = new Set<AppNextRoute>([
  "dashboard",
  "account",
  "settings-readonly",
  "timetable-readonly",
  "devices",
  "notifications",
  "notices",
  "admin-preview",
  "workspace-preview",
]);

const APP_NEXT_ADMIN_MENU_KEY = "admin";
const APP_NEXT_WORKSPACE_PREVIEW_ROLES = new Set([
  "super_manager",
  "manager",
  "teacher",
]);

function roleCategory(role: string | null | undefined): string {
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

export function appNextRouteHash(route: AppNextRoute): string {
  return `#/${route}`;
}

export function appNextRouteFromHash(hash: string | null | undefined): string {
  const normalized = String(hash || "")
    .replace(/^#\/?/, "")
    .trim()
    .toLowerCase();
  return normalized || "dashboard";
}

function stateFallbackRoute(state: AppNextAccountState): {
  route: AppNextRoute;
  reason: AppNextRouteFallbackReason;
} {
  if (state === "signed_out" || state === "loading") {
    return {
      route: "login",
      reason: "signed-out",
    };
  }
  if (state === "pending") {
    return {
      route: "pending",
      reason: "account-pending",
    };
  }
  if (state === "rejected") {
    return {
      route: "rejected",
      reason: "account-rejected",
    };
  }
  if (state === "disabled") {
    return {
      route: "disabled",
      reason: "account-disabled",
    };
  }
  if (state === "error" || state === "quota_exceeded") {
    return {
      route: "error",
      reason: "session-error",
    };
  }
  return {
    route: "dashboard",
    reason: "unknown-route",
  };
}

export function resolveAppNextRoute({
  hash,
  state,
}: {
  hash: string | null | undefined;
  state: AppNextAccountState;
}): ResolvedAppNextRoute {
  const requestedRoute = appNextRouteFromHash(hash);
  const knownRoute = APP_NEXT_ROUTES.has(requestedRoute as AppNextRoute)
    ? requestedRoute as AppNextRoute
    : null;

  if (!knownRoute) {
    const fallback = stateFallbackRoute(state);
    return {
      requestedRoute,
      currentRoute: fallback.route,
      fallbackReason: fallback.reason,
      isProtectedRoute: PROTECTED_ROUTES.has(fallback.route),
    };
  }

  if (state === "signed_out" || state === "loading") {
    return {
      requestedRoute,
      currentRoute: "login",
      fallbackReason: knownRoute === "login" ? "none" : "signed-out",
      isProtectedRoute: false,
    };
  }

  if (state === "pending") {
    return {
      requestedRoute,
      currentRoute: "pending",
      fallbackReason: knownRoute === "pending" ? "none" : "account-pending",
      isProtectedRoute: false,
    };
  }

  if (state === "rejected") {
    return {
      requestedRoute,
      currentRoute: "rejected",
      fallbackReason: knownRoute === "rejected" ? "none" : "account-rejected",
      isProtectedRoute: false,
    };
  }

  if (state === "disabled") {
    return {
      requestedRoute,
      currentRoute: "disabled",
      fallbackReason: knownRoute === "disabled" ? "none" : "account-disabled",
      isProtectedRoute: false,
    };
  }

  if (state === "error" || state === "quota_exceeded") {
    return {
      requestedRoute,
      currentRoute: "error",
      fallbackReason: knownRoute === "error" ? "none" : "session-error",
      isProtectedRoute: false,
    };
  }

  return {
    requestedRoute,
    currentRoute: knownRoute,
    fallbackReason: "none",
    isProtectedRoute: PROTECTED_ROUTES.has(knownRoute),
  };
}

export function canShowAppNextAdminPreview(
  session: AppSession | null | undefined,
): boolean {
  if (!session || session.status !== "active") return false;
  const permissionRole = resolvePermissionRole(
    session.globalRole,
    session.currentWorkspaceRole,
  );
  return canAccessMenu(permissionRole, APP_NEXT_ADMIN_MENU_KEY);
}

export function canShowAppNextWorkspacePreview(
  session: AppSession | null | undefined,
): boolean {
  if (!session || session.status !== "active") return false;
  if (!session.currentWorkspaceId) return false;
  if (session.isSystemOwner && session.globalRole === "system_owner") return true;
  return APP_NEXT_WORKSPACE_PREVIEW_ROLES.has(session.currentWorkspaceRole ?? "");
}

export function appNextAdminPreviewPolicySnapshot(
  session: AppSession | null | undefined,
) {
  const permissionRole = session
    ? resolvePermissionRole(session.globalRole, session.currentWorkspaceRole)
    : null;

  return {
    route: "admin-preview",
    capability: APP_NEXT_ADMIN_MENU_KEY,
    accessAllowed: canShowAppNextAdminPreview(session),
    globalRoleCategory: session?.globalRole ?? "none",
    workspaceRoleCategory: session?.currentWorkspaceRole ?? "none",
    isSystemOwner: Boolean(session?.isSystemOwner),
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    permissionRoleCategory: permissionRole ?? "none",
  };
}

export function appNextWorkspacePreviewPolicySnapshot(
  session: AppSession | null | undefined,
) {
  const workspacePresent = Boolean(session?.currentWorkspaceId);
  const systemOwnerExplicitAllow = Boolean(
    workspacePresent &&
    session?.isSystemOwner &&
    session.globalRole === "system_owner",
  );
  const accessAllowed = canShowAppNextWorkspacePreview(session);
  const decision = !workspacePresent
    ? "NO_WORKSPACE"
    : systemOwnerExplicitAllow
      ? "SYSTEM_OWNER_EXPLICIT_ALLOW"
      : accessAllowed
        ? "ALLOWED_WORKSPACE_ROLE"
        : roleCategory(session?.currentWorkspaceRole) === "unknown"
          ? "UNKNOWN_WORKSPACE_ROLE"
          : session?.currentWorkspaceRole
          ? "WORKSPACE_ROLE_NOT_ALLOWED"
          : "NO_WORKSPACE_ROLE";

  return {
    route: "workspace-preview",
    accessAllowed,
    workspacePresent,
    workspaceRoleCategory: session?.currentWorkspaceRole ?? "none",
    globalRoleCategory: session?.globalRole ?? "none",
    isSystemOwner: Boolean(session?.isSystemOwner),
    allowSystemOwner: true,
    requiredWorkspaceRoles: Array.from(APP_NEXT_WORKSPACE_PREVIEW_ROLES),
    decision,
  };
}

function requireAuthDecisionForState(state: AppNextAccountState): string {
  if (state === "loading") return "LOADING";
  if (state === "signed_out") return "SIGNED_OUT";
  if (state === "pending") return "ACCOUNT_PENDING";
  if (state === "rejected") return "ACCOUNT_REJECTED";
  if (state === "disabled") return "ACCOUNT_DISABLED";
  if (state === "error" || state === "quota_exceeded") return "SESSION_ERROR";
  return "AUTHENTICATED_ACTIVE";
}

function routeUsesRequireAuth(route: AppNextRoute): boolean {
  return ![
    "login",
    "pending",
    "rejected",
    "disabled",
    "error",
  ].includes(route);
}

function routeUsesProtectedRoute(route: AppNextRoute): boolean {
  return route === "admin-preview" || route === "workspace-preview";
}

function routeUsesRequireWorkspaceRole(route: AppNextRoute): boolean {
  return route === "workspace-preview";
}

export function appNextAuthRouteMatrixSnapshot({
  requestedRoute,
  currentRoute,
  state,
  session,
  requireAuthEnabled,
  protectedRouteEnabled,
  requireWorkspaceRoleEnabled,
}: AppNextAuthRouteMatrixInput): AppNextAuthRouteMatrixSnapshot {
  const accountDecision = requireAuthDecisionForState(state);
  const active = state === "active";
  const requiresAuth = routeUsesRequireAuth(currentRoute);
  const requiresProtectedRoute = routeUsesProtectedRoute(currentRoute);
  const requiresWorkspaceRole = routeUsesRequireWorkspaceRole(currentRoute);
  const adminMenuVisible = canShowAppNextAdminPreview(session);
  const workspaceMenuVisible = canShowAppNextWorkspacePreview(session);
  const workspacePolicy = appNextWorkspacePreviewPolicySnapshot(session);

  const protectedRouteDecision = currentRoute === "admin-preview"
    ? !protectedRouteEnabled
      ? "PROTECTED_ROUTE_FLAG_OFF"
      : adminMenuVisible
        ? "ALLOWED_PROTECTED_ROUTE"
        : "PROTECTED_ROUTE_DENIED"
    : currentRoute === "workspace-preview"
      ? !protectedRouteEnabled
        ? "PROTECTED_ROUTE_FLAG_OFF"
        : "ALLOWED_PROTECTED_ROUTE"
      : "NOT_APPLICABLE";

  const requireWorkspaceRoleDecision = currentRoute === "workspace-preview"
    ? !requireWorkspaceRoleEnabled
      ? "REQUIRE_WORKSPACE_ROLE_FLAG_OFF"
      : workspacePolicy.decision
    : "NOT_APPLICABLE";

  const menuVisible = currentRoute === "admin-preview"
    ? adminMenuVisible
    : currentRoute === "workspace-preview"
      ? workspaceMenuVisible
      : ["dashboard", "account", "settings-readonly", "timetable-readonly", "devices", "notifications", "notices"].includes(currentRoute) && active;

  let finalDecision = "ALLOW_ROUTE";
  if (state === "loading") {
    finalDecision = "SHOW_LOADING";
  } else if (state === "signed_out") {
    finalDecision = currentRoute === "login" ? "SHOW_LOGIN" : "BLOCKED_SIGNED_OUT";
  } else if (["pending", "rejected", "disabled", "error", "quota_exceeded"].includes(state)) {
    finalDecision = "SHOW_ACCOUNT_STATUS";
  } else if (requiresAuth && !requireAuthEnabled) {
    finalDecision = "REQUIRE_AUTH_FLAG_OFF";
  } else if (currentRoute === "admin-preview") {
    finalDecision = adminMenuVisible && protectedRouteEnabled
      ? "ALLOW_ROUTE"
      : protectedRouteDecision;
  } else if (currentRoute === "workspace-preview") {
    finalDecision = !protectedRouteEnabled
      ? "PROTECTED_ROUTE_FLAG_OFF"
      : !requireWorkspaceRoleEnabled
        ? "REQUIRE_WORKSPACE_ROLE_FLAG_OFF"
        : workspacePolicy.accessAllowed
          ? "ALLOW_ROUTE"
          : workspacePolicy.decision;
  } else if (
    (currentRoute === "notices" || currentRoute === "timetable-readonly") &&
    !session?.currentWorkspaceId
  ) {
    finalDecision = "ALLOW_ROUTE_WITH_DATA_BLOCKED";
  }

  const directUrlAllowed = finalDecision === "ALLOW_ROUTE" ||
    finalDecision === "ALLOW_ROUTE_WITH_DATA_BLOCKED" ||
    finalDecision === "SHOW_LOGIN" ||
    finalDecision === "SHOW_ACCOUNT_STATUS" ||
    finalDecision === "SHOW_LOADING";
  const menuRoute = currentRoute === "admin-preview" || currentRoute === "workspace-preview";

  return {
    currentRoute,
    requestedRoute,
    accountStatus: session?.status ?? state,
    globalRoleCategory: roleCategory(session?.globalRole),
    workspaceRoleCategory: roleCategory(session?.currentWorkspaceRole),
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    requireAuthDecision: accountDecision,
    protectedRouteDecision,
    requireWorkspaceRoleDecision,
    finalDecision,
    renderedScreen: currentRoute,
    menuVisible,
    directUrlAllowed,
    protectedChildRenderAllowed: finalDecision === "ALLOW_ROUTE",
    policyMismatchDetected: menuRoute ? menuVisible !== directUrlAllowed : false,
    requiresAuth,
    requiresProtectedRoute,
    requiresWorkspaceRole,
    workspaceRequired: currentRoute === "workspace-preview" || currentRoute === "timetable-readonly",
    allowSystemOwner: currentRoute === "workspace-preview",
    requiredWorkspaceRoles: currentRoute === "workspace-preview"
      ? Array.from(APP_NEXT_WORKSPACE_PREVIEW_ROLES)
      : [],
  };
}
