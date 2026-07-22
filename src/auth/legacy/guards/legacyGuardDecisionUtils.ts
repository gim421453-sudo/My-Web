import type {
  AuthPhase,
} from "../../authTypes";
import {
  isWorkspaceRole,
} from "../../../permissions/roles";
import type {
  WorkspaceRole,
} from "../../../permissions/roles";
import type {
  GuardDecision,
  GuardDenyReason,
  GuardExpectedDestination,
  GuardReason,
  LegacyGuardInput,
  LegacyWorkspaceGuardInput,
  ResolveLegacyAuthGuardPreviewFlagInput,
} from "./legacyGuardTypes";

function parseBooleanSwitch(value: unknown): boolean | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function queryValue(search: string, key: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;

  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    if (decodeURIComponent(rawKey || "") === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, " "));
    }
  }

  return null;
}

function loadingReasonFromPhase(phase: AuthPhase) {
  return phase === "initializing" ? "AUTH_INITIALIZING" : "SESSION_LOADING";
}

function deny(reason: GuardDenyReason): GuardDecision {
  return {
    state: "deny",
    allow: false,
    reason,
    expectedDestination: expectedDestinationForReason(reason),
  };
}

function expectedDestinationForReason(
  reason: GuardReason,
): GuardExpectedDestination {
  switch (reason) {
    case "SIGNED_OUT":
      return "/login";
    case "ACCOUNT_PENDING":
      return "/pending";
    case "ACCOUNT_REJECTED":
      return "/rejected";
    case "ACCOUNT_DISABLED":
      return "/disabled";
    case "WORKSPACE_REQUIRED":
      return "/workspace-select";
    case "WORKSPACE_ROLE_MISSING":
    case "WORKSPACE_ROLE_NOT_ALLOWED":
    case "SESSION_ERROR":
      return "/forbidden";
    default:
      return null;
  }
}

export function resolveLegacyAuthGuardPreviewFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveLegacyAuthGuardPreviewFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "guard"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function expectedRedirectForDecision(
  decision: GuardDecision,
): GuardExpectedDestination {
  return decision.expectedDestination;
}

export function guardDecisionTone(
  decision: GuardDecision,
): "muted" | "success" | "warning" | "error" {
  if (decision.state === "allow") return "success";
  if (decision.state === "loading") return "muted";
  if (
    decision.reason === "ACCOUNT_PENDING" ||
    decision.reason === "WORKSPACE_REQUIRED"
  ) {
    return "warning";
  }
  return "error";
}

export function guardDecisionLabel(decision: GuardDecision): string {
  if (decision.state === "loading") return "확인 중";
  if (decision.state === "allow") return "허용";
  return "차단";
}

export function createLegacyGuardInput(
  input: Partial<LegacyGuardInput> = {},
): LegacyGuardInput {
  const session = input.session ?? null;

  return {
    phase: input.phase ?? "signed_out",
    loading: input.loading ?? false,
    session,
    isAuthenticated: input.isAuthenticated ?? Boolean(session?.isAuthenticated),
    status: input.status ?? session?.status ?? null,
    currentRole: normalizeWorkspaceRole(input.currentRole ?? session?.currentRole ?? null),
    workspaceId: input.workspaceId ?? session?.workspaceId ?? null,
    isSystemOwner: input.isSystemOwner ?? Boolean(session?.isSystemOwner),
    error: input.error ?? null,
  };
}

export function normalizeWorkspaceRole(
  value: unknown,
): WorkspaceRole | null {
  return isWorkspaceRole(value) ? value : null;
}

export function decideLegacyRequireAuth(
  input: LegacyGuardInput,
): GuardDecision {
  if (input.loading || input.phase === "initializing" || input.phase === "loading_session") {
    return {
      state: "loading",
      allow: false,
      reason: loadingReasonFromPhase(input.phase),
      expectedDestination: null,
    };
  }

  if (input.error || input.phase === "error") {
    return deny("SESSION_ERROR");
  }

  if (!input.session || !input.isAuthenticated || input.phase === "signed_out") {
    return deny("SIGNED_OUT");
  }

  if (input.status === "pending") return deny("ACCOUNT_PENDING");
  if (input.status === "rejected") return deny("ACCOUNT_REJECTED");
  if (input.status === "disabled") return deny("ACCOUNT_DISABLED");
  if (input.status !== "active") return deny("SESSION_ERROR");

  if (!input.workspaceId) {
    return {
      state: "allow",
      allow: true,
      reason: "AUTHENTICATED_WITHOUT_WORKSPACE",
      expectedDestination: null,
    };
  }

  return {
    state: "allow",
    allow: true,
    reason: "AUTHENTICATED_ACTIVE",
    expectedDestination: null,
  };
}

export function decideLegacyRequireWorkspaceRole(
  input: LegacyWorkspaceGuardInput,
): GuardDecision {
  const authDecision = decideLegacyRequireAuth(input);
  if (!authDecision.allow) return authDecision;

  if (input.isSystemOwner && input.allowSystemOwnerBypass === true) {
    return {
      state: "allow",
      allow: true,
      reason: "SYSTEM_OWNER",
      expectedDestination: null,
    };
  }

  if (!input.workspaceId) {
    if (input.requireWorkspace === true) {
      return deny("WORKSPACE_REQUIRED");
    }

    return {
      state: "allow",
      allow: true,
      reason: "AUTHENTICATED_WITHOUT_WORKSPACE",
      expectedDestination: null,
    };
  }

  const currentRole = normalizeWorkspaceRole(input.currentRole);
  if (!currentRole) {
    return deny("WORKSPACE_ROLE_MISSING");
  }

  if (input.allowedRoles.includes(currentRole)) {
    return {
      state: "allow",
      allow: true,
      reason: "WORKSPACE_ROLE_ALLOWED",
      expectedDestination: null,
    };
  }

  return deny("WORKSPACE_ROLE_NOT_ALLOWED");
}
