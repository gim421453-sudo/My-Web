# Notifications New Auth Test Checklist

Use only `127.0.0.1` for browser checks.

## URLs

- New provider on: `http://127.0.0.1:5173/notifications.html?newAuthNotifications=on`
- Forced fallback: `http://127.0.0.1:5173/notifications.html?newAuthNotifications=off`

## Automated Checks

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`

## Browser Checks

1. Open `http://127.0.0.1:5173/notifications.html?newAuthNotifications=off`.
2. Confirm the legacy fallback does not mount the new read-only UI.
3. Open `http://127.0.0.1:5173/notifications.html?newAuthNotifications=on`.
4. If signed out, confirm the page shows `로그인이 필요합니다.` and does not redirect.
5. Sign in through the existing operating app if needed, then return to the new-auth URL.
6. Confirm the page shows the current auth phase and account status.
7. Confirm `currentWorkspaceId == null` shows the workspace guidance message and does not log out.
8. Confirm active workspace users see only their own/current workspace notifications.
9. Confirm the list shows title, summary, type, time, read state, and service only.
10. Confirm full UID, full workspaceId, full email, invite code, token, raw relatedId, and internal document paths are not visible.
11. Click `알림 목록 새로고침`; confirm no duplicate click behavior while loading.
12. Click `계정 상태 다시 확인`; confirm failure does not log out.
13. Confirm there is no read/mark-read button.
14. Confirm there is no delete button.
15. Confirm there is no notification settings save button.
16. Confirm browser console has no red runtime errors.
17. Confirm Network has no Firestore write requests from this page.

## Expected Auth States

- `initializing`: authentication loading message only.
- `signed_out`: login-required message only.
- `loading_session`: account-loading message only.
- `authenticated`: read-only notification view if active and workspace is selected.
- `account_action_required`: account status guidance only.
- `error`: session error guidance and retry button; no auto logout.

## Security Notes

- Firestore reads must be limited to `uid == session.uid`.
- Workspace reads must be limited to `workspaceId == session.currentWorkspaceId`.
- `system_owner` must not trigger all-notification queries.
- Local fallback must be filtered by the same uid/workspaceId.

## Rollback Check

Use `http://127.0.0.1:5173/notifications.html?newAuthNotifications=off`.

The production `index.html + app.js` flow is not connected to this page.

