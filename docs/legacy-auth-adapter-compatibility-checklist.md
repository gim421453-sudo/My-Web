# LegacyAuthAdapter Compatibility Checklist

## Automated Checks

Run:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- Typecheck succeeds.
- Auth module tests pass.
- Build succeeds.

## Preview URLs

Use only `127.0.0.1`.

- On: `http://127.0.0.1:5173/legacy-auth-adapter-preview.html?adapter=on`
- Off: `http://127.0.0.1:5173/legacy-auth-adapter-preview.html?adapter=off`

Do not use `localhost` because it is a different browser origin.

## Browser Checklist

1. Open the `adapter=off` URL.
2. Confirm the preview is blocked and no adapter state is shown.
3. Open the `adapter=on` URL.
4. Confirm the page shows `신규 Provider 원본 값`.
5. Confirm the page shows `기존 호환 변환 값`.
6. Confirm full UID is not visible.
7. Confirm full email is not visible.
8. Confirm full workspaceId is not visible.
9. Confirm `phase` is visible.
10. Confirm `loading` is visible.
11. Confirm `isAuthenticated` is visible.
12. Confirm `status` is visible.
13. Confirm `globalRole` is visible.
14. Confirm `isSystemOwner` is visible.
15. Confirm `currentWorkspaceId` is masked or shown as `-`.
16. Confirm `currentWorkspaceRole` is visible.
17. Confirm adapter `currentRole` equals new `currentWorkspaceRole`.
18. Confirm `system_owner` is not shown as adapter `currentRole` unless the new workspace role itself is valid.
19. Confirm `currentWorkspaceId = null` displays as a normal state, not signed out.
20. Confirm pending/rejected/disabled states, if tested, preserve `status`.
21. Confirm error text is user-safe and does not expose Firebase/internal paths.
22. Confirm no login button exists.
23. Confirm no logout button exists.
24. Confirm `reloadSession 확인` works.
25. If reload fails, confirm the page says automatic logout is not performed.
26. Confirm browser console has no red runtime errors.
27. Confirm no Firestore write request is made by this preview.
28. Confirm existing operating app still opens separately.

## Required Source Invariants

- `src/context/AuthContext.tsx` is unchanged.
- Existing `Login.tsx` still imports the legacy AuthContext.
- Existing `ProtectedRoute.tsx` still imports the legacy AuthContext.
- Existing `RequireAuth.tsx` still imports the legacy AuthContext.
- Existing `RequireWorkspaceRole.tsx` still imports the legacy AuthContext.
- Existing guards are not replaced with the new `RouteGuard`.
- No Rules files are changed.
- No root `services/*` files are changed.
- No production static app files are changed.

## Failure Conditions

Stop the migration if any of these occur:

- Owner account becomes signed out because of adapter state.
- `currentWorkspaceId = null` becomes `signed_out`.
- Pending/rejected/disabled users are automatically signed out.
- `system_owner` is written or treated as a workspace role.
- Two auth listeners are required for one React tree.
- Any adapter file imports Firestore write APIs.
- Any adapter file deletes localStorage or sessionStorage.
- Preview exposes full UID, full email, token, or full workspaceId.

## Next Step Gate

Proceed to the next phase only after:

- The preview page works with a real signed-in owner account.
- Adapter and new provider values match expected mappings.
- `reloadSession` failure does not sign out.
- `npm.cmd test` remains green.

