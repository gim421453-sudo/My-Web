import {
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "../auth/useAuth";
import {
  useLegacyAuthAdapter,
} from "../auth/legacy/LegacyAuthAdapter";
import {
  maskLegacyAdapterEmail,
  maskLegacyAdapterValue,
  warningCodesLabel,
} from "../auth/legacy/legacyAuthAdapterUtils";
import {
  createLegacyGuardInput,
  decideLegacyRequireAuth,
  decideLegacyRequireWorkspaceRole,
  expectedRedirectForDecision,
  guardDecisionLabel,
  guardDecisionTone,
} from "../auth/legacy/guards/legacyGuardDecisionUtils";
import type {
  GuardDecision,
} from "../auth/legacy/guards/legacyGuardTypes";
import {
  VALID_WORKSPACE_ROLES,
  type WorkspaceRole,
} from "../permissions/roles";

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function DecisionCard({
  title,
  decision,
}: {
  title: string;
  decision: GuardDecision;
}) {
  const tone = guardDecisionTone(decision);

  return (
    <section className={`legacy-guard-panel legacy-guard-decision legacy-guard-${tone}`}>
      <p className="legacy-guard-eyebrow">{title}</p>
      <h2>{guardDecisionLabel(decision)}</h2>
      <dl className="legacy-guard-grid">
        <dt>state</dt>
        <dd>{decision.state}</dd>
        <dt>allow</dt>
        <dd>{valueOrDash(decision.allow)}</dd>
        <dt>reason</dt>
        <dd>{decision.reason}</dd>
        <dt>예상 목적지</dt>
        <dd>{expectedRedirectForDecision(decision) ?? "없음"}</dd>
      </dl>
    </section>
  );
}

function RawProviderPanel() {
  const {
    phase,
    firebaseUser,
    session,
    error,
  } = useAuth();

  return (
    <section className="legacy-guard-panel">
      <p className="legacy-guard-eyebrow">AuthProvider raw state</p>
      <h2>신규 Provider 원본 상태</h2>
      <dl className="legacy-guard-grid">
        <dt>phase</dt>
        <dd>{phase}</dd>
        <dt>firebase user</dt>
        <dd>{firebaseUser ? "있음" : "없음"}</dd>
        <dt>masked uid</dt>
        <dd>{maskLegacyAdapterValue(session?.uid ?? firebaseUser?.uid)}</dd>
        <dt>masked email</dt>
        <dd>{maskLegacyAdapterEmail(session?.email ?? firebaseUser?.email)}</dd>
        <dt>status</dt>
        <dd>{valueOrDash(session?.status)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(session?.globalRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(session?.isSystemOwner)}</dd>
        <dt>currentWorkspaceId</dt>
        <dd>{maskLegacyAdapterValue(session?.currentWorkspaceId)}</dd>
        <dt>currentWorkspaceRole</dt>
        <dd>{valueOrDash(session?.currentWorkspaceRole)}</dd>
        <dt>warnings</dt>
        <dd>{warningCodesLabel(session?.warnings.map((warning) => warning.code))}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(error?.code)}</dd>
      </dl>
    </section>
  );
}

function AdapterPanel() {
  const legacy = useLegacyAuthAdapter();

  return (
    <section className="legacy-guard-panel legacy-guard-panel-accent">
      <p className="legacy-guard-eyebrow">LegacyAuthAdapter converted state</p>
      <h2>기존 호환 변환 상태</h2>
      <dl className="legacy-guard-grid">
        <dt>phase</dt>
        <dd>{valueOrDash(legacy.phase)}</dd>
        <dt>loading</dt>
        <dd>{valueOrDash(legacy.loading)}</dd>
        <dt>isAuthenticated</dt>
        <dd>{valueOrDash(legacy.isAuthenticated)}</dd>
        <dt>status</dt>
        <dd>{valueOrDash(legacy.status)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(legacy.session?.globalRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(legacy.isSystemOwner)}</dd>
        <dt>workspaceId</dt>
        <dd>{maskLegacyAdapterValue(legacy.workspaceId)}</dd>
        <dt>workspaceRole</dt>
        <dd>{valueOrDash(legacy.workspaceRole)}</dd>
        <dt>currentRole</dt>
        <dd>{valueOrDash(legacy.currentRole)}</dd>
        <dt>masked uid</dt>
        <dd>{maskLegacyAdapterValue(legacy.session?.uid)}</dd>
        <dt>masked email</dt>
        <dd>{maskLegacyAdapterEmail(legacy.session?.email)}</dd>
        <dt>warnings</dt>
        <dd>{warningCodesLabel(legacy.session?.warningCodes)}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(legacy.error)}</dd>
      </dl>
    </section>
  );
}

function RoleSimulationPanel({
  allowedRoles,
  setAllowedRoles,
  requireWorkspace,
  setRequireWorkspace,
  allowSystemOwnerBypass,
  setAllowSystemOwnerBypass,
}: {
  allowedRoles: readonly WorkspaceRole[];
  setAllowedRoles: (roles: readonly WorkspaceRole[]) => void;
  requireWorkspace: boolean;
  setRequireWorkspace: (value: boolean) => void;
  allowSystemOwnerBypass: boolean;
  setAllowSystemOwnerBypass: (value: boolean) => void;
}) {
  function toggleRole(role: WorkspaceRole) {
    if (allowedRoles.includes(role)) {
      setAllowedRoles(allowedRoles.filter((item) => item !== role));
      return;
    }

    setAllowedRoles([
      ...allowedRoles,
      role,
    ]);
  }

  return (
    <section className="legacy-guard-panel">
      <p className="legacy-guard-eyebrow">Local role simulation</p>
      <h2>역할 조건 시뮬레이션</h2>
      <p className="legacy-guard-muted">
        이 영역은 Guard 입력값만 바꾸며 세션, Firestore, localStorage를 수정하지 않습니다.
      </p>
      <div className="legacy-guard-checkbox-grid">
        {VALID_WORKSPACE_ROLES.map((role) => (
          <label key={role}>
            <input
              type="checkbox"
              checked={allowedRoles.includes(role)}
              onChange={() => toggleRole(role)}
            />
            <span>{role}</span>
          </label>
        ))}
      </div>
      <div className="legacy-guard-toggle-row">
        <label>
          <input
            type="checkbox"
            checked={requireWorkspace}
            onChange={(event) => setRequireWorkspace(event.target.checked)}
          />
          <span>워크스페이스 필수</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={allowSystemOwnerBypass}
            onChange={(event) => setAllowSystemOwnerBypass(event.target.checked)}
          />
          <span>system_owner 명시 우회 허용</span>
        </label>
      </div>
    </section>
  );
}

function SafetyPanel() {
  return (
    <section className="legacy-guard-panel">
      <p className="legacy-guard-eyebrow">Safety checks</p>
      <h2>운영 영향 차단</h2>
      <dl className="legacy-guard-grid">
        <dt>실제 redirect</dt>
        <dd>없음</dd>
        <dt>자동 signOut</dt>
        <dd>없음</dd>
        <dt>Firestore write</dt>
        <dd>없음</dd>
        <dt>역할 저장 변경</dt>
        <dd>없음</dd>
        <dt>세션 저장소 삭제</dt>
        <dd>없음</dd>
      </dl>
    </section>
  );
}

export function LegacyGuardPreviewApp() {
  const legacy = useLegacyAuthAdapter();
  const [allowedRoles, setAllowedRoles] = useState<readonly WorkspaceRole[]>([
    "super_manager",
    "manager",
  ]);
  const [requireWorkspace, setRequireWorkspace] = useState(true);
  const [allowSystemOwnerBypass, setAllowSystemOwnerBypass] = useState(false);

  const guardInput = useMemo(() => createLegacyGuardInput({
    phase: legacy.phase,
    loading: legacy.loading,
    session: legacy.session,
    isAuthenticated: legacy.isAuthenticated,
    status: legacy.status,
    currentRole: legacy.currentRole,
    workspaceId: legacy.workspaceId,
    isSystemOwner: legacy.isSystemOwner,
    error: legacy.error,
  }), [
    legacy.currentRole,
    legacy.error,
    legacy.isAuthenticated,
    legacy.isSystemOwner,
    legacy.loading,
    legacy.phase,
    legacy.session,
    legacy.status,
    legacy.workspaceId,
  ]);

  const requireAuthDecision = decideLegacyRequireAuth(guardInput);
  const workspaceDecision = decideLegacyRequireWorkspaceRole({
    ...guardInput,
    allowedRoles,
    requireWorkspace,
    allowSystemOwnerBypass,
  });

  return (
    <main className="legacy-guard-shell">
      <header className="legacy-guard-header">
        <p className="legacy-guard-eyebrow">Development only</p>
        <h1>LegacyAuthAdapter Guard 판단 미리보기</h1>
        <p>
          신규 AuthProvider 값을 기존 호환 adapter로 변환한 뒤, 운영 Guard를 바꾸지 않고 test-only 판단 결과만 확인합니다.
        </p>
      </header>
      <div className="legacy-guard-columns">
        <RawProviderPanel />
        <AdapterPanel />
      </div>
      <RoleSimulationPanel
        allowedRoles={allowedRoles}
        setAllowedRoles={setAllowedRoles}
        requireWorkspace={requireWorkspace}
        setRequireWorkspace={setRequireWorkspace}
        allowSystemOwnerBypass={allowSystemOwnerBypass}
        setAllowSystemOwnerBypass={setAllowSystemOwnerBypass}
      />
      <div className="legacy-guard-columns">
        <DecisionCard
          title="RequireAuth test-only 판단"
          decision={requireAuthDecision}
        />
        <DecisionCard
          title="RequireWorkspaceRole test-only 판단"
          decision={workspaceDecision}
        />
      </div>
      <SafetyPanel />
    </main>
  );
}
