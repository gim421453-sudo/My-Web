# Legacy Auth Guard Test Checklist

Use only `127.0.0.1` for browser checks.

## Automated Checks

Run:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected:

- TypeScript succeeds.
- Auth module tests include loading/auth/status/workspace/system-owner/safety cases.
- Build succeeds.

## Preview URLs

- Enabled: `http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=on`
- Disabled: `http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=off`

Expected:

- `guard=on` shows raw AuthProvider state, adapter state, RequireAuth decision, WorkspaceRole decision, expected destination, safety status.
- `guard=off` shows disabled preview message.
- No automatic redirect occurs.
- No login/logout buttons are present.
- No Firestore write occurs.
- No automatic signOut occurs.

## Manual Browser Checklist

1. Open `http://127.0.0.1:5173/legacy-auth-guard-preview.html?guard=on`.
2. Confirm masked UID/email are shown, not full sensitive values.
3. Confirm RequireAuth decision appears.
4. Confirm RequireWorkspaceRole decision appears.
5. Toggle allowed workspace roles and confirm only decision output changes.
6. Toggle `워크스페이스 필수`.
7. Toggle `system_owner 명시 우회 허용`.
8. Confirm URL does not change after toggles.
9. Confirm console has no red errors.
10. Confirm Network has no Firestore write request from this preview.

## Safety Checklist

- `index.html` unchanged.
- `app.js` unchanged.
- Root `services/*` unchanged.
- `firestore.rules` unchanged.
- `firestore.rules.next` unchanged.
- Existing `src/context/AuthContext.tsx` unchanged.
- Existing `src/pages/Login.tsx` unchanged.
- Existing Guard files unchanged.

## Next Step Gate

Move forward only if:

- Existing operating login still behaves exactly as before.
- Preview on/off works.
- Guard decisions match the current signed-in account state.
- `hasCriticalMismatch` remains false in existing Shadow checks.
