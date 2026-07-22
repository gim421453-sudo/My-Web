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
  createLegacyGuardInput,
  decideLegacyRequireAuth,
  guardDecisionLabel,
} from "./legacyGuardDecisionUtils";
import {
  redirectDestinationForRequireAuthDecision,
  requireAuthBridgeMessage,
  shouldRenderRequireAuthChildren,
  type RequireAuthBridgeSnapshot,
} from "./requireAuthBridgeUtils";

interface NewAuthRequireAuthBridgeProps {
  children: ReactNode;
  previewMode?: boolean;
  onSnapshot?: (snapshot: RequireAuthBridgeSnapshot) => void;
}

function NewAuthRequireAuthInner({
  children,
  previewMode = false,
  onSnapshot,
}: NewAuthRequireAuthBridgeProps) {
  const location = useLocation();
  const legacy = useLegacyAuthAdapter();
  const decision = decideLegacyRequireAuth(createLegacyGuardInput({
    phase: legacy.phase,
    loading: legacy.loading,
    session: legacy.session,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    currentRole: legacy.currentRole,
    workspaceId: legacy.workspaceId,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
  }));
  const destination = redirectDestinationForRequireAuthDecision({
    decision,
    currentPath: location.pathname,
  });
  const childrenRendered = shouldRenderRequireAuthChildren(decision);

  useEffect(() => {
    onSnapshot?.({
      mode: "new",
      phase: legacy.phase,
      loading: legacy.loading,
      isAuthenticated: legacy.isAuthenticated,
      status: legacy.status,
      globalRole: legacy.session?.globalRole ?? null,
      isSystemOwner: legacy.isSystemOwner,
      hasCurrentWorkspaceId: Boolean(legacy.workspaceId),
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
    legacy.isAuthenticated,
    legacy.isSystemOwner,
    legacy.loading,
    legacy.phase,
    legacy.session?.globalRole,
    legacy.status,
    legacy.workspaceId,
    onSnapshot,
    previewMode,
  ]);

  if (decision.state === "loading") {
    return <div>{requireAuthBridgeMessage(decision)}</div>;
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
      <p>{requireAuthBridgeMessage(decision)}</p>
      {previewMode ? (
        <p>
          RequireAuth 판단: {guardDecisionLabel(decision)} / {decision.reason}
        </p>
      ) : null}
    </div>
  );
}

export function NewAuthRequireAuthBridge({
  children,
  previewMode,
  onSnapshot,
}: NewAuthRequireAuthBridgeProps) {
  return (
    <AuthProvider>
      <LegacyAuthAdapterProvider>
        <NewAuthRequireAuthInner
          previewMode={previewMode}
          onSnapshot={onSnapshot}
        >
          {children}
        </NewAuthRequireAuthInner>
      </LegacyAuthAdapterProvider>
    </AuthProvider>
  );
}
