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
  | "devices"
  | "notifications"
  | "notices"
  | "admin-preview"
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

const APP_NEXT_ROUTES = new Set<AppNextRoute>([
  "dashboard",
  "devices",
  "notifications",
  "notices",
  "admin-preview",
  "access-denied",
  "login",
  "pending",
  "rejected",
  "disabled",
  "error",
]);

const PROTECTED_ROUTES = new Set<AppNextRoute>([
  "notices",
  "admin-preview",
]);

const APP_NEXT_ADMIN_MENU_KEY = "admin";

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
