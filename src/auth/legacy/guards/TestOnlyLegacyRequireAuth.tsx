import type {
  ReactNode,
} from "react";

import {
  useLegacyAuthAdapter,
} from "../LegacyAuthAdapter";
import {
  createLegacyGuardInput,
  decideLegacyRequireAuth,
  expectedRedirectForDecision,
  guardDecisionLabel,
} from "./legacyGuardDecisionUtils";
import type {
  GuardDecision,
} from "./legacyGuardTypes";

interface TestOnlyLegacyRequireAuthProps {
  children: ReactNode;
  fallback?: (decision: GuardDecision) => ReactNode;
}

function DefaultGuardFallback({
  decision,
}: {
  decision: GuardDecision;
}) {
  return (
    <section className="legacy-guard-panel legacy-guard-denied">
      <p className="legacy-guard-eyebrow">Test-only RequireAuth</p>
      <h2>{guardDecisionLabel(decision)}</h2>
      <p>원인 코드: {decision.reason}</p>
      <p>예상 목적지: {expectedRedirectForDecision(decision) ?? "없음"}</p>
    </section>
  );
}

export function TestOnlyLegacyRequireAuth({
  children,
  fallback,
}: TestOnlyLegacyRequireAuthProps) {
  const legacy = useLegacyAuthAdapter();
  const decision = decideLegacyRequireAuth(createLegacyGuardInput({
    phase: legacy.phase,
    loading: legacy.loading,
    session: legacy.session,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    currentRole: legacy.currentRole,
    workspaceId: legacy.workspaceId,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
  }));

  if (decision.allow) {
    return <>{children}</>;
  }

  return <>{fallback ? fallback(decision) : <DefaultGuardFallback decision={decision} />}</>;
}
