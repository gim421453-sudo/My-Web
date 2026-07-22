import {
  useEffect,
  type ReactNode,
} from "react";

import {
  NewAuthProtectedRouteBridge,
} from "../auth/legacy/guards/NewAuthProtectedRouteBridge";
import {
  currentSearchFromDocument,
} from "../auth/legacy/guards/requireAuthBridgeUtils";
import {
  protectedRouteModeForFlag,
  resolveNewAuthProtectedRouteFlag,
  type ProtectedRouteBridgeSnapshot,
} from "../auth/legacy/guards/protectedRouteBridgeUtils";

import {
  canAccessMenu,
  resolvePermissionRole,
} from "../services/permissionService";

import {
  useAuth,
} from "../context/AuthContext";

interface ProtectedRouteProps {
  menuKey?: string;
  children: ReactNode;
  previewMode?: boolean;
  onSnapshot?: (snapshot: ProtectedRouteBridgeSnapshot) => void;
}

function LegacyProtectedRouteBranch({
  menuKey,
  children,
  previewMode = false,
  onSnapshot,
}: ProtectedRouteProps) {
  const {
    session,
    loading,
  } = useAuth();

  useEffect(() => {
    onSnapshot?.({
      mode: "legacy",
      phase: "legacy",
      loading,
      isAuthenticated: Boolean(session),
      status: session ? "legacy" : null,
      globalRole: session?.globalRole ?? null,
      currentWorkspaceRole: session?.currentRole ?? null,
      isSystemOwner: session?.globalRole === "system_owner",
      hasCurrentWorkspaceId: Boolean(session?.currentWorkspaceId),
      warnings: [],
      decision: loading
        ? {
            state: "loading",
            allow: false,
            reason: "SESSION_LOADING",
            expectedDestination: null,
            permissionRole: null,
          }
        : session
          ? {
              state: "allow",
              allow: true,
              reason: session.currentWorkspaceId
                ? "AUTHENTICATED_ACTIVE"
                : "AUTHENTICATED_WITHOUT_WORKSPACE",
              expectedDestination: null,
              permissionRole: resolvePermissionRole(
                session.globalRole,
                session.currentRole,
              ),
            }
          : {
              state: "deny",
              allow: false,
              reason: "SIGNED_OUT",
              expectedDestination: "/login",
              permissionRole: null,
            },
      childrenRendered: Boolean(session) && !loading,
      expectedDestination: !loading && !session ? "/login" : null,
      redirectAttempted: false,
      automaticSignOutOccurred: false,
    });
  }, [
    loading,
    onSnapshot,
    previewMode,
    session,
  ]);

  if (loading) {
    return (
      <div>
        권한 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        로그인이 필요합니다.
      </div>
    );
  }

  const permissionRole =
    resolvePermissionRole(
      session.globalRole,
      session.currentRole,
    );

  if (
    menuKey &&
    !permissionRole
  ) {
    return (
      <div>
        현재 연결된 워크스페이스가 없습니다.
      </div>
    );
  }

  if (
    menuKey &&
    !canAccessMenu(
      permissionRole,
      menuKey,
    )
  ) {
    return (
      <div>
        접근 권한이 없습니다.
      </div>
    );
  }

  return <>{children}</>;
}

export function ProtectedRoute({
  menuKey,
  children,
  previewMode,
  onSnapshot,
}: ProtectedRouteProps) {
  const mode = protectedRouteModeForFlag(resolveNewAuthProtectedRouteFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE,
    isDev: import.meta.env.DEV,
  }));

  if (mode === "new") {
    return (
      <NewAuthProtectedRouteBridge
        menuKey={menuKey}
        previewMode={previewMode}
        onSnapshot={onSnapshot}
      >
        {children}
      </NewAuthProtectedRouteBridge>
    );
  }

  return (
    <LegacyProtectedRouteBranch
      menuKey={menuKey}
      previewMode={previewMode}
      onSnapshot={onSnapshot}
    >
      {children}
    </LegacyProtectedRouteBranch>
  );
}
