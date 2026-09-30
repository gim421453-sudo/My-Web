import {
  GLOBAL_ROLES,
  type GlobalRole,
} from "../permissions/roles";
import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  type SessionWarning,
  type UserDocumentData,
} from "./authTypes";

export function normalizeLegacyDisabled(value: unknown): boolean | null {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return ACCOUNT_STATUSES.includes(value as AccountStatus);
}

export function isActiveSystemOwnerAuthority(data: Record<string, unknown>): boolean {
  return (!Object.prototype.hasOwnProperty.call(data, "status") || data.status === "active")
    && (!Object.prototype.hasOwnProperty.call(data, "disabled") || data.disabled === false)
    && (!Object.prototype.hasOwnProperty.call(data, "active") || data.active === true);
}

export function createSessionWarning(
  code: SessionWarning["code"],
  message: string,
  details?: Record<string, unknown>,
): SessionWarning {
  return { code, message, details };
}

export function normalizeAccountStatus(
  data: UserDocumentData,
): { status: AccountStatus; warnings: SessionWarning[] } {
  const warnings: SessionWarning[] = [];
  const hasStatus = Object.prototype.hasOwnProperty.call(data, "status");
  const hasActive = Object.prototype.hasOwnProperty.call(data, "active");
  const hasDisabled = Object.prototype.hasOwnProperty.call(data, "disabled");
  const disabled = normalizeLegacyDisabled(data.disabled);

  if (hasActive || hasDisabled) {
    warnings.push(createSessionWarning(
      "LEGACY_STATUS_FIELDS_PRESENT",
      "legacy active/disabled fields are present and should be migrated later.",
      { active: data.active, disabled: data.disabled },
    ));
  }

  if (hasStatus && isAccountStatus(data.status)) {
    if (
      (data.status === "active" && (disabled === true || data.active === false)) ||
      (data.status === "disabled" && (disabled === false || data.active === true)) ||
      ((data.status === "pending" || data.status === "rejected") && data.active === true)
    ) {
      warnings.push(createSessionWarning(
        "STATUS_FIELD_CONFLICT",
        "status and legacy status fields disagree.",
        { status: data.status, active: data.active, disabled: data.disabled },
      ));
    }

    return { status: data.status, warnings };
  }

  if (disabled === true) return { status: "disabled", warnings };
  if (disabled === false && data.active !== false) return { status: "active", warnings };
  if (data.active === false) return { status: "disabled", warnings };
  if (data.active === true) return { status: "active", warnings };

  return { status: "pending", warnings };
}

export function resolveGlobalRole(params: {
  systemOwnerExists: boolean;
  usersGlobalRole: unknown;
  legacyRole: unknown;
  legacyCurrentRole?: unknown;
  legacyWorkspaceRole?: unknown;
}): { globalRole: GlobalRole; warnings: SessionWarning[] } {
  const warnings: SessionWarning[] = [];
  const computedRole = params.systemOwnerExists
    ? GLOBAL_ROLES.SYSTEM_OWNER
    : GLOBAL_ROLES.USER;

  const legacyRoleFields = {
    role: params.legacyRole,
    currentRole: params.legacyCurrentRole,
    workspaceRole: params.legacyWorkspaceRole,
  };

  if (Object.values(legacyRoleFields).some((value) => value !== undefined)) {
    warnings.push(createSessionWarning(
      "LEGACY_ROLE_PRESENT",
      "legacy users role fields are present and should be removed after app.js compatibility ends.",
      legacyRoleFields,
    ));
  }

  if (
    (params.systemOwnerExists && params.usersGlobalRole !== GLOBAL_ROLES.SYSTEM_OWNER) ||
    (!params.systemOwnerExists && params.usersGlobalRole === GLOBAL_ROLES.SYSTEM_OWNER)
  ) {
    warnings.push(createSessionWarning(
      "GLOBAL_ROLE_MISMATCH",
      "users.globalRole does not match canonical systemOwners authority and is not used to grant system_owner.",
      {
        usersGlobalRole: params.usersGlobalRole,
        systemOwnerDocumentExists: params.systemOwnerExists,
      },
    ));
  }

  return {
    globalRole: computedRole,
    warnings,
  };
}

export function normalizeStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

export function resolveCurrentWorkspaceId(data: UserDocumentData): string | null {
  return normalizeStringOrNull(data.currentWorkspaceId);
}
