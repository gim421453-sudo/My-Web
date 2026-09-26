import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { isWorkspaceRole, type WorkspaceRole } from "../authz/authorizationTypes.js";
import { OperationError } from "../operations/operationErrors.js";
import { hashHighEntropyInvitationCode } from "./invitationFoundation.js";

export const MIN_INVITATION_EXPIRY_SECONDS = 60 * 60;
export const MAX_INVITATION_EXPIRY_SECONDS = 60 * 60 * 24 * 30;
export const MIN_INVITATION_USES = 1;
export const MAX_INVITATION_USES = 1_000;

export type InvitationStatus = "active" | "consumed" | "revoked";

export interface CanonicalInvitation {
  readonly schemaVersion: 1;
  readonly invitationId: string;
  readonly workspaceId: string;
  readonly targetRole: WorkspaceRole;
  readonly status: InvitationStatus;
  readonly createdByUid: string;
  readonly codeHash: string;
  readonly secretVersion: string;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly expiresAt: unknown;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly revokedAt?: unknown;
  readonly revokedByUid?: string;
  readonly lastRedeemedAt?: unknown;
}

const INVITATION_KEYS = new Set([
  "schemaVersion", "invitationId", "workspaceId", "targetRole", "status",
  "createdByUid", "codeHash", "secretVersion", "maxUses", "usedCount",
  "expiresAt", "createdAt", "updatedAt", "revokedAt", "revokedByUid",
  "lastRedeemedAt",
]);

function fail(requestId: string): never {
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

export function timestampMillis(value: unknown, requestId: string): number {
  if (value instanceof Date) {
    const millis = value.getTime();
    if (Number.isFinite(millis)) return millis;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toMillis" in value
    && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const millis = (value as { toMillis(): number }).toMillis();
    if (Number.isFinite(millis)) return millis;
  }
  return fail(requestId);
}

export function timestampAfter(now: unknown, seconds: number, requestId: string): Date {
  return new Date(timestampMillis(now, requestId) + seconds * 1_000);
}

export function parseCanonicalInvitation(
  snapshot: AuthorityDocumentSnapshot,
  expectedInvitationId: string,
  requestId: string,
): CanonicalInvitation {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (Object.keys(data).some((key) => !INVITATION_KEYS.has(key))) return fail(requestId);
  if (data.schemaVersion !== 1 || data.invitationId !== expectedInvitationId
    || !isValidDocumentId(data.workspaceId) || !isWorkspaceRole(data.targetRole)
    || !["active", "consumed", "revoked"].includes(String(data.status))
    || !isValidDocumentId(data.createdByUid)
    || typeof data.codeHash !== "string" || !/^[a-f0-9]{64}$/.test(data.codeHash)
    || typeof data.secretVersion !== "string" || !/^[A-Za-z0-9._-]{1,32}$/.test(data.secretVersion)
    || !Number.isInteger(data.maxUses) || Number(data.maxUses) < MIN_INVITATION_USES
    || Number(data.maxUses) > MAX_INVITATION_USES
    || !Number.isInteger(data.usedCount) || Number(data.usedCount) < 0
    || Number(data.usedCount) > Number(data.maxUses)) {
    return fail(requestId);
  }
  timestampMillis(data.expiresAt, requestId);
  timestampMillis(data.createdAt, requestId);
  timestampMillis(data.updatedAt, requestId);
  if (data.revokedAt !== undefined) timestampMillis(data.revokedAt, requestId);
  if (data.lastRedeemedAt !== undefined) timestampMillis(data.lastRedeemedAt, requestId);
  if (data.revokedByUid !== undefined && !isValidDocumentId(data.revokedByUid)) return fail(requestId);
  if (data.status === "active" && Number(data.usedCount) >= Number(data.maxUses)) return fail(requestId);
  if (data.status === "consumed" && Number(data.usedCount) !== Number(data.maxUses)) return fail(requestId);
  if (data.status === "revoked" && (!data.revokedAt || !data.revokedByUid)) return fail(requestId);
  return Object.freeze({ ...data }) as unknown as CanonicalInvitation;
}

export function validateRawInvitationCode(value: unknown, requestId: string): string {
  if (typeof value !== "string") throw new OperationError("INVALID_ARGUMENT", requestId);
  try {
    hashHighEntropyInvitationCode(value);
  } catch {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return value;
}
