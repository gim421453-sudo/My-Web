import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasPermission } from "../permissions/permissionService";
import type { Permission } from "../permissions/permissionTypes";
import { useAuth } from "./useAuth";

interface RouteGuardProps {
  children: ReactNode;
  requireWorkspace?: boolean;
  requiredPermission?: Permission;
}

export function RouteGuard({
  children,
  requireWorkspace = false,
  requiredPermission,
}: RouteGuardProps) {
  const { phase, session } = useAuth();

  if (phase === "initializing" || phase === "loading_session") {
    return <div>로그인 정보를 확인 중입니다.</div>;
  }

  if (phase === "signed_out") {
    return <Navigate to="/login" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (phase === "account_action_required") {
    return <Navigate to="/account-status" replace />;
  }

  if (phase === "error") {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireWorkspace && !session.currentWorkspaceId) {
    return <Navigate to="/select-workspace" replace />;
  }

  if (
    requiredPermission &&
    !hasPermission(session, requiredPermission)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

