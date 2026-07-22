# app-next Auth Rollback

## Immediate Development Rollback

Open:

```text
http://127.0.0.1:5173/app-next.html?appNextAuth=off
```

This disables the app-next new auth test surface in development and shows a disabled 안내 only.

## Environment Rollback

Set:

```text
VITE_ENABLE_APP_NEXT_AUTH=false
```

Then restart the Vite dev server.

## Scope

Rollback affects only `app-next.html`.

It does not change:

- operational `index.html`
- `app.js`
- Firebase Auth users
- Firestore data
- Firestore Rules
- workspace memberships

## Recovery

To re-enable app-next, remove the rollback query or set:

```text
VITE_ENABLE_APP_NEXT_AUTH=true
```

Default behavior with no env value is enabled.
