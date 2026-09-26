import { OperationError } from "./operationErrors.js";

const SAFE_SUMMARY_KEYS = new Set([
  "active",
  "accountDisabled",
  "accountLifecycleStatus",
  "applicationStatus",
  "count",
  "created",
  "dataPreserved",
  "disabled",
  "exists",
  "invitationStatus",
  "invitationId",
  "joinRequestId",
  "maxUses",
  "memberPresent",
  "membershipStatus",
  "nextMode",
  "operationModeVersion",
  "previousMode",
  "removed",
  "role",
  "schemaVersion",
  "secretVersion",
  "source",
  "status",
  "targetId",
  "sessionRefreshRequired",
  "sessionInvalidated",
  "signOutRequired",
  "updated",
  "version",
  "usedCount",
  "workspaceId",
  "workspaceLifecycleStatus",
  "workspacePresent",
  "userProfileUpdated",
]);

export type SafeSummaryValue = string | number | boolean | null;
export type SafeSummary = Readonly<Record<string, SafeSummaryValue>>;

export function safeSummary(value: unknown, requestId: string): SafeSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OperationError("INTERNAL", requestId);
  }
  const source = value as Record<string, unknown>;
  const result: Record<string, SafeSummaryValue> = {};
  for (const key of Object.keys(source)) {
    if (!SAFE_SUMMARY_KEYS.has(key)) continue;
    const item = source[key];
    if (item !== null && !["string", "number", "boolean"].includes(typeof item)) {
      throw new OperationError("INTERNAL", requestId);
    }
    if (typeof item === "number" && !Number.isFinite(item)) {
      throw new OperationError("INTERNAL", requestId);
    }
    if (typeof item === "string" && item.length > 128) {
      throw new OperationError("INTERNAL", requestId);
    }
    result[key] = item as SafeSummaryValue;
  }
  return Object.freeze(result);
}
