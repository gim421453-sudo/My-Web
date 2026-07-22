import type {
  AccountStatus,
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextMode =
  | "disabled"
  | "enabled";

export type AppNextAccountState =
  | "loading"
  | "signed_out"
  | "active"
  | "active_without_workspace"
  | "pending"
  | "rejected"
  | "disabled"
  | "error"
  | "quota_exceeded"
  | "system_owner";

export interface ResolveAppNextFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface ResolvedAppNextAuthFlag {
  enabled: boolean;
  source: "development-query" | "env" | "default";
}

export interface AppNextAccountStateInput {
  phase: AuthPhase;
  session: AppSession | null;
  hasError?: boolean;
  errorCode?: string | null;
}

export interface AppNextStateMessage {
  title: string;
  body: string;
  tone: "muted" | "success" | "warning" | "error";
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

export function resolveAppNextFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveAppNextFlagInput = {}): boolean {
  return resolveAppNextAuthFlag({
    search,
    envValue,
    isDev,
  }).enabled;
}

export function resolveAppNextAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveAppNextFlagInput = {}): ResolvedAppNextAuthFlag {
  if (isDev) {
    const querySwitch = parseBooleanSwitch(queryValue(search, "appNextAuth"));
    if (querySwitch !== null) {
      return {
        enabled: querySwitch,
        source: "development-query",
      };
    }
  }

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) {
    return {
      enabled: envSwitch,
      source: "env",
    };
  }

  return {
    enabled: true,
    source: "default",
  };
}

export function appNextModeForFlag(enabled: boolean): AppNextMode {
  return enabled ? "enabled" : "disabled";
}

export function maskAppNextEmail(email: string | null | undefined): string {
  const value = String(email ?? "").trim();
  if (!value) return "-";

  const [localPart, domain = ""] = value.split("@");
  if (!domain) {
    return localPart.length <= 2
      ? "*".repeat(localPart.length)
      : `${localPart.slice(0, 2)}***`;
  }

  const visibleLocal = localPart.length <= 2
    ? localPart.slice(0, 1)
    : localPart.slice(0, 2);
  const [domainName, ...suffix] = domain.split(".");
  const visibleDomain = domainName
    ? `${domainName.slice(0, 1)}***`
    : "***";

  return `${visibleLocal}***@${visibleDomain}${suffix.length ? `.${suffix.join(".")}` : ""}`;
}

export function appNextAccountState({
  phase,
  session,
  hasError = false,
  errorCode = null,
}: AppNextAccountStateInput): AppNextAccountState {
  if (phase === "initializing" || phase === "loading_session") {
    return "loading";
  }

  if (errorCode === "SESSION_READ_QUOTA_EXCEEDED") {
    return "quota_exceeded";
  }

  if (phase === "signed_out") {
    return "signed_out";
  }

  if (phase === "error" || hasError) {
    return "error";
  }

  if (!session) {
    return "signed_out";
  }

  if (session.status !== "active") {
    return stateForAccountStatus(session.status);
  }

  if (session.isSystemOwner || session.globalRole === "system_owner") {
    return "system_owner";
  }

  if (!session.currentWorkspaceId) {
    return "active_without_workspace";
  }

  return "active";
}

function stateForAccountStatus(status: AccountStatus): AppNextAccountState {
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "disabled") return "disabled";
  return "active";
}

export function appNextStateMessage(state: AppNextAccountState): AppNextStateMessage {
  switch (state) {
    case "loading":
      return {
        title: "계정 상태 확인 중",
        body: "로그인 세션과 계정 상태를 읽고 있습니다.",
        tone: "muted",
      };
    case "signed_out":
      return {
        title: "로그인이 필요합니다",
        body: "운영 로그인 화면에서 로그인한 뒤 다시 이 시험 화면을 열어 주세요.",
        tone: "warning",
      };
    case "pending":
      return {
        title: "승인 대기 중",
        body: "계정 승인 전에는 보호된 데이터를 불러오지 않습니다.",
        tone: "warning",
      };
    case "rejected":
      return {
        title: "승인 거절 상태",
        body: "관리자에게 계정 상태 확인을 요청해 주세요.",
        tone: "error",
      };
    case "disabled":
      return {
        title: "비활성 계정",
        body: "현재 계정은 이용이 제한되어 있습니다.",
        tone: "error",
      };
    case "error":
      return {
        title: "계정 상태를 확인하지 못했습니다",
        body: "자동 로그아웃하지 않습니다. 잠시 후 다시 확인해 주세요.",
        tone: "error",
      };
    case "quota_exceeded":
      return {
        title: "데이터 조회 한도 초과",
        body: "현재 데이터 조회 한도가 초과되어 계정 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
        tone: "error",
      };
    case "system_owner":
      return {
        title: "시스템 오너 계정",
        body: "전역 system_owner 권한으로 인식되었습니다.",
        tone: "success",
      };
    case "active_without_workspace":
      return {
        title: "활성 계정",
        body: "현재 선택된 워크스페이스가 없습니다.",
        tone: "success",
      };
    case "active":
      return {
        title: "활성 계정",
        body: "읽기 전용 계정 상태 화면을 표시할 수 있습니다.",
        tone: "success",
      };
  }
}

export function verificationStatusLabel(verified: boolean | null | undefined): string {
  if (verified === true) return "인증 완료";
  if (verified === false) return "인증 필요";
  return "확인 불가";
}

export function safeEmailVerificationErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";

  if (code === "auth/too-many-requests") {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (code === "auth/network-request-failed") {
    return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  }

  if (code === "auth/requires-recent-login") {
    return "계정 확인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.";
  }

  return "인증 메일을 보내지 못했습니다. 다시 시도해 주세요.";
}

export function safeGoogleLoginErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";

  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google 로그인 창이 닫혔습니다.";
    case "auth/cancelled-popup-request":
      return "이전 Google 로그인 요청이 취소되었습니다. 다시 시도해 주세요.";
    case "auth/popup-blocked":
      return "브라우저에서 팝업을 허용해 주세요.";
    case "auth/account-exists-with-different-credential":
      return "이미 다른 로그인 방식으로 등록된 계정입니다.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/unauthorized-domain":
      return "현재 도메인에서는 Google 로그인을 사용할 수 없습니다.";
    default:
      return "Google 로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}
