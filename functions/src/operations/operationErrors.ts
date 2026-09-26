export type OperationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "FAILED_PRECONDITION"
  | "INTERNAL";

const HTTP_STATUS_BY_CODE: Readonly<Record<OperationErrorCode, number>> = Object.freeze({
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_ARGUMENT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  FAILED_PRECONDITION: 412,
  INTERNAL: 500,
});

export class OperationError extends Error {
  readonly code: OperationErrorCode;
  readonly httpStatus: number;
  readonly requestId: string;

  constructor(code: OperationErrorCode, requestId: string) {
    super(code);
    this.name = "OperationError";
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.requestId = requestId;
  }
}

export interface SafeOperationErrorBody {
  ok: false;
  code: OperationErrorCode;
  requestId: string;
}

export function safeOperationErrorBody(error: OperationError): SafeOperationErrorBody {
  return Object.freeze({
    ok: false,
    code: error.code,
    requestId: error.requestId,
  });
}
