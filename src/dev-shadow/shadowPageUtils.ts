import type { AppSession } from "../auth/authTypes";
import type {
  ShadowSessionComparison,
  ShadowSessionDiagnostic,
} from "../auth/shadow";

export type ShadowOverallResult = "MATCH" | "WARNING" | "CRITICAL";

export interface SafeShadowSummary {
  result: ShadowOverallResult;
  mismatchCodes: string[];
  warningCodes: string[];
  authPhase: string;
  isSystemOwner: boolean;
  status: string | null;
  hasWorkspace: boolean;
  workspaceRole: string | null;
  hasCriticalMismatch: boolean;
}

export function isShadowPageAllowed(isDevEnvironment: boolean): boolean {
  return isDevEnvironment;
}

export function getShadowResultLevel(
  comparison: ShadowSessionComparison | null,
): ShadowOverallResult {
  if (!comparison) return "WARNING";
  if (comparison.mismatches.some((mismatch) => mismatch.severity === "critical")) {
    return "CRITICAL";
  }
  if (
    comparison.mismatches.some((mismatch) => mismatch.severity === "warning") ||
    comparison.warnings.length > 0
  ) {
    return "WARNING";
  }
  return "MATCH";
}

export function phaseForShadowSession(
  firebaseAuthenticated: boolean,
  session: AppSession | null,
): string {
  if (!firebaseAuthenticated) return "signed_out";
  if (!session) return "shadow_session_missing";
  return session.status === "active"
    ? "authenticated"
    : "account_action_required";
}

export function createSafeShadowSummary(
  diagnostic: ShadowSessionDiagnostic | null,
  firebaseAuthenticated = false,
): SafeShadowSummary {
  const comparison = diagnostic?.comparison ?? null;
  const session = diagnostic?.shadowSession ?? null;

  return {
    result: getShadowResultLevel(comparison),
    mismatchCodes: comparison?.mismatches.map((mismatch) => mismatch.code) ?? [],
    warningCodes: comparison?.warnings.map((warning) => warning.code) ?? [],
    authPhase: phaseForShadowSession(firebaseAuthenticated, session),
    isSystemOwner: session?.isSystemOwner === true,
    status: session?.status ?? null,
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    workspaceRole: session?.currentWorkspaceRole ?? null,
    hasCriticalMismatch: comparison?.mismatches.some((mismatch) => mismatch.severity === "critical") ?? false,
  };
}

export function assertSafeSummaryHasNoSensitiveIdentifiers(
  summary: SafeShadowSummary,
): boolean {
  const serialized = JSON.stringify(summary);
  return !/@/.test(serialized) &&
    !/"uid"/i.test(serialized) &&
    !/"email"/i.test(serialized) &&
    !/"workspaceId"/i.test(serialized) &&
    !/"currentWorkspaceId"/i.test(serialized);
}
