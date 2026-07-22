import type {
  ReactNode,
} from "react";

import {
  useLegacyAuthAdapter,
} from "../LegacyAuthAdapter";
import type {
  WorkspaceRole,
} from "../../../permissions/roles";
import {
  createLegacyGuardInput,
  decideLegacyRequireWorkspaceRole,
  expectedRedirectForDecision,
  guardDecisionLabel,
} from "./legacyGuardDecisionUtils";
import type {
  GuardDecision,
} from "./legacyGuardTypes";

interface TestOnlyLegacyRequireWorkspaceRoleProps {
  allowedRoles: readonly WorkspaceRole[];
  children: ReactNode;
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
  fallback?: (decision: GuardDecision) => ReactNode;
}

function DefaultWorkspaceGuardFallback({
  decision,
}: {
  decision: GuardDecision;
}) {
  return (
    <section className="legacy-guard-panel legacy-guard-denied">
      <p className="legacy-guard-eyebrow">Test-only RequireWorkspaceRole</p>
      <h2>{guardDecisionLabel(decision)}</h2>
      <p>원인 코드: {decision.reason}</p>
      <p>예상 목적지: {expectedRedirectForDecision(decision) ?? "없음"}</p>
    </section>
  );
}

export function TestOnlyLegacyRequireWorkspaceRole({
  allowedRoles,
  children,
  requireWorkspace = true,
  allowSystemOwnerBypass = false,
  fallback,
}: TestOnlyLegacyRequireWorkspaceRoleProps) {
  const legacy = useLegacyAuthAdapter();
  const baseInput = createLegacyGuardInput({
    phase: legacy.phase,
    loading: legacy.loading,
    session: legacy.session,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    currentRole: legacy.currentRole,
    workspaceId: legacy.workspaceId,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
  });
  const decision = decideLegacyRequireWorkspaceRole({
    ...baseInput,
    allowedRoles,
    requireWorkspace,
    allowSystemOwnerBypass,
  });

  if (decision.allow) {
    return <>{children}</>;
  }

  return <>{fallback ? fallback(decision) : <DefaultWorkspaceGuardFallback decision={decision} />}</>;
}
