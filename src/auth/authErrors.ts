export type AuthErrorCode =
  | "AUTH_REQUIRED"
  | "USER_DOCUMENT_MISSING"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_DISABLED"
  | "EMAIL_NOT_VERIFIED"
  | "WORKSPACE_NOT_FOUND"
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_DISABLED"
  | "INVALID_WORKSPACE_ROLE"
  | "PERMISSION_DENIED"
  | "NETWORK_UNAVAILABLE"
  | "SESSION_READ_QUOTA_EXCEEDED"
  | "SESSION_SUPERSEDED"
  | "UNKNOWN";

export class AuthSessionError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;

  constructor(
    code: AuthErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    this.name = "AuthSessionError";
    this.code = code;
    this.cause = options.cause;
  }
}

export function getAuthSessionErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof AuthSessionError) {
    return error.code;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = String((error as { code?: unknown }).code);

    if (code === "permission-denied" || code === "PERMISSION_DENIED") {
      return "PERMISSION_DENIED";
    }

    if (
      code === "unavailable" ||
      code === "deadline-exceeded" ||
      code === "NETWORK_UNAVAILABLE"
    ) {
      return "NETWORK_UNAVAILABLE";
    }

    if (
      code === "resource-exhausted" ||
      code === "RESOURCE_EXHAUSTED" ||
      code === "SESSION_READ_QUOTA_EXCEEDED"
    ) {
      return "SESSION_READ_QUOTA_EXCEEDED";
    }

    if (
      code === "auth/user-token-expired" ||
      code === "auth/user-disabled" ||
      code === "auth/user-not-found"
    ) {
      return "AUTH_REQUIRED";
    }
  }

  return "UNKNOWN";
}

export function isSessionEndingError(error: unknown): boolean {
  const code = getAuthSessionErrorCode(error);
  return code === "AUTH_REQUIRED" || code === "USER_DOCUMENT_MISSING";
}

export function toAuthSessionError(
  error: unknown,
  fallbackCode: AuthErrorCode = "UNKNOWN",
  fallbackMessage = "인증 세션을 처리하지 못했습니다.",
): AuthSessionError {
  if (error instanceof AuthSessionError) {
    return error;
  }

  const code = getAuthSessionErrorCode(error);
  return new AuthSessionError(
    code === "UNKNOWN" ? fallbackCode : code,
    error instanceof Error ? error.message : fallbackMessage,
    { cause: error },
  );
}
