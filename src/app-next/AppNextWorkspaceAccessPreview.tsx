import {
  useMemo,
} from "react";

import {
  useAuth,
} from "../auth/useAuth";
import {
  appNextWorkspacePreviewPolicySnapshot,
} from "./appNextRouteUtils";

function valueOrDash(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function booleanLabel(value: boolean): string {
  return value ? "true" : "false";
}

export function AppNextWorkspaceAccessPreview() {
  const {
    session,
  } = useAuth();
  const policy = useMemo(
    () => appNextWorkspacePreviewPolicySnapshot(session),
    [session],
  );

  return (
    <section className="app-next-panel">
      <div className="app-next-section-head">
        <div>
          <h2>Workspace Access Preview</h2>
          <p>
            Read-only pilot for workspace role guard behavior in app-next.
          </p>
        </div>
        <span className="app-next-badge app-next-success">read-only</span>
      </div>
      <dl className="app-next-device-summary">
        <dt>route</dt>
        <dd>{policy.route}</dd>
        <dt>accessAllowed</dt>
        <dd>{booleanLabel(policy.accessAllowed)}</dd>
        <dt>workspacePresent</dt>
        <dd>{booleanLabel(policy.workspacePresent)}</dd>
        <dt>workspaceRoleCategory</dt>
        <dd>{valueOrDash(policy.workspaceRoleCategory)}</dd>
        <dt>globalRoleCategory</dt>
        <dd>{valueOrDash(policy.globalRoleCategory)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{booleanLabel(policy.isSystemOwner)}</dd>
        <dt>allowSystemOwner</dt>
        <dd>{booleanLabel(policy.allowSystemOwner)}</dd>
        <dt>requiredWorkspaceRoles</dt>
        <dd>{policy.requiredWorkspaceRoles.join(", ")}</dd>
        <dt>decision</dt>
        <dd>{policy.decision}</dd>
        <dt>Firestore read count</dt>
        <dd>0</dd>
        <dt>Firestore write count</dt>
        <dd>0</dd>
      </dl>
      <p className="app-next-message">
        This page does not open real workspace data, change roles, select
        workspaces, create memberships, or perform Firebase reads or writes.
      </p>
    </section>
  );
}
