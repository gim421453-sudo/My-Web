import type { User } from "firebase/auth";
import type {
  AppSession,
  AuthPhase,
} from "../authTypes";
import type {
  AuthSessionError,
} from "../authErrors";
import type {
  LegacyAuthAdapterSession,
  LegacyAuthAdapterValue,
  ResolveLegacyAuthAdapterFlagInput,
} from "./legacyAuthAdapterTypes";

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

export function resolveLegacyAuthAdapterPreviewFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveLegacyAuthAdapterFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "adapter"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function legacyLoadingFromPhase(phase: AuthPhase): boolean {
  return phase === "initializing" || phase === "loading_session";
}

export function legacyIsAuthenticatedFromPhase(
  phase: AuthPhase,
  session: AppSession | null,
): boolean {
  return Boolean(session?.isAuthenticated) && phase !== "signed_out";
}

export function legacyErrorMessage(
  error: AuthSessionError | null | undefined,
): string | null {
  if (!error) return null;

  if (error.code === "PERMISSION_DENIED") {
    return "권한 확인 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }

  if (error.code === "NETWORK_UNAVAILABLE") {
    return "네트워크 연결을 확인해 주세요.";
  }

  if (error.code === "USER_DOCUMENT_MISSING") {
    return "계정 정보를 확인할 수 없습니다. 관리자에게 문의해 주세요.";
  }

  if (error.code === "ACCOUNT_PENDING") {
    return "계정 승인을 기다리고 있습니다.";
  }

  if (error.code === "ACCOUNT_REJECTED") {
    return "계정 승인이 거절되었습니다.";
  }

  if (error.code === "ACCOUNT_DISABLED") {
    return "계정 사용이 제한되어 있습니다.";
  }

  return "계정 상태를 확인하지 못했습니다. 다시 시도해 주세요.";
}

export function toLegacyAuthAdapterSession(
  session: AppSession | null,
): LegacyAuthAdapterSession | null {
  if (!session) return null;

  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    globalRole: session.globalRole,
    status: session.status,
    currentWorkspaceId: session.currentWorkspaceId,
    currentRole: session.currentWorkspaceRole,
    workspaceId: session.currentWorkspaceId,
    workspaceRole: session.currentWorkspaceRole,
    isAuthenticated: session.isAuthenticated,
    isSystemOwner: session.isSystemOwner,
    warningCodes: session.warnings.map((warning) => warning.code),
  };
}

export function createLegacyAuthAdapterValue(params: {
  phase: AuthPhase;
  firebaseUser: User | null;
  session: AppSession | null;
  error: AuthSessionError | null;
  signInWithEmail(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  reloadSession(): Promise<void>;
}): LegacyAuthAdapterValue {
  const legacySession = toLegacyAuthAdapterSession(params.session);
  const errorMessage = legacyErrorMessage(params.error);

  return {
    user: params.firebaseUser,
    session: legacySession,
    phase: params.phase,
    loading: legacyLoadingFromPhase(params.phase),
    currentRole: legacySession?.currentRole ?? null,
    workspaceId: legacySession?.workspaceId ?? null,
    workspaceRole: legacySession?.workspaceRole ?? null,
    status: legacySession?.status ?? null,
    isAuthenticated: legacyIsAuthenticatedFromPhase(params.phase, params.session),
    isSystemOwner: legacySession?.isSystemOwner ?? false,
    error: errorMessage,
    authError: errorMessage,
    login: params.signInWithEmail,
    logout: params.signOut,
    reloadSession: params.reloadSession,
  };
}

export function maskLegacyAdapterValue(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function maskLegacyAdapterEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const [name, domain] = email.split("@");
  if (!domain) return maskLegacyAdapterValue(email);
  if (name.length <= 2) return `${name.slice(0, 1)}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

export function warningCodesLabel(codes: readonly string[] | null | undefined): string {
  return codes && codes.length > 0 ? codes.join(", ") : "-";
}
