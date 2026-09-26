export type AuthorizationErrorCode =
  | "AUTHZ_CONTEXT_REQUIRED"
  | "AUTHZ_SYSTEM_OWNER_REQUIRED"
  | "AUTHZ_WORKSPACE_REQUIRED"
  | "AUTHZ_MEMBERSHIP_MISSING"
  | "AUTHZ_MEMBERSHIP_DISABLED"
  | "AUTHZ_ROLE_DENIED"
  | "AUTHZ_CAPABILITY_REQUIRED"
  | "AUTHZ_ASSIGNMENT_REQUIRED"
  | "AUTHZ_SCOPE_DENIED"
  | "AUTHZ_CONTEXT_MALFORMED"
  | "AUTHZ_INTERNAL_ERROR";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly httpStatus: 403 | 500;

  constructor(code: AuthorizationErrorCode) {
    super(code);
    this.name = "AuthorizationError";
    this.code = code;
    this.httpStatus = code === "AUTHZ_INTERNAL_ERROR" ? 500 : 403;
  }
}

export interface SafeAuthorizationLogEntry {
  requestId: string;
  operation: string;
  decision: "allow" | "deny" | "error";
  reasonCode: AuthorizationErrorCode | "AUTHZ_ALLOWED";
  emulator: true;
}

export type SafeAuthorizationLogger = (
  label: string,
  entry: SafeAuthorizationLogEntry,
) => void;

function safeLabel(value: string): string {
  return /^[a-zA-Z0-9._:-]{1,80}$/.test(value) ? value : "invalid";
}

export function logSafeAuthorizationDecision(
  entry: SafeAuthorizationLogEntry,
  logger: SafeAuthorizationLogger = console.warn,
): void {
  logger("[TB-03 authz]", Object.freeze({
    ...entry,
    requestId: safeLabel(entry.requestId),
    operation: safeLabel(entry.operation),
  }));
}
