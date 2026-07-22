# Auth Mismatch Risk Register

## Classification

| Severity | Examples |
| --- | --- |
| CRITICAL | login allow/deny mismatch, system owner mismatch, forced signOut, unexpected write |
| HIGH | status mismatch, workspace selection mismatch, workspace role mismatch |
| MEDIUM | warning mismatch, destination wording, error category |
| LOW | diagnostic label or development-only display difference |

## Current Risks

### Legacy membership fallback

- Severity: HIGH only if legacy and new paths disagree on effective workspace presence or role.
- Current handling: comparison tool now clears inaccessible workspace references consistently and records membership source plus warnings.
- Action: keep as a separate migration task. Do not auto-migrate in regression comparison.

### Missing or inaccessible current workspace

- Severity: resolved from HIGH mismatch to canonical warning when both paths agree.
- Current handling: missing workspace or missing membership becomes `currentWorkspaceIdPresent = false`, `currentWorkspaceRole = null`, with `CURRENT_WORKSPACE_NOT_ACCESSIBLE`.
- Action: keep actual Firestore cleanup as a later reviewed migration. Do not mutate `users.currentWorkspaceId` in this stage.

### Legacy status fields

- Severity: HIGH when `status`, `active`, and `disabled` disagree.
- Current handling: new normalization emits legacy/conflict warnings and avoids forced signOut.
- Action: data cleanup should be dry-run and reviewed separately.

### System owner legacy role fields

- Severity: MEDIUM unless owner recognition differs.
- Current handling: `systemOwners/{uid}` is treated as global authority; legacy `role/currentRole/workspaceRole` are warnings.
- Action: keep login working, normalize data in a later reviewed migration.

### Workspace null active users

- Severity: CRITICAL if any path logs the user out.
- Current handling: fixture tests assert active + workspace null remains authenticated.
- Action: workspace-required screens should guard separately.

### Permission and quota errors

- Severity: CRITICAL if they cause automatic signOut or write retries.
- Current handling: fixture tests assert safe error, no signOut, no write.
- Action: keep browser quota validation separate from this mock comparison stage.

## No-Change Boundary

This stage intentionally does not change:

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- timetable V111
- Firestore Rules
- real Firebase data
- role/status/workspace documents
- production auth defaults
