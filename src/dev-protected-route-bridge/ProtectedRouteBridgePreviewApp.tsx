import {
  useCallback,
  useState,
} from "react";

import {
  ProtectedRoute,
} from "../components/ProtectedRoute";
import {
  protectedRouteDecisionLabel,
  type ProtectedRouteBridgeMode,
  type ProtectedRouteBridgeSnapshot,
} from "../auth/legacy/guards/protectedRouteBridgeUtils";

interface ProtectedRouteBridgePreviewAppProps {
  mode: ProtectedRouteBridgeMode;
  flagEnabled: boolean;
}

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function snapshotKey(snapshot: ProtectedRouteBridgeSnapshot | null): string {
  if (!snapshot) return "";
  return JSON.stringify({
    mode: snapshot.mode,
    phase: snapshot.phase,
    loading: snapshot.loading,
    isAuthenticated: snapshot.isAuthenticated,
    status: snapshot.status,
    globalRole: snapshot.globalRole,
    currentWorkspaceRole: snapshot.currentWorkspaceRole,
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
  snapshot: ProtectedRouteBridgeSnapshot | null;
  mode: ProtectedRouteBridgeMode;
  flagEnabled: boolean;
}) {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-panel-accent">
      <p className="require-auth-bridge-eyebrow">ProtectedRoute bridge state</p>
      <h2>Parallel ProtectedRoute state</h2>
      <dl className="require-auth-bridge-grid">
        <dt>mode</dt>
        <dd>{mode}</dd>
        <dt>feature flag</dt>
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
        <dt>currentWorkspaceRole</dt>
        <dd>{valueOrDash(snapshot?.currentWorkspaceRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(snapshot?.isSystemOwner)}</dd>
        <dt>workspace selected</dt>
        <dd>{valueOrDash(snapshot?.hasCurrentWorkspaceId)}</dd>
        <dt>decision</dt>
        <dd>
          {snapshot
            ? `${protectedRouteDecisionLabel(snapshot.decision)} / ${snapshot.decision.reason}`
            : "-"}
        </dd>
        <dt>children rendered</dt>
        <dd>{valueOrDash(snapshot?.childrenRendered)}</dd>
        <dt>expected destination</dt>
        <dd>{snapshot?.expectedDestination ?? "none"}</dd>
        <dt>redirect attempted</dt>
        <dd>{valueOrDash(snapshot?.redirectAttempted)}</dd>
        <dt>automatic signOut</dt>
        <dd>{valueOrDash(snapshot?.automaticSignOutOccurred)}</dd>
      </dl>
    </section>
  );
}

function ProtectedPreviewContent() {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-success">
      <p className="require-auth-bridge-eyebrow">Protected children</p>
      <h2>Children rendered</h2>
      <p>
        ProtectedRoute allowed this protected area.
      </p>
    </section>
  );
}

function SafetyPanel() {
  return (
    <section className="require-auth-bridge-panel">
      <p className="require-auth-bridge-eyebrow">Safety</p>
      <h2>Guardrails</h2>
      <dl className="require-auth-bridge-grid">
        <dt>operational static app</dt>
        <dd>unchanged</dd>
        <dt>Firestore write</dt>
        <dd>none</dd>
        <dt>Rules change</dt>
        <dd>none</dd>
        <dt>automatic signOut</dt>
        <dd>none</dd>
        <dt>rollback</dt>
        <dd>?newAuthProtectedRoute=off</dd>
      </dl>
    </section>
  );
}

export function ProtectedRouteBridgePreviewApp({
  mode,
  flagEnabled,
}: ProtectedRouteBridgePreviewAppProps) {
  const [snapshot, setSnapshot] = useState<ProtectedRouteBridgeSnapshot | null>(null);
  const handleSnapshot = useCallback((nextSnapshot: ProtectedRouteBridgeSnapshot) => {
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
        <h1>ProtectedRoute parallel preview</h1>
        <p>
          This page uses the real ProtectedRoute component and switches between
          legacy AuthContext and the new AuthProvider path by feature flag.
        </p>
      </header>
      <SnapshotPanel
        snapshot={snapshot}
        mode={mode}
        flagEnabled={flagEnabled}
      />
      <ProtectedRoute
        menuKey="dashboard"
        previewMode
        onSnapshot={handleSnapshot}
      >
        <ProtectedPreviewContent />
      </ProtectedRoute>
      <SafetyPanel />
    </main>
  );
}
