import type { AppSession } from "../authTypes";
import {
  GLOBAL_ROLES,
  WORKSPACE_ROLES,
} from "../../permissions/roles";
import type {
  LegacySessionSnapshot,
  ShadowLoggerPayload,
  ShadowMismatch,
  ShadowMismatchSeverity,
  ShadowSessionComparison,
} from "./shadowTypes";

function hasLegacySystemOwnerValue(value: string | null): boolean {
  return value === GLOBAL_ROLES.SYSTEM_OWNER ||
    value === "시스템오너" ||
    value === "시스템 오너" ||
    value === "시스템 관리자" ||
    value === "최고관리자" ||
    value === "최고 관리자";
}

function inferLegacySystemOwner(legacy: LegacySessionSnapshot | null): boolean {
  if (!legacy) return false;
  return legacy.isSystemOwner === true ||
    hasLegacySystemOwnerValue(legacy.globalRole) ||
    hasLegacySystemOwnerValue(legacy.role) ||
    hasLegacySystemOwnerValue(legacy.currentRole) ||
    hasLegacySystemOwnerValue(legacy.workspaceRole);
}

function legacyGlobalRoleForComparison(
  legacy: LegacySessionSnapshot | null,
): string | null {
  if (!legacy) return null;
  if (legacy.globalRole) return legacy.globalRole;
  return inferLegacySystemOwner(legacy) ? GLOBAL_ROLES.SYSTEM_OWNER : GLOBAL_ROLES.USER;
}

function legacyWorkspaceRoleForComparison(
  legacy: LegacySessionSnapshot | null,
): string | null {
  if (!legacy) return null;
  return legacy.workspaceRole ?? legacy.currentRole ?? legacy.role;
}

function legacyWorkspaceIdForComparison(
  legacy: LegacySessionSnapshot | null,
): string | null {
  if (!legacy) return null;
  return legacy.currentWorkspaceId ?? legacy.workspaceId;
}

function pushMismatch(
  mismatches: ShadowMismatch[],
  mismatch: ShadowMismatch,
): void {
  mismatches.push(mismatch);
}

function statusSeverity(
  legacy: LegacySessionSnapshot | null,
  shadow: AppSession | null,
): ShadowMismatchSeverity {
  if (!legacy?.isAuthenticated || !shadow?.isAuthenticated) return "critical";
  return "warning";
}

function workspaceRoleSeverity(
  legacy: LegacySessionSnapshot | null,
  shadow: AppSession | null,
): ShadowMismatchSeverity {
  const legacyRole = legacyWorkspaceRoleForComparison(legacy);
  if (
    inferLegacySystemOwner(legacy) &&
    legacyRole === GLOBAL_ROLES.SYSTEM_OWNER &&
    shadow?.currentWorkspaceRole === WORKSPACE_ROLES.SUPER_MANAGER
  ) {
    return "warning";
  }

  return "warning";
}

