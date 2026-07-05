# Integration-ready architecture

This app is not connected to another site yet. The current goal is to keep the local app stable while preparing a safe migration path.

## Boundaries

- `shared/`
  - Reusable role definitions, permission helpers, common type contracts, and safe navigation helpers.
  - This folder can be copied to another site or replaced by a shared package later.
- `services/dataService.js`
  - Owns workspace-scoped app data access.
  - Current adapter: `localStorage`.
  - Future adapter target: Supabase, Firebase, or a custom API.
- `services/authService.js`
  - Owns auth state access separately from app data.
  - Current adapter: local invite-only auth.
  - Future adapter target: shared auth provider or backend session API.
- `app.js`
  - Keeps existing UI and workflows.
  - Calls service functions for primary store/auth persistence.

## Workspace model

Every main app store receives:

- `workspace_id`
- `schema_version`
- `integration.mode`
- `integration.auth_provider`
- `integration.data_provider`

The default local workspace is `personal-local`. Later, each school, team, or user space can receive a distinct `workspace_id`.

## Security notes

- Do not put `user_id`, `email`, `token`, invite tokens, or other private values in cross-site URLs.
- Use `PMShared.navigation.openExternalSite(url)` for future site buttons.
- Connect sites later through a backend session, Supabase/Firebase auth, or a short-lived server-issued exchange code after security review.

## Migration path

1. Keep the current local adapter active.
2. Add a cloud adapter behind the same `PMDataService` and `PMAuthService` methods.
3. Run migration by `workspace_id`.
4. Verify role checks on both frontend and backend/API rules.
5. Only then enable cross-site account sharing.
