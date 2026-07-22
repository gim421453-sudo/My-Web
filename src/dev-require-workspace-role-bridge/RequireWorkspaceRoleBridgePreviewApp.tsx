import {
  useCallback,
  useState,
} from "react";

import RequireWorkspaceRole from "../components/guards/RequireWorkspaceRole";
import {
  VALID_WORKSPACE_ROLES,
  type WorkspaceRole,
} from "../constants/roles";
import {
  workspaceRoleDecisionLabel,
  type RequireWorkspaceRoleBridgeMode,
  type RequireWorkspaceRoleBridgeSnapshot,
} from "../auth/legacy/guards/workspaceRoleBridgeUtils";

interface RequireWorkspaceRoleBridgePreviewAppProps {
  mode: RequireWorkspaceRoleBridgeMode;
  flagEnabled: boolean;
}

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function snapshotKey(snapshot: RequireWorkspaceRoleBridgeSnapshot | null): string {
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
    allowedRoles: snapshot.allowedRoles,
    requireWorkspace: snapshot.requireWorkspace,
    allowSystemOwnerBypass: snapshot.allowSystemOwnerBypass,
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
  snapshot: RequireWorkspaceRoleBridgeSnapshot | null;
  mode: RequireWorkspaceRoleBridgeMode;
  flagEnabled: boolean;
}) {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-panel-accent">
      <p className="require-auth-bridge-eyebrow">RequireWorkspaceRole bridge state</p>
      <h2>Parallel workspace role guard state</h2>
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
        <dt>allowedRoles</dt>
        <dd>{snapshot?.allowedRoles.join(", ") ?? "-"}</dd>
        <dt>system owner bypass</dt>
        <dd>{valueOrDash(snapshot?.allowSystemOwnerBypass)}</dd>
        <dt>decision</dt>
        <dd>
          {snapshot
            ? `${workspaceRoleDecisionLabel(snapshot.decision)} / ${snapshot.decision.reason}`
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

function RoleControls({
  allowedRoles,
  setAllowedRoles,
  allowSystemOwnerBypass,
  setAllowSystemOwnerBypass,
}: {
  allowedRoles: readonly WorkspaceRole[];
  setAllowedRoles: (roles: readonly WorkspaceRole[]) => void;
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
    <section className="require-auth-bridge-panel">
      <p className="require-auth-bridge-eyebrow">Local guard input</p>
      <h2>Allowed workspace roles</h2>
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
            checked={allowSystemOwnerBypass}
            onChange={(event) => setAllowSystemOwnerBypass(event.target.checked)}
          />
          <span>allowSystemOwnerBypass</span>
        </label>
      </div>
    </section>
  );
}

function ProtectedPreviewContent() {
  return (
    <section className="require-auth-bridge-panel require-auth-bridge-success">
      <p className="require-auth-bridge-eyebrow">Workspace protected children</p>
      <h2>Children rendered</h2>
      <p>
        RequireWorkspaceRole allowed this protected area.
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
        <dd>?newAuthRequireWorkspaceRole=off</dd>
      </dl>
    </section>
  );
}

export function RequireWorkspaceRoleBridgePreviewApp({
  mode,
  flagEnabled,
}: RequireWorkspaceRoleBridgePreviewAppProps) {
  const [snapshot, setSnapshot] = useState<RequireWorkspaceRoleBridgeSnapshot | null>(null);
  const [allowedRoles, setAllowedRoles] = useState<readonly WorkspaceRole[]>([
    "super_manager",
    "manager",
  ]);
  const [allowSystemOwnerBypass, setAllowSystemOwnerBypass] = useState(false);
  const handleSnapshot = useCallback((nextSnapshot: RequireWorkspaceRoleBridgeSnapshot) => {
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
        <h1>RequireWorkspaceRole parallel preview</h1>
        <p>
          This page uses the real RequireWorkspaceRole component and switches
          between legacy AuthContext and the new AuthProvider path by feature flag.
        </p>
      </header>
      <SnapshotPanel
        snapshot={snapshot}
        mode={mode}
        flagEnabled={flagEnabled}
      />
      <RoleControls
        allowedRoles={allowedRoles}
        setAllowedRoles={setAllowedRoles}
        allowSystemOwnerBypass={allowSystemOwnerBypass}
        setAllowSystemOwnerBypass={setAllowSystemOwnerBypass}
      />
      <RequireWorkspaceRole
        allowedRoles={allowedRoles}
        allowSystemOwnerBypass={allowSystemOwnerBypass}
        previewMode
        onSnapshot={handleSnapshot}
      >
        <ProtectedPreviewContent />
      </RequireWorkspaceRole>
      <SafetyPanel />
    </main>
  );
}
