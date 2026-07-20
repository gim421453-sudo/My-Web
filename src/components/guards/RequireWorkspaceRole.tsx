import type { ReactNode } from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  type WorkspaceRole,
} from "../../constants/roles";

import { useAuth } from "../../contexts/AuthContext";

import {
  hasWorkspaceRole,
  isSystemOwner,
} from "../../utils/permissions";

interface RequireWorkspaceRoleProps {
  children: ReactNode;
  allowedRoles: WorkspaceRole[];
}

export default function RequireWorkspaceRole({
  children,
  allowedRoles,
}: RequireWorkspaceRoleProps) {
  const {
    session,
    loading,
  } = useAuth();

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
      allowedRoles,
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