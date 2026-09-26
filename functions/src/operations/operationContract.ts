import { createHash } from "node:crypto";
import type { VerifiedActor } from "../auth/verifiedActor.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "./operationErrors.js";

export type CanonicalPrimitive = string | number | boolean | null;
export type CanonicalValue = CanonicalPrimitive | CanonicalValue[] | CanonicalObject;
export interface CanonicalObject { [key: string]: CanonicalValue }

const TOP_LEVEL_KEYS = new Set(["idempotencyKey", "operation", "target", "payload"]);
const TARGET_KEYS = new Set(["kind", "id", "workspaceId"]);
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const OPERATION_PATTERN = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._~-]+$/;

export interface OperationTarget {
  readonly kind: string;
  readonly id: string;
  readonly workspaceId: string | null;
}

export interface OperationSpecification<TPayload extends CanonicalObject> {
  readonly operation: string;
  readonly targetKind: string;
  readonly payloadKeys: ReadonlySet<string>;
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string): TPayload;
}

export interface ValidatedOperation<TPayload extends CanonicalObject> {
  readonly actor: VerifiedActor;
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly operation: string;
  readonly target: OperationTarget;
  readonly payload: TPayload;
  readonly payloadHash: string;
  readonly targetHash: string;
  readonly scopeHash: string;
  readonly operationIdHash: string;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  requestId: string,
): void {
  if (Object.keys(value).some((key) => !allowed.has(key) || UNSAFE_KEYS.has(key))) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
}

function canonicalValue(value: unknown, requestId: string, depth = 0): CanonicalValue {
  if (depth > 8) throw new OperationError("INVALID_ARGUMENT", requestId);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) throw new OperationError("INVALID_ARGUMENT", requestId);
    return value.map((item) => canonicalValue(item, requestId, depth + 1));
  }
  if (!plainRecord(value) || Object.keys(value).length > 100) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  const result: CanonicalObject = {};
  for (const key of Object.keys(value).sort()) {
    if (UNSAFE_KEYS.has(key) || key.length > 80) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    result[key] = canonicalValue(value[key], requestId, depth + 1);
  }
  return result;
}

export function canonicalJson(value: unknown, requestId = "validation"): string {
  return JSON.stringify(canonicalValue(value, requestId));
}

export function sha256Canonical(value: unknown, requestId = "validation"): string {
  return createHash("sha256").update(canonicalJson(value, requestId), "utf8").digest("hex");
}

function normalizedIdentifier(value: unknown, requestId: string, maxLength = 256): string {
  if (typeof value !== "string") throw new OperationError("INVALID_ARGUMENT", requestId);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || !isValidDocumentId(normalized)) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return normalized;
}

function normalizedLabel(value: unknown, requestId: string, maxLength = 80): string {
  if (typeof value !== "string") throw new OperationError("INVALID_ARGUMENT", requestId);
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > maxLength || !OPERATION_PATTERN.test(normalized)) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return normalized;
}

function parseTarget(value: unknown, expectedKind: string, requestId: string): OperationTarget {
  if (!plainRecord(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  rejectUnknownKeys(value, TARGET_KEYS, requestId);
  const kind = normalizedLabel(value.kind, requestId, 48);
  if (kind !== expectedKind) throw new OperationError("INVALID_ARGUMENT", requestId);
  const id = normalizedIdentifier(value.id, requestId);
  const workspaceId = value.workspaceId === undefined || value.workspaceId === null
    ? null
    : normalizedIdentifier(value.workspaceId, requestId);
  return Object.freeze({ kind, id, workspaceId });
}

export function strictPayload(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requestId: string,
): Readonly<Record<string, unknown>> {
  if (!plainRecord(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  rejectUnknownKeys(value, allowedKeys, requestId);
  canonicalValue(value, requestId);
  return Object.freeze({ ...value });
}

export function requiredString(
  value: unknown,
  requestId: string,
  options: Readonly<{ maxLength?: number; pattern?: RegExp }> = {},
): string {
  if (typeof value !== "string") throw new OperationError("INVALID_ARGUMENT", requestId);
  const normalized = value.trim();
  const maxLength = options.maxLength ?? 512;
  if (!normalized || normalized.length > maxLength || (options.pattern && !options.pattern.test(normalized))) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return normalized;
}

export function validateOperation<TPayload extends CanonicalObject>(
  actor: VerifiedActor,
  input: unknown,
  specification: OperationSpecification<TPayload>,
): ValidatedOperation<TPayload> {
  const requestId = actor.request.requestId;
  if (!isValidDocumentId(actor.uid) || !isValidDocumentId(requestId)) {
    throw new OperationError("UNAUTHENTICATED", "invalid-request");
  }
  if (!plainRecord(input)) throw new OperationError("INVALID_ARGUMENT", requestId);
  rejectUnknownKeys(input, TOP_LEVEL_KEYS, requestId);

  const operation = normalizedLabel(input.operation, requestId);
  if (operation !== specification.operation) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  const idempotencyKey = requiredString(input.idempotencyKey, requestId, {
    maxLength: 128,
    pattern: IDEMPOTENCY_PATTERN,
  });
  if (idempotencyKey.length < 16) throw new OperationError("INVALID_ARGUMENT", requestId);
  const target = parseTarget(input.target, specification.targetKind, requestId);
  const rawPayload = strictPayload(input.payload, specification.payloadKeys, requestId);
  const payload = specification.parsePayload(rawPayload, requestId);
  canonicalValue(payload, requestId);

  const payloadHash = sha256Canonical(payload, requestId);
  const targetHash = sha256Canonical(target, requestId);
  const scopeHash = sha256Canonical({
    actorUid: actor.uid,
    idempotencyKey,
  }, requestId);
  const operationIdHash = sha256Canonical({
    actorUid: actor.uid,
    idempotencyKey,
    operation,
    target,
  }, requestId);

  return Object.freeze({
    actor,
    requestId,
    idempotencyKey,
    operation,
    target,
    payload: Object.freeze({ ...payload }) as TPayload,
    payloadHash,
    targetHash,
    scopeHash,
    operationIdHash,
  });
}
