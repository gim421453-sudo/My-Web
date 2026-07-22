import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  NewAuthRequireWorkspaceRoleBridge,
} from "../../auth/legacy/guards/NewAuthRequireWorkspaceRoleBridge";
import {
  currentSearchFromDocument,
} from "../../auth/legacy/guards/requireAuthBridgeUtils";
import {
  requireWorkspaceRoleModeForFlag,
  resolveNewAuthRequireWorkspaceRoleFlag,
  type RequireWorkspaceRoleBridgeSnapshot,
} from "../../auth/legacy/guards/workspaceRoleBridgeUtils";

import {
  type WorkspaceRole,
} from "../../constants/roles";

import { useAuth } from "../../context/AuthContext";

import {
  hasWorkspaceRole,
  isSystemOwner,
} from "../../utils/permissions";

interface RequireWorkspaceRoleProps {
  children: ReactNode;
  allowedRoles: readonly WorkspaceRole[];
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
  previewMode?: boolean;
  onSnapshot?: (snapshot: RequireWorkspaceRoleBridgeSnapshot) => void;
}

function LegacyRequireWorkspaceRoleBranch({
  children,
  allowedRoles,
  requireWorkspace = true,
  allowSystemOwnerBypass = true,
  previewMode = false,
  onSnapshot,
}: RequireWorkspaceRoleProps) {
  const {
    session,
    loading,
  } = useAuth();

  useEffect(() => {
    const allowedBySystemOwner = Boolean(session && isSystemOwner(session));
    const allowedByRole = Boolean(session && hasWorkspaceRole(
      session,
      [...allowedRoles],
    ));

    onSnapshot?.({
      mode: "legacy",
      phase: "legacy",
      loading,
      isAuthenticated: Boolean(session),
      status: session ? "legacy" : null,
      globalRole: session?.globalRole ?? null,
      currentWorkspaceRole: session?.currentRole ?? null,
      isSystemOwner: allowedBySystemOwner,
      hasCurrentWorkspaceId: Boolean(session?.currentWorkspaceId),
      allowedRoles,
      requireWorkspace,
      allowSystemOwnerBypass,
      warnings: [],
      decision: loading
        ? {
            state: "loading",
            allow: false,
            reason: "SESSION_LOADING",
            expectedDestination: null,
          }
        : !session
          ? {
              state: "deny",
              allow: false,
              reason: "SIGNED_OUT",
              expectedDestination: "/login",
            }
          : allowedBySystemOwner
            ? {
                state: "allow",
                allow: true,
                reason: "SYSTEM_OWNER",
                expectedDestination: null,
              }
            : allowedByRole
              ? {
                  state: "allow",
                  allow: true,
                  reason: "WORKSPACE_ROLE_ALLOWED",
                  expectedDestination: null,
                }
              : {
                  state: "deny",
                  allow: false,
                  reason: "WORKSPACE_ROLE_NOT_ALLOWED",
                  expectedDestination: "/unauthorized",
                },
      childrenRendered: Boolean(!loading && session && (allowedBySystemOwner || allowedByRole)),
      expectedDestination: !loading && !session
        ? "/login"
        : !loading && session && !allowedBySystemOwner && !allowedByRole
          ? "/unauthorized"
          : null,
      redirectAttempted: false,
      automaticSignOutOccurred: false,
    });
  }, [
    allowSystemOwnerBypass,
    allowedRoles,
    loading,
    onSnapshot,
    previewMode,
    requireWorkspace,
    session,
  ]);

  if (loading) {
    return <div>권한을 확인 중입니다.</div>;
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    !isSystemOwner(session) &&
    !hasWorkspaceRole(
      session,
      [...allowedRoles],
    )
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return <>{children}</>;
}

export default function RequireWorkspaceRole({
  children,
  allowedRoles,
  requireWorkspace,
  allowSystemOwnerBypass,
  previewMode,
  onSnapshot,
}: RequireWorkspaceRoleProps) {
  const mode = requireWorkspaceRoleModeForFlag(resolveNewAuthRequireWorkspaceRoleFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE,
    isDev: import.meta.env.DEV,
  }));

  if (mode === "new") {
    return (
      <NewAuthRequireWorkspaceRoleBridge
        allowedRoles={allowedRoles}
        requireWorkspace={requireWorkspace}
        allowSystemOwnerBypass={allowSystemOwnerBypass}
        previewMode={previewMode}
        onSnapshot={onSnapshot}
      >
        {children}
      </NewAuthRequireWorkspaceRoleBridge>
    );
  }

  return (
    <LegacyRequireWorkspaceRoleBranch
      allowedRoles={allowedRoles}
      requireWorkspace={requireWorkspace}
      allowSystemOwnerBypass={allowSystemOwnerBypass}
      previewMode={previewMode}
      onSnapshot={onSnapshot}
    >
      {children}
    </LegacyRequireWorkspaceRoleBranch>
  );
}
