import { ReactNode } from "react";
import { canAccessMenu, WorkspaceRole } from "../services/permissionService";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ menuKey, children }: { menuKey?: string; children: ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div>권한 정보 로딩 중입니다.</div>;
  if (!user) return <div>로그인이 필요합니다.</div>;
  if (!user.emailVerified) return <div>이메일 인증 후 사용할 수 있습니다.</div>;
  if (menuKey && !role) return <div>권한 정보를 불러오지 못했습니다. 다시 로그인해 주세요.</div>;
  if (menuKey && !canAccessMenu(role as WorkspaceRole, menuKey)) return <div>접근 권한이 없습니다.</div>;
  return <>{children}</>;
}
