# RequireAuth Parallel Test Checklist

Use only `127.0.0.1` for browser checks.

## Automated

Run:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- TypeScript succeeds.
- Auth module tests pass.
- Build succeeds.

## Preview URLs

Open:

```text
http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=on
http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=off
```

Expected:

- Both return HTTP 200.
- `on` shows current mode `new`.
- `off` shows current mode `legacy`.
- `children 렌더링` matches the current account state.
- `redirect 발생` remains `false` in preview mode.
- `자동 signOut 발생` remains `false`.

## Browser Manual Checks

1. Sign in through the existing operational app if needed.
2. Open `http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=on`.
3. Confirm status, role, system owner flag, and workspace existence are shown without full UID/email.
4. Confirm active account renders the protected child card.
5. Confirm `currentWorkspaceId` missing does not block `RequireAuth`.
6. Open `http://127.0.0.1:5173/require-auth-bridge-preview.html?newAuthRequireAuth=off`.
7. Confirm legacy mode still works.
8. Check browser console for red errors.
9. Check Network for Firestore writes from the preview.
10. Confirm no automatic logout occurred.

## Redirect Loop Cases

The pure helper must block:

- `/login` to `/login`
- `/pending` to `/pending`
- `/rejected` to `/rejected`
- `/disabled` to `/disabled`
- loading to any destination

## Safety Checklist

- [ ] `ProtectedRoute` not converted
- [ ] `RequireWorkspaceRole` not converted
- [ ] `Login.tsx` not converted
- [ ] existing `AuthContext` not changed
- [ ] `index.html` not changed for this feature
- [ ] `app.js` not changed for this feature
- [ ] Rules not changed
- [ ] no Firebase data writes
- [ ] no automatic signOut in new branch

## Pass Criteria

Move forward only if:

- `newAuthRequireAuth=off` preserves existing behavior.
- `newAuthRequireAuth=on` shows expected decisions.
- No redirect loop is observed.
- Existing operating login remains stable.
