import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";
import {
  hasPermission,
} from "../permissions/permissionService";
import type {
  Permission,
} from "../permissions/permissionTypes";

export const FIRST_REACT_SCREEN_REQUIRED_PERMISSION: Permission = "workspace.read";

export interface ResolveFirstReactScreenAuthFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface FirstReactScreenPhaseMessage {
  title: string;
  body: string;
  tone: "muted" | "success" | "warning" | "error";
}

export interface FirstReactScreenGuardResult {
  allowed: boolean;
  reason:
    | "allowed"
    | "signed-out"
    | "loading"
    | "account-action-required"
    | "workspace-missing"
    | "permission-denied"
    | "error";
  message: string;
}

function parseBooleanSwitch(value: unknown): boolean | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function queryValue(search: string, key: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;

  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    if (decodeURIComponent(rawKey || "") === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, " "));
    }
  }

  return null;
}

export function resolveFirstReactScreenAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveFirstReactScreenAuthFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "newAuthScreen"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function firstReactScreenPhaseMessage(
  phase: AuthPhase,
  session: AppSession | null,
  errorCode?: string,
): FirstReactScreenPhaseMessage {
  if (phase === "initializing") {
    return {
      title: "인증 상태 확인 중",
      body: "Firebase Auth 상태를 확인하고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "signed_out") {
    return {
      title: "로그인이 필요합니다",
      body: "운영 로그인 화면으로 자동 이동하지 않습니다. 기존 앱에서 로그인한 뒤 다시 확인하세요.",
      tone: "warning",
    };
  }

  if (phase === "loading_session") {
    return {
      title: "사용자 세션을 불러오는 중",
      body: "신규 AuthProvider가 users 문서와 멤버십을 읽어 AppSession을 구성하고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "authenticated") {
    return {
      title: "정상 세션 정보 표시",
      body: session?.currentWorkspaceId
        ? "신규 AuthProvider 기반으로 읽기 전용 화면을 표시하고 있습니다."
        : "연결된 현재 워크스페이스가 없습니다. 로그인은 정상적으로 유지되고 있습니다.",
      tone: "success",
    };
  }

  if (phase === "account_action_required") {
    return {
      title: "계정 상태 확인 필요",
      body: `현재 계정 상태는 ${session?.status ?? "확인 필요"}입니다. 보호된 데이터 접근은 하지 않습니다.`,
      tone: "warning",
    };
  }

  return {
    title: "오류 표시",
    body: `세션 로딩 오류가 발생했습니다. 다시 시도는 reloadSession만 호출합니다.${errorCode ? ` (${errorCode})` : ""}`,
    tone: "error",
  };
}

export function firstReactScreenGuardResult(
  phase: AuthPhase,
  session: AppSession | null,
  requiredPermission: Permission = FIRST_REACT_SCREEN_REQUIRED_PERMISSION,
): FirstReactScreenGuardResult {
  if (phase === "initializing" || phase === "loading_session") {
    return {
      allowed: false,
      reason: "loading",
      message: "사용자 세션을 불러오는 중",
    };
  }

  if (phase === "signed_out") {
    return {
      allowed: false,
      reason: "signed-out",
      message: "로그인이 필요합니다",
    };
  }

  if (phase === "error") {
    return {
      allowed: false,
      reason: "error",
      message: "오류 표시",
    };
  }

  if (!session || session.status !== "active") {
    return {
      allowed: false,
      reason: "account-action-required",
      message: "계정 상태 확인 필요",
    };
  }

  if (!session.isSystemOwner && session.currentWorkspaceId === null) {
    return {
      allowed: false,
      reason: "workspace-missing",
      message: "현재 선택된 워크스페이스가 없습니다.",
    };
  }

  if (!hasPermission(session, requiredPermission)) {
    return {
      allowed: false,
      reason: "permission-denied",
      message: "이 화면을 볼 권한이 없습니다.",
    };
  }

  return {
    allowed: true,
    reason: "allowed",
    message: "허용",
  };
}
