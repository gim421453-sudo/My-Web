import type {
  AccountStatus,
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export interface ResolveVerifyEmailNewAuthFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface VerifyEmailMessage {
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

export function resolveVerifyEmailNewAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveVerifyEmailNewAuthFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "newAuthVerify"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function verifyEmailPhaseMessage(
  phase: AuthPhase,
): VerifyEmailMessage {
  if (phase === "initializing") {
    return {
      title: "인증 상태",
      body: "인증 상태를 확인하고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "signed_out") {
    return {
      title: "인증 상태",
      body: "로그인이 필요합니다.",
      tone: "warning",
    };
  }

  if (phase === "loading_session") {
    return {
      title: "인증 상태",
      body: "계정 정보를 불러오고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "authenticated") {
    return {
      title: "인증 상태",
      body: "계정 상태 정보를 표시합니다.",
      tone: "success",
    };
  }

  if (phase === "account_action_required") {
    return {
      title: "인증 상태",
      body: "계정 상태에 따른 안내를 표시합니다.",
      tone: "warning",
    };
  }

  return {
    title: "인증 상태",
    body: "계정 정보를 불러오지 못했습니다.",
    tone: "error",
  };
}

export function emailVerificationMessage(
  emailVerified: boolean | null | undefined,
): VerifyEmailMessage {
  if (emailVerified) {
    return {
      title: "이메일 인증 상태",
      body: "이메일 인증이 완료되었습니다.",
      tone: "success",
    };
  }

  return {
    title: "이메일 인증 상태",
    body: "이메일 인증이 필요합니다.",
    tone: "warning",
  };
}

export function accountStatusMessage(
  status: AccountStatus | string | null | undefined,
): VerifyEmailMessage {
  if (status === "active") {
    return {
      title: "계정 상태",
      body: "계정이 정상적으로 활성화되어 있습니다.",
      tone: "success",
    };
  }

  if (status === "pending") {
    return {
      title: "계정 상태",
      body: "계정 승인을 기다리고 있습니다.",
      tone: "warning",
    };
  }

  if (status === "rejected") {
    return {
      title: "계정 상태",
      body: "계정 승인이 거절되었습니다.",
      tone: "error",
    };
  }

  if (status === "disabled") {
    return {
      title: "계정 상태",
      body: "계정 사용이 제한되어 있습니다.",
      tone: "error",
    };
  }

  return {
    title: "계정 상태",
    body: "계정 상태를 확인할 수 없습니다.",
    tone: "warning",
  };
}

export function workspaceStatusMessage(
  session: AppSession | null,
): VerifyEmailMessage {
  if (!session || session.status !== "active") {
    return {
      title: "워크스페이스 상태",
      body: "계정 상태 확인 후 워크스페이스 정보를 표시합니다.",
      tone: "muted",
    };
  }

  if (!session.currentWorkspaceId && !session.currentWorkspaceRole) {
    return {
      title: "워크스페이스 상태",
      body: "현재 선택된 워크스페이스가 없습니다.\n로그인은 정상적으로 유지되고 있습니다.",
      tone: "warning",
    };
  }

  return {
    title: "워크스페이스 상태",
    body: "현재 선택된 워크스페이스가 있습니다.",
    tone: "success",
  };
}

export function maskEmailForVerifyEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "-";

  const [name, domain] = email.split("@");
  if (!name || !domain) return "-";

  if (name.length <= 2) {
    return `${name[0] ?? ""}***@${domain}`;
  }

  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

export function hasMaskedSensitiveEmail(
  rendered: string,
  rawEmail: string,
): boolean {
  return !rendered.includes(rawEmail) && rendered.includes("@");
}

export function booleanYesNo(value: boolean | null | undefined): "예" | "아니오" {
  return value ? "예" : "아니오";
}

export function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return booleanYesNo(value);
  return value && String(value).trim() !== "" ? String(value) : "-";
}

export function warningCodes(session: AppSession | null): string {
  if (!session?.warnings.length) return "-";
  return session.warnings.map((warning) => warning.code).join(", ");
}