export function compareShadowSessions(
  legacy: LegacySessionSnapshot | null,
  shadow: AppSession | null,
): ShadowSessionComparison {
  const mismatches: ShadowMismatch[] = [];
  const shadowAuthenticated = shadow?.isAuthenticated === true;
  const legacyAuthenticated = legacy?.isAuthenticated === true;

  if (!legacy) {
    pushMismatch(mismatches, {
      code: "LEGACY_SESSION_MISSING",
      severity: "info",
      message: "Legacy session snapshot was not available for shadow comparison.",
      legacyValue: null,
      shadowValue: shadowAuthenticated,
    });
  }

  if (!shadow) {
    pushMismatch(mismatches, {
      code: "NEW_SESSION_MISSING",
      severity: legacyAuthenticated ? "critical" : "info",
      message: "New AppSession was not available for shadow comparison.",
      legacyValue: legacyAuthenticated,
      shadowValue: null,
    });
  }

  const uidMatches = Boolean(
    legacy &&
    shadow &&
    legacy.uid !== null &&
    legacy.uid === shadow.uid,
  );
  if (legacy && shadow && !uidMatches) {
    pushMismatch(mismatches, {
      code: "UID_MISMATCH",
      severity: "critical",
      message: "Legacy and new auth sessions point to different users.",
      legacyValue: legacy.uid,
      shadowValue: shadow.uid,
    });
  }

  const authenticationMatches = legacyAuthenticated === shadowAuthenticated;
  if (!authenticationMatches) {
    pushMismatch(mismatches, {
      code: "AUTH_STATE_MISMATCH",
      severity: "critical",
      message: "Legacy and new auth sessions disagree on authentication state.",
      legacyValue: legacyAuthenticated,
      shadowValue: shadowAuthenticated,
    });
  }

  const statusMatches = !legacy?.status ||
    !shadow ||
    legacy.status === shadow.status;
  if (legacy?.status && shadow && !statusMatches) {
    pushMismatch(mismatches, {
      code: "STATUS_MISMATCH",
      severity: statusSeverity(legacy, shadow),
      message: "Legacy and new sessions disagree on account status.",
      legacyValue: legacy.status,
      shadowValue: shadow.status,
    });
  }

  const legacySystemOwner = inferLegacySystemOwner(legacy);
  const systemOwnerMatches = legacySystemOwner === (shadow?.isSystemOwner === true);
  if (legacy && shadow && !systemOwnerMatches) {
    pushMismatch(mismatches, {
      code: "SYSTEM_OWNER_MISMATCH",
      severity: "critical",
      message: "Legacy and new sessions disagree on system owner authority.",
      legacyValue: legacySystemOwner,
      shadowValue: shadow.isSystemOwner,
    });
  }

  const legacyGlobalRole = legacyGlobalRoleForComparison(legacy);
  const globalRoleMatches = !legacyGlobalRole ||
    !shadow ||
    legacyGlobalRole === shadow.globalRole;
  if (legacyGlobalRole && shadow && !globalRoleMatches) {
    pushMismatch(mismatches, {
      code: "GLOBAL_ROLE_MISMATCH",
      severity: legacySystemOwner && shadow.isSystemOwner ? "warning" : "critical",
      message: "Legacy users.globalRole and new computed globalRole differ.",
      legacyValue: legacyGlobalRole,
      shadowValue: shadow.globalRole,
    });
  }

  const legacyWorkspaceId = legacyWorkspaceIdForComparison(legacy);
  const workspaceIdMatches = legacyWorkspaceId === (shadow?.currentWorkspaceId ?? null);
  if (legacy && shadow && !workspaceIdMatches) {
    pushMismatch(mismatches, {
      code: "WORKSPACE_ID_MISMATCH",
      severity: shadow.warnings.some((warning) => warning.code === "WORKSPACE_NOT_FOUND")
        ? "warning"
        : "warning",
      message: "Legacy and new sessions disagree on current workspace.",
      legacyValue: legacyWorkspaceId,
      shadowValue: shadow.currentWorkspaceId,
    });
  }

  const legacyWorkspaceRole = legacyWorkspaceRoleForComparison(legacy);
  const workspaceRoleMatches = legacyWorkspaceRole === (shadow?.currentWorkspaceRole ?? null);
  if (legacy && shadow && !workspaceRoleMatches) {
    pushMismatch(mismatches, {
      code: "WORKSPACE_ROLE_MISMATCH",
      severity: workspaceRoleSeverity(legacy, shadow),
      message: "Legacy and new sessions disagree on workspace role.",
      legacyValue: legacyWorkspaceRole,
      shadowValue: shadow.currentWorkspaceRole,
    });
  }

  return {
    uidMatches,
    authenticationMatches,
    statusMatches,
    systemOwnerMatches,
    globalRoleMatches,
    workspaceIdMatches,
    workspaceRoleMatches,
    mismatches,
    warnings: shadow?.warnings ?? [],
  };
}

export function maskUid(uid: string | null | undefined): string | null {
  if (!uid) return null;
  if (uid.length <= 8) return `${uid.slice(0, 2)}***`;
  return `${uid.slice(0, 4)}...${uid.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length <= 2
    ? `${local.slice(0, 1)}***`
    : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

export function maskWorkspaceId(workspaceId: string | null | undefined): string | null {
  if (!workspaceId) return null;
  if (workspaceId.length <= 8) return `${workspaceId.slice(0, 2)}***`;

  const separatorIndex = workspaceId.indexOf("_");
  if (separatorIndex > 0) {
    return `${workspaceId.slice(0, separatorIndex)}_...${workspaceId.slice(-4)}`;
  }

  return `${workspaceId.slice(0, 4)}...${workspaceId.slice(-4)}`;
}

export function createShadowLoggerPayload(params: {
  legacy: LegacySessionSnapshot | null;
  shadow: AppSession | null;
  comparison: ShadowSessionComparison;
  timestamp: string;
}): ShadowLoggerPayload {
  const sourceUid = params.shadow?.uid ?? params.legacy?.uid ?? null;
  const sourceEmail = params.shadow?.email ?? params.legacy?.email ?? null;

  return {
    timestamp: params.timestamp,
    uid: maskUid(sourceUid),
    email: maskEmail(sourceEmail),
    comparison: {
      uidMatches: params.comparison.uidMatches,
      authenticationMatches: params.comparison.authenticationMatches,
      statusMatches: params.comparison.statusMatches,
      systemOwnerMatches: params.comparison.systemOwnerMatches,
      globalRoleMatches: params.comparison.globalRoleMatches,
      workspaceIdMatches: params.comparison.workspaceIdMatches,
      workspaceRoleMatches: params.comparison.workspaceRoleMatches,
    },
    mismatches: params.comparison.mismatches.map((mismatch) => ({
      code: mismatch.code,
      severity: mismatch.severity,
      message: mismatch.message,
    })),
    warnings: params.comparison.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
    })),
  };
}

export function shouldEmitShadowLog(isDevEnvironment: boolean): boolean {
  return isDevEnvironment;
}
