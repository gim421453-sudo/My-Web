# app-next Auth Default Test Checklist

Use `127.0.0.1` only. Do not use `localhost` for browser verification.

## Primary URL

```text
http://127.0.0.1:5173/app-next.html
```

Expected:

- No query string is required.
- Login screen appears when signed out.
- Account state appears when already signed in.
- Google login button is visible by default.
- Email/password is behind the advanced option.
- No automatic redirect to the operational static app.

## Rollback URL

```text
http://127.0.0.1:5173/app-next.html?appNextAuth=off
```

Expected in development:

- Disabled 안내 appears.
- New auth UI does not mount.
- No redirect occurs.

Expected in production:

- Query override is ignored.

## State Checks

- `loading`: waiting screen, no redirect
- `signed_out`: login screen
- `active`: account tabs render
- `active + workspace null`: valid account state
- `system_owner`: global role shown, not treated as workspace role
- `pending`: approval waiting 안내
- `rejected`: rejected 안내
- `disabled`: disabled 안내
- `quota_exceeded`: safe quota 안내
- `error`: safe error 안내, no automatic sign-out

## Diagnostics

Confirm development diagnostics:

- `entry = app-next`
- `provider = new`
- `auth mode = new-default`
- `legacy AuthContext mounted = false`
- `listener count = 1`
- `session write count = 0`
- `bootstrap attempt count = 0`
- `resource exhausted = false`
- build marker is visible

## Regression

- Operational `http://127.0.0.1:5173/` still opens the static app.
- `index.html + app.js?v=111` behavior is unchanged.
- No Firestore write is caused by simply opening app-next.
- No operational bootstrap is triggered by app-next.
- No automatic sign-out happens on session read errors.
