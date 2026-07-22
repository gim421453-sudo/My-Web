import {
  useEffect,
  type ReactNode,
} from "react";
import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  AuthProvider,
} from "../../AuthProvider";
import {
  LegacyAuthAdapterProvider,
  useLegacyAuthAdapter,
} from "../LegacyAuthAdapter";
import type {
  WorkspaceRole,
} from "../../../constants/roles";
import {
  decideWorkspaceRoleAccess,
  redirectDestinationForWorkspaceRoleDecision,
  shouldNavigateWorkspaceRoleDecision,
  workspaceRoleDecisionLabel,
  workspaceRoleGuardMessage,
  type RequireWorkspaceRoleBridgeSnapshot,
} from "./workspaceRoleBridgeUtils";

interface NewAuthRequireWorkspaceRoleBridgeProps {
  children: ReactNode;
  allowedRoles: readonly WorkspaceRole[];
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
  previewMode?: boolean;
  onSnapshot?: (snapshot: RequireWorkspaceRoleBridgeSnapshot) => void;
}

function NewAuthRequireWorkspaceRoleInner({
  children,
  allowedRoles,
  requireWorkspace = true,
  allowSystemOwnerBypass = false,
  previewMode = false,
  onSnapshot,
}: NewAuthRequireWorkspaceRoleBridgeProps) {
  const location = useLocation();
  const legacy = useLegacyAuthAdapter();
  const decision = decideWorkspaceRoleAccess({
    phase: legacy.phase,
    loading: legacy.loading,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    globalRole: legacy.session?.globalRole ?? null,
    currentWorkspaceId: legacy.workspaceId,
    currentWorkspaceRole: legacy.currentRole,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
    allowedRoles,
    requireWorkspace,
    allowSystemOwnerBypass,
  });
  const destination = redirectDestinationForWorkspaceRoleDecision({
    decision,
    currentPath: location.pathname,
  });
  const childrenRendered = decision.allow;
  const shouldNavigate = Boolean(destination && !previewMode && shouldNavigateWorkspaceRoleDecision(decision));

  useEffect(() => {
    onSnapshot?.({
      mode: "new",
      phase: legacy.phase,
      loading: legacy.loading,
      isAuthenticated: legacy.isAuthenticated,
      status: legacy.status,
      globalRole: legacy.session?.globalRole ?? null,
      currentWorkspaceRole: legacy.currentRole,
      isSystemOwner: legacy.isSystemOwner,
      hasCurrentWorkspaceId: Boolean(legacy.workspaceId),
      allowedRoles,
      requireWorkspace,
      allowSystemOwnerBypass,
      warnings: legacy.session?.warningCodes ?? [],
      decision,
      childrenRendered,
      expectedDestination: decision.expectedDestination,
      redirectAttempted: shouldNavigate,
      automaticSignOutOccurred: false,
    });
  }, [
    allowSystemOwnerBypass,
    allowedRoles,
    childrenRendered,
    decision,
    legacy.currentRole,
    legacy.isAuthenticated,
    legacy.isSystemOwner,
    legacy.loading,
    legacy.phase,
    legacy.session?.globalRole,
    legacy.session?.warningCodes,
    legacy.status,
    legacy.workspaceId,
    onSnapshot,
    requireWorkspace,
    shouldNavigate,
  ]);

  if (decision.state === "loading") {
    return <div>{workspaceRoleGuardMessage(decision)}</div>;
  }

  if (childrenRendered) {
    return <>{children}</>;
  }

  if (destination && shouldNavigate) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return (
    <div>
      <p>{workspaceRoleGuardMessage(decision)}</p>
      {previewMode ? (
        <p>
          RequireWorkspaceRole decision: {workspaceRoleDecisionLabel(decision)} / {decision.reason}
        </p>
      ) : null}
    </div>
  );
}

export function NewAuthRequireWorkspaceRoleBridge({
  children,
  allowedRoles,
  requireWorkspace,
  allowSystemOwnerBypass,
  previewMode,
  onSnapshot,
}: NewAuthRequireWorkspaceRoleBridgeProps) {
  return (
    <AuthProvider>
      <LegacyAuthAdapterProvider>
        <NewAuthRequireWorkspaceRoleInner
          allowedRoles={allowedRoles}
          requireWorkspace={requireWorkspace}
          allowSystemOwnerBypass={allowSystemOwnerBypass}
          previewMode={previewMode}
          onSnapshot={onSnapshot}
        >
          {children}
        </NewAuthRequireWorkspaceRoleInner>
      </LegacyAuthAdapterProvider>
    </AuthProvider>
  );
}
