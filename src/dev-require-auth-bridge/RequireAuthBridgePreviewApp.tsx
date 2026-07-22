import {
  useCallback,
  useState,
} from "react";

import RequireAuth from "../components/guards/RequireAuth";
import {
  guardDecisionLabel,
} from "../auth/legacy/guards/legacyGuardDecisionUtils";
import type {
  RequireAuthBridgeMode,
  RequireAuthBridgeSnapshot,
} from "../auth/legacy/guards/requireAuthBridgeUtils";

interface RequireAuthBridgePreviewAppProps {
  mode: RequireAuthBridgeMode;
  flagEnabled: boolean;
}

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function snapshotKey(snapshot: RequireAuthBridgeSnapshot | null): string {
  if (!snapshot) return "";
  return JSON.stringify({
    mode: snapshot.mode,
    phase: snapshot.phase,
    loading: snapshot.loading,
    isAuthenticated: snapshot.isAuthenticated,
    status: snapshot.status,
    globalRole: snapshot.globalRole,
    isSystemOwner: snapshot.isSystemOwner,
    hasCurrentWorkspaceId: snapshot.hasCurrentWorkspaceId,
    reason: snapshot.decision.reason,
    state: snapshot.decision.state,
    childrenRendered: snapshot.childrenRendered,
    expectedDestination: snapshot.expectedDestination,
    redirectAttempted: snapshot.redirectAttempted,
    automaticSignOutOccurred: snapshot.automaticSignOutOccurred,
  });
}

function SnapshotPanel({
  snapshot,
  mode,
  flagEnabled,
}: {
  snapshot: RequireAuthBridgeSnapshot | null;
  mode: RequireAuthBridgeMode;
  flagEnabled: boolean;
}) {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-panel-accent">
      <p className="require-auth-bridge-eyebrow">RequireAuth bridge state</p>
      <h2>병행 RequireAuth 상태</h2>
      <dl className="require-auth-bridge-grid">
        <dt>현재 모드</dt>
        <dd>{mode}</dd>
        <dt>기능 플래그</dt>
        <dd>{valueOrDash(flagEnabled)}</dd>
        <dt>phase</dt>
        <dd>{valueOrDash(snapshot?.phase)}</dd>
        <dt>loading</dt>
        <dd>{valueOrDash(snapshot?.loading)}</dd>
        <dt>isAuthenticated</dt>
        <dd>{valueOrDash(snapshot?.isAuthenticated)}</dd>
        <dt>status</dt>
        <dd>{valueOrDash(snapshot?.status)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(snapshot?.globalRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(snapshot?.isSystemOwner)}</dd>
        <dt>currentWorkspaceId 존재</dt>
        <dd>{valueOrDash(snapshot?.hasCurrentWorkspaceId)}</dd>
        <dt>RequireAuth 판단</dt>
        <dd>
          {snapshot
            ? `${guardDecisionLabel(snapshot.decision)} / ${snapshot.decision.reason}`
            : "-"}
        </dd>
        <dt>children 렌더링</dt>
        <dd>{valueOrDash(snapshot?.childrenRendered)}</dd>
        <dt>예상 목적지</dt>
        <dd>{snapshot?.expectedDestination ?? "없음"}</dd>
        <dt>redirect 발생</dt>
        <dd>{valueOrDash(snapshot?.redirectAttempted)}</dd>
        <dt>자동 signOut 발생</dt>
        <dd>{valueOrDash(snapshot?.automaticSignOutOccurred)}</dd>
      </dl>
    </section>
  );
}

function ProtectedPreviewContent() {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-success">
      <p className="require-auth-bridge-eyebrow">Protected children</p>
      <h2>children 렌더링됨</h2>
      <p>
        현재 RequireAuth 판단이 통과되어 보호 영역이 표시되고 있습니다.
      </p>
    </section>
  );
}

function SafetyPanel() {
  return (
    <section className="require-auth-bridge-panel">
      <p className="require-auth-bridge-eyebrow">Safety</p>
      <h2>안전 조건</h2>
      <dl className="require-auth-bridge-grid">
        <dt>운영 정적 앱 변경</dt>
        <dd>없음</dd>
        <dt>Rules 변경</dt>
        <dd>없음</dd>
        <dt>Firestore write</dt>
        <dd>없음</dd>
        <dt>자동 signOut 추가</dt>
        <dd>없음</dd>
        <dt>롤백</dt>
        <dd>?newAuthRequireAuth=off</dd>
      </dl>
    </section>
  );
}

export function RequireAuthBridgePreviewApp({
  mode,
  flagEnabled,
}: RequireAuthBridgePreviewAppProps) {
  const [snapshot, setSnapshot] = useState<RequireAuthBridgeSnapshot | null>(null);
  const handleSnapshot = useCallback((nextSnapshot: RequireAuthBridgeSnapshot) => {
    setSnapshot((previous) => (
      snapshotKey(previous) === snapshotKey(nextSnapshot)
        ? previous
        : nextSnapshot
    ));
  }, []);

  return (
    <main className="require-auth-bridge-shell">
      <header className="require-auth-bridge-header">
        <p className="require-auth-bridge-eyebrow">Development only</p>
        <h1>RequireAuth 병행 전환 미리보기</h1>
        <p>
          실제 RequireAuth를 사용하되, 기능 플래그에 따라 기존 AuthContext 경로와 신규 AuthProvider 경로를 선택합니다.
        </p>
      </header>
      <SnapshotPanel
        snapshot={snapshot}
        mode={mode}
        flagEnabled={flagEnabled}
      />
      <RequireAuth
        previewMode
        onSnapshot={handleSnapshot}
      >
        <ProtectedPreviewContent />
      </RequireAuth>
      <SafetyPanel />
    </main>
  );
}
