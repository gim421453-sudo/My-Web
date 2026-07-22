import {
  useMemo,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  appNextAdminPreviewPolicySnapshot,
} from "./appNextRouteUtils";

function valueOrDash(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function booleanLabel(value: boolean): string {
  return value ? "true" : "false";
}

export function AppNextAdminAccessPreview() {
  const {
    session,
  } = useAuth();
  const policy = useMemo(
    () => appNextAdminPreviewPolicySnapshot(session),
    [session],
  );

  return (
    <section className="app-next-panel">
      <div className="app-next-section-head">
        <div>
          <h2>Admin Access Preview</h2>
          <p>
            Read-only route guard pilot for the app-next admin menu policy.
          </p>
        </div>
        <span className="app-next-badge app-next-success">read-only</span>
      </div>
      <dl className="app-next-device-summary">
        <dt>route</dt>
        <dd>{policy.route}</dd>
        <dt>accessAllowed</dt>
        <dd>{booleanLabel(policy.accessAllowed)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(policy.globalRoleCategory)}</dd>
        <dt>workspaceRole</dt>
        <dd>{valueOrDash(policy.workspaceRoleCategory)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{booleanLabel(policy.isSystemOwner)}</dd>
        <dt>workspacePresent</dt>
        <dd>{booleanLabel(policy.hasWorkspace)}</dd>
        <dt>allowedCapability</dt>
        <dd>{policy.capability}</dd>
        <dt>permissionRole</dt>
        <dd>{valueOrDash(policy.permissionRoleCategory)}</dd>
        <dt>Firestore read</dt>
        <dd>0</dd>
        <dt>Firestore write</dt>
        <dd>0</dd>
      </dl>
      <p className="app-next-message">
        This page does not open real admin data, change roles, change workspaces,
        or perform Firebase writes.
      </p>
    </section>
  );
}
