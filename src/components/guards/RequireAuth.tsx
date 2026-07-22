import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  NewAuthRequireAuthBridge,
} from "../../auth/legacy/guards/NewAuthRequireAuthBridge";
import {
  currentSearchFromDocument,
  requireAuthModeForFlag,
  resolveNewAuthRequireAuthFlag,
  type RequireAuthBridgeSnapshot,
} from "../../auth/legacy/guards/requireAuthBridgeUtils";
import type {
  GuardDecision,
} from "../../auth/legacy/guards/legacyGuardTypes";

interface RequireAuthProps {
  children: ReactNode;
  previewMode?: boolean;
  onSnapshot?: (snapshot: RequireAuthBridgeSnapshot) => void;
}

function legacyDecisionForSnapshot({
  loading,
  session,
}: {
  loading: boolean;
  session: unknown;
}): GuardDecision {
  if (loading) {
    return {
      state: "loading",
      allow: false,
      reason: "SESSION_LOADING",
      expectedDestination: null,
    };
  }

  if (!session) {
    return {
      state: "deny",
      allow: false,
      reason: "SIGNED_OUT",
      expectedDestination: "/login",
    };
  }

  return {
    state: "allow",
    allow: true,
    reason: "AUTHENTICATED_ACTIVE",
    expectedDestination: null,
  };
}

function LegacyRequireAuthBranch({
  children,
  previewMode = false,
  onSnapshot,
}: RequireAuthProps) {
  const {
    session,
    loading,
  } = useAuth();
  const decision = legacyDecisionForSnapshot({
    loading,
    session,
  });

  useEffect(() => {
    onSnapshot?.({
      mode: "legacy",
      phase: "legacy",
      loading,
      isAuthenticated: Boolean(session),
      status: session ? "legacy" : null,
      globalRole: null,
      isSystemOwner: false,
      hasCurrentWorkspaceId: false,
      decision,
      childrenRendered: Boolean(session) && !loading,
      expectedDestination: decision.expectedDestination,
      redirectAttempted: Boolean(!previewMode && !loading && !session),
      automaticSignOutOccurred: false,
    });
  }, [
    decision,
    loading,
    onSnapshot,
    previewMode,
    session,
  ]);

  if (loading) {
    return <div>로그인 정보를 확인 중입니다.</div>;
  }

  if (!session) {
    if (previewMode) {
      return <div>로그인이 필요합니다.</div>;
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <>{children}</>;
}

export default function RequireAuth({
  children,
  previewMode,
  onSnapshot,
}: RequireAuthProps) {
  const mode = requireAuthModeForFlag(resolveNewAuthRequireAuthFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH,
    isDev: import.meta.env.DEV,
  }));

  if (mode === "new") {
    return (
      <NewAuthRequireAuthBridge
        previewMode={previewMode}
        onSnapshot={onSnapshot}
      >
        {children}
      </NewAuthRequireAuthBridge>
    );
  }

  return (
    <LegacyRequireAuthBranch
      previewMode={previewMode}
      onSnapshot={onSnapshot}
    >
      {children}
    </LegacyRequireAuthBranch>
  );
}
