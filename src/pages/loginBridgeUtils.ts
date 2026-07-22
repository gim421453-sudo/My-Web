import type {
  AccountStatus,
  AuthPhase,
} from "../auth/authTypes";
import {
  resolveDevAuthFeatureFlag,
} from "../auth/legacy/guards/requireAuthBridgeUtils";

export type LoginBridgeMode =
  | "legacy"
  | "new";

export type LoginPersistenceMode =
  | "session"
  | "local";

export type LoginDecisionReason =
  | "LEGACY_MODE"
  | "SIGNED_OUT"
  | "SUBMITTING"
  | "AUTH_INITIALIZING"
  | "SESSION_LOADING"
  | "AUTHENTICATED_ACTIVE"
  | "AUTHENTICATED_WITHOUT_WORKSPACE"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_DISABLED"
  | "SESSION_ERROR";

export type LoginDecisionState =
  | "form"
  | "submitting"
  | "waiting"
  | "redirect"
  | "account_action"
  | "error";

export interface LoginDecisionInput {
  mode: LoginBridgeMode;
  phase: AuthPhase | "legacy";
  isAuthenticated: boolean;
  status: AccountStatus | null;
  hasCurrentWorkspaceId: boolean;
  isSystemOwner: boolean;
  isSubmitting?: boolean;
  hasSessionError?: boolean;
}

export interface LoginDecision {
  state: LoginDecisionState;
  reason: LoginDecisionReason;
  destination: "/" | null;
  showForm: boolean;
  disableSubmit: boolean;
}

export interface ResolveNewAuthLoginFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export const LOGIN_REMEMBER_KEY = "pm-react-auth-remember-login-v1";
export const LOGIN_TAB_APPROVED_KEY = "pm-react-auth-tab-approved-v1";
export const LOGIN_PERSISTENCE_MODE_KEY = "pm-react-auth-persistence-v1";

export function resolveNewAuthLoginFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveNewAuthLoginFlagInput = {}): boolean {
  return resolveDevAuthFeatureFlag({
    search,
    envValue,
    isDev,
    queryKey: "newAuthLogin",
  });
}

export function loginBridgeModeForFlag(
  enabled: boolean,
): LoginBridgeMode {
  return enabled ? "new" : "legacy";
}

export function loginPersistenceModeForRemember(
  rememberLogin: boolean,
): LoginPersistenceMode {
  return rememberLogin ? "local" : "session";
}

export function decideLoginBridgeAccess({
  mode,
  phase,
  isAuthenticated,
  status,
  hasCurrentWorkspaceId,
  isSubmitting = false,
  hasSessionError = false,
}: LoginDecisionInput): LoginDecision {
  if (mode === "legacy") {
    return {
      state: "form",
      reason: "LEGACY_MODE",
      destination: null,
      showForm: true,
      disableSubmit: false,
    };
  }

  if (isSubmitting) {
    return {
      state: "submitting",
      reason: "SUBMITTING",
      destination: null,
      showForm: true,
      disableSubmit: true,
    };
  }

  if (phase === "initializing") {
    return {
      state: "waiting",
      reason: "AUTH_INITIALIZING",
      destination: null,
      showForm: false,
      disableSubmit: true,
    };
  }

  if (phase === "loading_session") {
    return {
      state: "waiting",
      reason: "SESSION_LOADING",
      destination: null,
      showForm: false,
      disableSubmit: true,
    };
  }

  if (hasSessionError || phase === "error") {
    return {
      state: "error",
      reason: "SESSION_ERROR",
      destination: null,
      showForm: true,
      disableSubmit: false,
    };
  }

  if (!isAuthenticated || phase === "signed_out") {
    return {
      state: "form",
      reason: "SIGNED_OUT",
      destination: null,
      showForm: true,
      disableSubmit: false,
    };
  }

  if (status === "pending") {
    return {
      state: "account_action",
      reason: "ACCOUNT_PENDING",
      destination: null,
      showForm: false,
      disableSubmit: true,
    };
  }

  if (status === "rejected") {
    return {
      state: "account_action",
      reason: "ACCOUNT_REJECTED",
      destination: null,
      showForm: false,
      disableSubmit: true,
    };
  }

  if (status === "disabled") {
    return {
      state: "account_action",
      reason: "ACCOUNT_DISABLED",
      destination: null,
      showForm: false,
      disableSubmit: true,
    };
  }

  if (status === "active") {
    return {
      state: "redirect",
      reason: hasCurrentWorkspaceId
        ? "AUTHENTICATED_ACTIVE"
        : "AUTHENTICATED_WITHOUT_WORKSPACE",
      destination: "/",
      showForm: false,
      disableSubmit: true,
    };
  }

  return {
    state: "form",
    reason: "SIGNED_OUT",
    destination: null,
    showForm: true,
    disableSubmit: false,
  };
}

export function loginBridgeStatusMessage(
  decision: LoginDecision,
): string {
  switch (decision.reason) {
    case "LEGACY_MODE":
    case "SIGNED_OUT":
      return "";
    case "SUBMITTING":
      return "로그인 요청을 처리하고 있습니다.";
    case "AUTH_INITIALIZING":
    case "SESSION_LOADING":
      return "계정 정보를 확인하고 있습니다.";
    case "AUTHENTICATED_ACTIVE":
      return "로그인되었습니다. 대시보드로 이동합니다.";
    case "AUTHENTICATED_WITHOUT_WORKSPACE":
      return "로그인되었습니다. 선택된 워크스페이스 없이 계속 진행합니다.";
    case "ACCOUNT_PENDING":
      return "계정 승인 대기 중입니다. 관리자의 승인을 기다려 주세요.";
    case "ACCOUNT_REJECTED":
      return "계정 승인이 거절되었습니다. 관리자에게 문의해 주세요.";
    case "ACCOUNT_DISABLED":
      return "비활성화된 계정입니다. 관리자에게 문의해 주세요.";
    case "SESSION_ERROR":
      return "계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export function safeLoginErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다. 관리자에게 문의해 주세요.";
    default:
      return "로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}
