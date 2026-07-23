# app-next Timetable Read-Only Pilot

## Summary

`app-next.html#/timetable-readonly` is a read-only React pilot for comparing the new AuthProvider session with the existing operational timetable data. It does not replace the operational static app.

Browser URL:

```text
http://127.0.0.1:5173/app-next.html#/timetable-readonly
```

## Scope

- Entry: `app-next.html`
- Route: `#/timetable-readonly`
- Guard chain: `AuthProvider -> LegacyAuthAdapterProvider -> RequireAuth -> AppNextTimetableReadOnly`
- Data source: existing workspace-scoped Firestore collections
- Write policy: no Firestore write, no listener, no mutation, no cleanup

## Operational Source Map

The operational static app still uses `index.html + app.js?v=111`.

The app-next pilot reads the same canonical workspace child collections:

```text
workspaces/{workspaceId}/timetable
workspaces/{workspaceId}/timetableSets
workspaces/{workspaceId}/periodTimes
```

The service file is intentionally narrow:

```text
src/app-next/appNextTimetableReadonlyService.ts
```

It uses one-time `getDocs()` reads only. It does not import or call `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`, or `onSnapshot`.

## Route Policy

The route itself is authentication-protected but workspace-null safe.

- `signed_out`: handled by app-next login/status flow
- `pending`, `rejected`, `disabled`: account status screen, no timetable query
- `active + currentWorkspaceId`: reads timetable collections once
- `active + currentWorkspaceId = null`: route can render, but data read is blocked
- `system_owner`: treated as global role; `system_owner` is not used as a workspace role

## Display Model

The screen shows:

- Weekly timetable table
- Today's timetable summary
- Time rows from `periodTimes`
- `timetableSets` selection context
- Program/afterschool rows when recognizable from existing set metadata
- Duplicate-cell warning without modifying data

The pilot preserves existing data shape. If multiple rows exist for the same `setId + day + period`, every row remains visible and a warning is shown. The screen does not deduplicate, delete, migrate, or normalize Firestore data.

## Legacy Compatibility Notes

The operational timetable has two important read-time compatibility rules:

- `setId`, `timetableSetId`, and `scheduleSetId` are all treated as timetable-set connection fields.
- A timetable row without an explicit set id is included only when the active timetable set is the legacy `school` set. This matches the operational V102 helper behavior and is read-only; app-next does not write the inferred value back.

When no active set is supplied to app-next, the read-only adapter chooses the first non-program timetable set for the weekly table. This prevents a `방과후/특강/동아리` set returned first by Firestore from making the general weekly table look empty. Program rows remain in the separate program timetable section.

## Safety Rules

This pilot must not:

- Start a Firestore listener
- Write to Firestore
- Update localStorage/sessionStorage with timetable data
- Clean duplicate cells
- Repair orphan timetable rows
- Modify `app.js`, `index.html`, `services/workspaceDataService.js`, Firestore Rules, or V111 timetable code

## Diagnostics

Development diagnostics are exposed at:

```javascript
window.PMAppNextTimetableDiagnostics?.snapshot?.()
```

The snapshot reports counters and categories only:

- render/read/load/cache counts
- listener and write attempt counts, expected to stay `0`
- duplicate-cell group and item counts
- visible/empty/invalid cell counts
- route and role categories

It must not expose full UID, email, document ID, token, full Firestore path, or full workspaceId.

## Manual Comparison Checklist

Use `127.0.0.1`, not `localhost`.

1. Open `http://127.0.0.1:5173/` and confirm the operational timetable still works.
2. Open `http://127.0.0.1:5173/app-next.html#/timetable-readonly`.
3. Confirm the app-next page requires login through the new app-next auth flow.
4. Confirm active accounts with a workspace load the timetable once.
5. Confirm active accounts without a workspace see a safe empty state, not logout.
6. Compare weekday/period/subject/teacher/room with the operational timetable.
7. Confirm duplicate cells are shown with a warning instead of being removed.
8. Run `window.PMAppNextTimetableDiagnostics?.snapshot?.()` and verify write/listener counters are `0`.

## Rollback

The operational static app is unchanged. To stop using this pilot, do not open `#/timetable-readonly`; no production menu or operating route depends on it.
