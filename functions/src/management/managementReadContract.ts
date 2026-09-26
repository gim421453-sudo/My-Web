import type { VerifiedActor } from "../auth/verifiedActor.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";

export const MANAGEMENT_READ_DEFAULT_LIMIT = 25;
export const MANAGEMENT_READ_MAX_LIMIT = 100;
const MAX_OFFSET = 10_000;
const TOP_LEVEL_KEYS = new Set(["operation", "target", "payload"]);
const TARGET_KEYS = new Set(["kind", "id", "workspaceId"]);
const PAYLOAD_KEYS = new Set(["limit", "cursor"]);

export interface ManagementReadTarget {
  readonly kind: string;
  readonly id: string;
  readonly workspaceId: string | null;
}

export interface ManagementReadRequest {
  readonly actor: VerifiedActor;
  readonly requestId: string;
  readonly operation: string;
  readonly target: ManagementReadTarget;
  readonly limit: number;
  readonly offset: number;
}

export interface ManagementReadResult {
  readonly items: readonly Readonly<Record<string, unknown>>[];
  readonly nextCursor: string | null;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>, requestId: string): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
}

function decodeCursor(value: unknown, requestId: string): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value !== "string" || value.length > 64 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const match = /^v1:(\d+)$/.exec(decoded);
    const offset = match ? Number(match[1]) : Number.NaN;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_OFFSET) throw new Error("cursor");
    return offset;
  } catch {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
}

export function encodeManagementCursor(offset: number): string {
  return Buffer.from(`v1:${offset}`, "utf8").toString("base64url");
}

export function validateManagementRead(
  actor: VerifiedActor,
  input: unknown,
  expected: Readonly<{ operation: string; targetKind: string }>,
): ManagementReadRequest {
  const requestId = actor.request.requestId;
  if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
    throw new OperationError("UNAUTHENTICATED", requestId);
  }
  if (!plainRecord(input)) throw new OperationError("INVALID_ARGUMENT", requestId);
  exactKeys(input, TOP_LEVEL_KEYS, requestId);
  if (input.operation !== expected.operation || !plainRecord(input.target) || !plainRecord(input.payload)) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  exactKeys(input.target, TARGET_KEYS, requestId);
  exactKeys(input.payload, PAYLOAD_KEYS, requestId);
  if (input.target.kind !== expected.targetKind || !isValidDocumentId(String(input.target.id || ""))) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  const workspaceId = input.target.workspaceId === null || input.target.workspaceId === undefined
    ? null
    : String(input.target.workspaceId);
  if (workspaceId !== null && !isValidDocumentId(workspaceId)) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  const limit = input.payload.limit === undefined
    ? MANAGEMENT_READ_DEFAULT_LIMIT
    : Number(input.payload.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MANAGEMENT_READ_MAX_LIMIT) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return Object.freeze({
    actor,
    requestId,
    operation: expected.operation,
    target: Object.freeze({
      kind: expected.targetKind,
      id: String(input.target.id),
      workspaceId,
    }),
    limit,
    offset: decodeCursor(input.payload.cursor, requestId),
  });
}
