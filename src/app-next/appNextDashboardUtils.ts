import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";
import type {
  AppNextWorkspaceNoticeRecord,
} from "./appNextWorkspaceNoticesUtils";

export type AppNextDashboardReadReason =
  | "loading"
  | "signed-out"
  | "pending"
  | "rejected"
  | "disabled"
  | "error"
  | "active";

export interface AppNextDashboardPolicyInput {
  phase: AuthPhase;
  session: AppSession | null;
}

export interface AppNextDashboardPolicy {
  routeAllowed: boolean;
  noticeSummaryAllowed: boolean;
  reason: AppNextDashboardReadReason;
  hasWorkspace: boolean;
  globalRoleCategory: string;
  workspaceRoleCategory: string;
  isSystemOwner: boolean;
}

export interface AppNextDashboardNoticeSummary {
  visibleCount: number;
  summaryCount: number;
  recent: AppNextWorkspaceNoticeRecord[];
}

export function appNextDashboardRoleCategory(value: string | null | undefined): string {
  if (!value) return "none";
  if ([
    "system_owner",
    "user",
    "super_manager",
    "manager",
    "teacher",
    "normal",
    "viewer",
    "print_account",
  ].includes(value)) {
    return value;
  }
  return "unknown";
}

export function appNextDashboardPolicy({
  phase,
  session,
}: AppNextDashboardPolicyInput): AppNextDashboardPolicy {
  const base = {
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    globalRoleCategory: appNextDashboardRoleCategory(session?.globalRole),
    workspaceRoleCategory: appNextDashboardRoleCategory(session?.currentWorkspaceRole),
    isSystemOwner: Boolean(session?.isSystemOwner),
  };

  if (phase === "initializing" || phase === "loading_session") {
    return {
      ...base,
      routeAllowed: false,
      noticeSummaryAllowed: false,
      reason: "loading",
    };
  }

  if (phase === "signed_out" || !session) {
    return {
      ...base,
      routeAllowed: false,
      noticeSummaryAllowed: false,
      reason: "signed-out",
    };
  }

  if (phase === "error") {
    return {
      ...base,
      routeAllowed: false,
      noticeSummaryAllowed: false,
      reason: "error",
    };
  }

  if (session.status !== "active" || phase === "account_action_required") {
    return {
      ...base,
      routeAllowed: false,
      noticeSummaryAllowed: false,
      reason: session.status === "active" ? "error" : session.status,
    };
  }

  return {
    ...base,
    routeAllowed: true,
    noticeSummaryAllowed: Boolean(session.currentWorkspaceId),
    reason: "active",
  };
}

export function summarizeAppNextDashboardNotices(
  notices: AppNextWorkspaceNoticeRecord[],
  maxCount = 3,
): AppNextDashboardNoticeSummary {
  return {
    visibleCount: notices.length,
    summaryCount: Math.min(maxCount, notices.length),
    recent: notices.slice(0, maxCount),
  };
}
