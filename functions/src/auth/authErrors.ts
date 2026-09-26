import { TrustedBackendGuardError } from "../runtime/emulatorGuard.js";

export type VerifiedActorErrorCode =
  | "AUTH_HEADER_MISSING"
  | "AUTH_HEADER_MALFORMED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_REVOKED"
  | "AUTH_USER_NOT_FOUND"
  | "AUTH_ACCOUNT_DISABLED"
  | "AUTH_EMAIL_UNVERIFIED"
  | "AUTH_EMULATOR_REQUIRED"
  | "AUTH_CONTEXT_INVALID"
  | "AUTH_INTERNAL_ERROR";

const HTTP_STATUS_BY_CODE: Readonly<Record<VerifiedActorErrorCode, 401 | 403 | 500>> = Object.freeze({
  AUTH_HEADER_MISSING: 401,
  AUTH_HEADER_MALFORMED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_REVOKED: 401,
  AUTH_USER_NOT_FOUND: 401,
  AUTH_ACCOUNT_DISABLED: 403,
  AUTH_EMAIL_UNVERIFIED: 403,
  AUTH_EMULATOR_REQUIRED: 500,
  AUTH_CONTEXT_INVALID: 500,
  AUTH_INTERNAL_ERROR: 500,
});

export class VerifiedActorError extends Error {
  readonly code: VerifiedActorErrorCode;
  readonly httpStatus: 401 | 403 | 500;
  readonly requestId: string;

  constructor(code: VerifiedActorErrorCode, requestId: string) {
    super(code);
    this.name = "VerifiedActorError";
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.requestId = requestId;
  }
}

function firebaseErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code.trim().toLowerCase() : "";
}

export function normalizeVerifiedActorError(
  error: unknown,
  requestId: string,
): VerifiedActorError {
  if (error instanceof VerifiedActorError) return error;
  if (error instanceof TrustedBackendGuardError) {
    return new VerifiedActorError(
      error.code === "TB_AUTH_EMULATOR_REQUIRED"
        ? "AUTH_EMULATOR_REQUIRED"
        : "AUTH_CONTEXT_INVALID",
      requestId,
    );
  }

  switch (firebaseErrorCode(error)) {
    case "auth/id-token-expired":
      return new VerifiedActorError("AUTH_TOKEN_EXPIRED", requestId);
    case "auth/id-token-revoked":
      return new VerifiedActorError("AUTH_TOKEN_REVOKED", requestId);
    case "auth/user-not-found":
      return new VerifiedActorError("AUTH_USER_NOT_FOUND", requestId);
    case "auth/user-disabled":
      return new VerifiedActorError("AUTH_ACCOUNT_DISABLED", requestId);
    case "auth/argument-error":
    case "auth/invalid-id-token":
    case "auth/invalid-argument":
      return new VerifiedActorError("AUTH_TOKEN_INVALID", requestId);
    default:
      return new VerifiedActorError("AUTH_INTERNAL_ERROR", requestId);
  }
}

export interface SafeAuthErrorBody {
  ok: false;
  code: VerifiedActorErrorCode;
  requestId: string;
}

export function safeAuthErrorBody(error: VerifiedActorError): SafeAuthErrorBody {
  return Object.freeze({
    ok: false,
    code: error.code,
    requestId: error.requestId,
  });
}

export interface SafeAuthLogEntry {
  requestId: string;
  reasonCode: VerifiedActorErrorCode;
  operation: "verified-actor";
  emulator: true;
  success: false;
}

export type SafeAuthLogger = (label: string, entry: SafeAuthLogEntry) => void;

export function logSafeAuthFailure(
  error: VerifiedActorError,
  logger: SafeAuthLogger = console.warn,
): void {
  logger("[TB-02 auth]", Object.freeze({
    requestId: error.requestId,
    reasonCode: error.code,
    operation: "verified-actor",
    emulator: true,
    success: false,
  }));
}
