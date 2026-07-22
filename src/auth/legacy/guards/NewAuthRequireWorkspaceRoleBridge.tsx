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
  getAuthProviderDiagnosticsSnapshot,
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
  recordRequireWorkspaceRoleBridgeSnapshot,
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
  wrapProviders?: boolean;
  currentRoute?: string;
  requestedRoute?: string;
  menuVisible?: boolean;
}

function NewAuthRequireWorkspaceRoleInner({
  children,
  allowedRoles,
  requireWorkspace = true,
  allowSystemOwnerBypass = false,
  previewMode = false,
  onSnapshot,
  currentRoute,
  requestedRoute,
  menuVisible = false,
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
    const authProviderDiagnostics = getAuthProviderDiagnosticsSnapshot();
    const snapshot: RequireWorkspaceRoleBridgeSnapshot = {
      mode: "new",
      currentRoute,
      requestedRoute,
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
      menuVisible,
      warnings: legacy.session?.warningCodes ?? [],
      decision,
      childrenRendered,
      expectedDestination: decision.expectedDestination,
      redirectAttempted: shouldNavigate,
      automaticSignOutOccurred: false,
      authListenerCount: authProviderDiagnostics.authStateListenerCount,
      workspaceListenerCount: 0,
      firestoreReadCount: 0,
      firestoreWriteAttemptCount: 0,
    };
    recordRequireWorkspaceRoleBridgeSnapshot(snapshot);
    onSnapshot?.(snapshot);
  }, [
    allowSystemOwnerBypass,
    allowedRoles,
    childrenRendered,
    currentRoute,
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
    menuVisible,
    onSnapshot,
    requestedRoute,
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
  wrapProviders = true,
  currentRoute,
  requestedRoute,
  menuVisible,
}: NewAuthRequireWorkspaceRoleBridgeProps) {
  if (!wrapProviders) {
    return (
      <NewAuthRequireWorkspaceRoleInner
        allowedRoles={allowedRoles}
        requireWorkspace={requireWorkspace}
        allowSystemOwnerBypass={allowSystemOwnerBypass}
        previewMode={previewMode}
        onSnapshot={onSnapshot}
        currentRoute={currentRoute}
        requestedRoute={requestedRoute}
        menuVisible={menuVisible}
      >
        {children}
      </NewAuthRequireWorkspaceRoleInner>
    );
  }

  return (
    <AuthProvider>
      <LegacyAuthAdapterProvider>
        <NewAuthRequireWorkspaceRoleInner
          allowedRoles={allowedRoles}
          requireWorkspace={requireWorkspace}
          allowSystemOwnerBypass={allowSystemOwnerBypass}
          previewMode={previewMode}
          onSnapshot={onSnapshot}
          currentRoute={currentRoute}
          requestedRoute={requestedRoute}
          menuVisible={menuVisible}
        >
          {children}
        </NewAuthRequireWorkspaceRoleInner>
      </LegacyAuthAdapterProvider>
    </AuthProvider>
  );
}
