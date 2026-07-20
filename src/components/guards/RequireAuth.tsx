import type { ReactNode } from "react";

import {
  Navigate,
} from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({
  children,
}: RequireAuthProps) {
  const {
    session,
    loading,
  } = useAuth();

  if (loading) {
    return <div>로그인 정보를 확인 중입니다.</div>;
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <>{children}</>;
}