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
import {
  decideProtectedRouteAccess,
  protectedRouteDecisionLabel,
  protectedRouteMessage,
  redirectDestinationForProtectedRouteDecision,
  type ProtectedRouteBridgeSnapshot,
} from "./protectedRouteBridgeUtils";

interface NewAuthProtectedRouteBridgeProps {
  menuKey?: string;
  children: ReactNode;
  previewMode?: boolean;
  onSnapshot?: (snapshot: ProtectedRouteBridgeSnapshot) => void;
}

function NewAuthProtectedRouteInner({
  menuKey,
  children,
  previewMode = false,
  onSnapshot,
}: NewAuthProtectedRouteBridgeProps) {
  const location = useLocation();
  const legacy = useLegacyAuthAdapter();
  const decision = decideProtectedRouteAccess({
    phase: legacy.phase,
    loading: legacy.loading,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    globalRole: legacy.session?.globalRole ?? null,
    currentWorkspaceId: legacy.workspaceId,
    currentWorkspaceRole: legacy.currentRole,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
    menuKey,
  });
  const destination = redirectDestinationForProtectedRouteDecision({
    decision,
    currentPath: location.pathname,
  });
  const childrenRendered = decision.allow;

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
      warnings: legacy.session?.warningCodes ?? [],
      decision,
      childrenRendered,
      expectedDestination: decision.expectedDestination,
      redirectAttempted: Boolean(destination && !previewMode),
      automaticSignOutOccurred: false,
    });
  }, [
    childrenRendered,
    decision,
    destination,
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
    previewMode,
  ]);

  if (decision.state === "loading") {
    return <div>{protectedRouteMessage(decision)}</div>;
  }

  if (childrenRendered) {
    return <>{children}</>;
  }

  if (destination && !previewMode && decision.reason === "SIGNED_OUT") {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return (
    <div>
      <p>{protectedRouteMessage(decision)}</p>
      {previewMode ? (
        <p>
          ProtectedRoute decision: {protectedRouteDecisionLabel(decision)} / {decision.reason}
        </p>
      ) : null}
    </div>
  );
}

export function NewAuthProtectedRouteBridge({
  menuKey,
  children,
  previewMode,
  onSnapshot,
}: NewAuthProtectedRouteBridgeProps) {
  return (
    <AuthProvider>
      <LegacyAuthAdapterProvider>
        <NewAuthProtectedRouteInner
          menuKey={menuKey}
          previewMode={previewMode}
          onSnapshot={onSnapshot}
        >
          {children}
        </NewAuthProtectedRouteInner>
      </LegacyAuthAdapterProvider>
    </AuthProvider>
  );
}
