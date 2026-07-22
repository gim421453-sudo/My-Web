import type {
  LegacySessionSnapshot,
  ShadowSessionDiagnostic,
} from "../auth/shadow/shadowTypes";
import {
  maskWorkspaceId,
} from "../auth/shadow/shadowSessionComparator";
import {
  createSafeShadowSummary,
} from "../dev-shadow/shadowPageUtils";

export type PermissionDeniedState = "unknown" | "yes" | "no";
export type RefreshPersistenceState = "unknown" | "yes" | "no" | "not_tested";

export interface AdminBugInput {
  screenOrTab: string;
  clickedButton: string;
  symptom: string;
  consoleError: string;
  firestorePermissionDenied: PermissionDeniedState;
  reproductionSteps: string;
  persistsAfterRefresh: RefreshPersistenceState;
}

export interface SafeAdminBugReport {
  reportType: "owner-admin-diagnostics";
  createdAt: string;
  origin: string;
  screenOrTab: string;
  clickedButton: string;
  symptom: string;
  consoleError: string;
  firestorePermissionDenied: PermissionDeniedState;
  reproductionSteps: string;
  persistsAfterRefresh: RefreshPersistenceState;
  legacy: {
    isAuthenticated: boolean | null;
    status: string | null;
    role: string | null;
    currentRole: string | null;
    globalRole: string | null;
    workspaceRole: string | null;
    workspaceIdMasked: string | null;
  };
  shadow: ReturnType<typeof createSafeShadowSummary>;
  shadowRoleContext: {
    globalRole: string | null;
    currentWorkspaceRole: string | null;
    workspaceIdMasked: string | null;
    warningCodes: string[];
    mismatchCodes: string[];
  };
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+\n/g, "\n").slice(0, 4000);
}

export function emptyAdminBugInput(): AdminBugInput {
  return {
    screenOrTab: "",
    clickedButton: "",
    symptom: "",
    consoleError: "",
    firestorePermissionDenied: "unknown",
    reproductionSteps: "",
    persistsAfterRefresh: "unknown",
  };
}

export function createSafeAdminBugReport(params: {
  input: AdminBugInput;
  legacySession: LegacySessionSnapshot | null;
  diagnostic: ShadowSessionDiagnostic | null;
  firebaseAuthenticated: boolean;
  origin: string;
  createdAt?: string;
}): SafeAdminBugReport {
  const shadowSummary = createSafeShadowSummary(
    params.diagnostic,
    params.firebaseAuthenticated,
  );
  const legacyWorkspaceId = params.legacySession?.currentWorkspaceId ??
    params.legacySession?.workspaceId ??
    null;

  return {
    reportType: "owner-admin-diagnostics",
    createdAt: params.createdAt ?? new Date().toISOString(),
    origin: params.origin,
    screenOrTab: cleanText(params.input.screenOrTab),
    clickedButton: cleanText(params.input.clickedButton),
    symptom: cleanText(params.input.symptom),
    consoleError: cleanText(params.input.consoleError),
    firestorePermissionDenied: params.input.firestorePermissionDenied,
    reproductionSteps: cleanText(params.input.reproductionSteps),
    persistsAfterRefresh: params.input.persistsAfterRefresh,
    legacy: {
      isAuthenticated: params.legacySession?.isAuthenticated ?? null,
      status: params.legacySession?.status ?? null,
      role: params.legacySession?.role ?? null,
      currentRole: params.legacySession?.currentRole ?? null,
      globalRole: params.legacySession?.globalRole ?? null,
      workspaceRole: params.legacySession?.workspaceRole ?? null,
      workspaceIdMasked: maskWorkspaceId(legacyWorkspaceId),
    },
    shadow: shadowSummary,
    shadowRoleContext: {
      globalRole: params.diagnostic?.shadowSession?.globalRole ?? null,
      currentWorkspaceRole: params.diagnostic?.shadowSession?.currentWorkspaceRole ?? null,
      workspaceIdMasked: maskWorkspaceId(params.diagnostic?.shadowSession?.currentWorkspaceId),
      warningCodes: params.diagnostic?.comparison.warnings.map((warning) => warning.code) ?? [],
      mismatchCodes: params.diagnostic?.comparison.mismatches.map((mismatch) => mismatch.code) ?? [],
    },
  };
}

export function assertAdminBugReportHasNoRawIdentifiers(
  report: SafeAdminBugReport,
): boolean {
  const serialized = JSON.stringify(report);
  return !/"uid"/i.test(serialized) &&
    !/"email"/i.test(serialized) &&
    !/"workspaceId"/i.test(serialized) &&
    !/"currentWorkspaceId"/i.test(serialized) &&
    !/@/.test(serialized);
}
