import type {
  ReactNode,
} from "react";

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
}

export function ProtectedRoute({
  menuKey,
  children,
}: ProtectedRouteProps) {
  const {
    session,
    loading,
  } = useAuth();

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