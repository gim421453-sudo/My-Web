import type {
  AppSession,
  AuthPhase,
  SessionWarning,
} from "../auth/authTypes";

export type AppNextProviderCategory =
  | "Google"
  | "이메일/비밀번호"
  | "복수 제공자"
  | "알 수 없음";

export type AppNextPersistenceMode =
  | "local"
  | "session"
  | "none"
  | "unknown";

export interface AppNextAccountReadOnlyPolicyInput {
  phase: AuthPhase;
  session: AppSession | null;
}

export interface AppNextAccountReadOnlyPolicy {
  canRender: boolean;
  reason:
    | "loading"
    | "signed-out"
    | "pending"
    | "rejected"
    | "disabled"
    | "error"
    | "active";
  isAuthenticated: boolean;
  hasWorkspace: boolean;
  globalRoleCategory: string;
  workspaceRoleCategory: string;
  isSystemOwner: boolean;
}

export function appNextAccountRoleCategory(value: string | null | undefined): string {
  if (!value) return "none";
  if ([
    "system_owner",
    "user",
    "super_manager",
    "manager",
    "teacher",
    "normal",
    "viewer",
    "print_account",
  ].includes(value)) {
    return value;
  }
  return "unknown";
}

export function appNextAccountReadOnlyPolicy({
  phase,
  session,
}: AppNextAccountReadOnlyPolicyInput): AppNextAccountReadOnlyPolicy {
  const base = {
    isAuthenticated: Boolean(session?.isAuthenticated),
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    globalRoleCategory: appNextAccountRoleCategory(session?.globalRole),
    workspaceRoleCategory: appNextAccountRoleCategory(session?.currentWorkspaceRole),
    isSystemOwner: Boolean(session?.isSystemOwner),
  };

  if (phase === "initializing" || phase === "loading_session") {
    return {
      ...base,
      canRender: false,
      reason: "loading",
    };
  }

  if (phase === "signed_out" || !session) {
    return {
      ...base,
      canRender: false,
      reason: "signed-out",
    };
  }

  if (phase === "error") {
    return {
      ...base,
      canRender: false,
      reason: "error",
    };
  }

  if (session.status !== "active") {
    return {
      ...base,
      canRender: false,
      reason: session.status,
    };
  }

  return {
    ...base,
    canRender: true,
    reason: "active",
  };
}

export function providerCategoryFromIds(providerIds: readonly string[]): AppNextProviderCategory {
  const normalized = Array.from(new Set(providerIds.map((item) => String(item || "").trim()).filter(Boolean)));
  if (normalized.length > 1) return "복수 제공자";
  if (normalized.includes("google.com")) return "Google";
  if (normalized.includes("password")) return "이메일/비밀번호";
  return "알 수 없음";
}

export function normalizePersistenceMode(value: unknown): AppNextPersistenceMode {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "local") return "local";
  if (normalized === "session") return "session";
  if (normalized === "none") return "none";
  return "unknown";
}

export function safeWarningCodes(warnings: readonly SessionWarning[] | undefined): string[] {
  return Array.from(new Set((warnings || []).map((warning) => warning.code))).sort();
}

export function detectSensitiveAccountText(values: readonly unknown[]): boolean {
  return values.some((value) => {
    const text = String(value ?? "");
    return /@|AIza|token|uid|workspaceId|documentId|api[_-]?key/i.test(text);
  });
}
