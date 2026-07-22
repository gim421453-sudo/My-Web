# RequireAuth Parallel Rollback

## Immediate Rollback

Set:

```text
VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH=false
```

or use:

```text
?newAuthRequireAuth=off
```

This returns `RequireAuth` to the existing legacy branch without removing code.

## Why Rollback Is Safe

The default value is false.

When false:

- `RequireAuth` uses existing `src/context/AuthContext`.
- Existing loading text is preserved.
- Existing `/login` redirect is preserved.
- Existing children rendering is preserved.

The new branch is isolated in:

- `src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx`
- `src/auth/legacy/guards/requireAuthBridgeUtils.ts`
- `src/dev-require-auth-bridge/*`

## Do Not Roll Back By

Do not use destructive commands such as:

```text
git reset --hard
git clean
```

There are many unrelated existing changes in the working tree.

## If New Mode Misbehaves

1. Add `?newAuthRequireAuth=off` to the URL.
2. Confirm the legacy branch is active in the preview.
3. Keep browser auth state; do not delete local/session storage.
4. Record the decision reason and console error.
5. Continue from the legacy branch while investigating.

## Next Safe Action

If rollback succeeds and legacy behavior is stable, keep the new branch disabled and inspect:

- session phase
- adapter status
- decision reason
- redirect destination
- whether account status is pending/rejected/disabled
