# First React Screen Migration Plan

## Recommended Approach

Use app-next internal tab.

```text
app-next.html
AuthProvider
LegacyAuthAdapterProvider
AppNext
Tabs:
  - Account status
  - Login devices
  - Notifications
  - Workspace notices read-only
```

React Router is not required for this step. Keep the existing state-based app-next tabs.

## Implementation Boundaries

Keep the operational static app fully intact:

- Do not change `index.html`.
- Do not change `app.js`.
- Do not change operational menus.
- Do not change `services/workspaceDataService.js`.
- Do not change Firestore Rules or indexes.
- Do not migrate or rewrite data.

The app-next screen is a read-only duplicate for comparison.

## Proposed Files for Next Implementation Step

Possible new files:

- `src/app-next/AppNextWorkspaceNotices.tsx`
- `src/app-next/appNextWorkspaceNoticesService.ts`
- `src/app-next/appNextWorkspaceNoticesUtils.ts`

Possible touched files:

- `src/app-next/AppNext.tsx`
- `scripts/test-auth-modules.mjs`
- docs/checklist files

## Read Strategy

Use one bounded read when the tab opens:

```text
getDocs(query(collection(db, "workspaces", workspaceId, "notices"), limit(50)))
```

Prefer no realtime listener for the first migration. This avoids listener leaks and makes Firestore read behavior easier to compare.

## Permissions

Use only AppSession values:

- `phase`
- `status`
- `isSystemOwner`
- `globalRole`
- `currentWorkspaceId`
- `currentWorkspaceRole`

Do not read legacy global users, legacy role fields, localStorage role, or `window.currentUser`.

## Error Handling

- `permission-denied`: show safe permission 안내 and include masked diagnostic.
- `resource-exhausted`: show quota 안내, no retry loop.
- network errors: show retry button, do not sign out.
- empty result: show empty state.

## Rollback

Rollback is immediate:

- hide or remove only the app-next notices tab
- keep `/app-next.html?appNextAuth=off` for development app-next rollback
- operational `notices` screen remains available in the static app

## Acceptance Criteria

- app-next opens at `http://127.0.0.1:5173/app-next.html`.
- Notice tab appears only in app-next.
- Signed-out users do not read Firestore.
- Pending/rejected/disabled users do not read Firestore.
- Active workspace users read only `workspaces/{currentWorkspaceId}/notices`.
- Workspace null users see a no-workspace 안내.
- No Firestore write APIs are imported.
- `session write count = 0`.
- `bootstrap attempt count = 0`.
- Operational notices screen still works unchanged.

## Risks

- Some existing notice rows may use `date` instead of `notice_date`; normalizer should support both.
- Ordering by `notice_date` might not match older rows with missing date. Use bounded local sort fallback if needed.
- System notice rows stored inside workspace notices may need separate label display, but the first version should not query top-level `systemNotices`.
- If Firestore Rules require membership and the AppSession has workspace ID but missing membership, the read should fail safely without logout.
