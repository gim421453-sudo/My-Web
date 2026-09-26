# Auth Security Authority Contract

## Authority Matrix

| State | Trusted authority | Explicitly untrusted |
| --- | --- | --- |
| Primary authentication | Firebase Auth `currentUser` existence | Firestore profile, browser storage |
| Email verification | Firebase Auth `currentUser.emailVerified` | `users/{uid}.emailVerified`, client payload |
| Global system owner | Active `systemOwners/{uid}` contract | `users.role`, `users.globalRole`, browser storage |
| Workspace role | Canonical `workspaces/{workspaceId}/members/{uid}` | legacy user role fields |
| Identity verification | Future trusted backend result | profile booleans and client payload |
| MFA enrollment/challenge | Future Firebase Auth MFA state or trusted backend | profile booleans and client payload |
| Recent reauthentication | Future server `auth_time` plus operation-bound nonce | `reauthenticated: true` client boolean |

The resolver never reads Firestore or browser storage and never writes data. Callers must first resolve the established system-owner and canonical-membership contracts.

## State Machine

`SIGNED_OUT` is derived only from the absence of a Firebase Auth user. Authenticated sessions then report profile, membership, email, identity, and MFA states independently. Profile permission errors remain `PROFILE_BLOCKED` without calling Firebase sign-out. Workspace readiness is independent from Firebase authentication and security readiness.

The supported gates are `SIGNED_OUT`, `EMAIL_UNVERIFIED`, `IDENTITY_REQUIRED`, `IDENTITY_PENDING`, `MFA_ENROLL_REQUIRED`, `MFA_CHALLENGE_REQUIRED`, `PROFILE_BLOCKED`, `MEMBERSHIP_PENDING`, `MEMBERSHIP_DISABLED`, `READY`, and `UNKNOWN_SECURITY_STATE`.

## Resolver Contract

Runtime source: `shared/authSecurityState.js`. React types and access: `src/auth/authSecurityState.ts`.

The resolver accepts already-read Firebase user, profile status, verified system-owner registry result, canonical membership result, policy, and future trusted security results. It returns normalized states, `firebaseAuthenticated`, `securityReady`, `workspaceReady`, gate, and diagnostics-safe authority labels. Profile fields such as `emailVerified`, `identityVerified`, `mfaVerified`, and `reauthenticated` are ignored for security authority.

## Current Policy

The default phase is `observe`; email, identity, and MFA policies also default to `observe`. Missing identity and MFA backends therefore produce `not_configured` and `securityReady=false`, while existing active users are not newly blocked. Existing disabled, profile permission, and membership protections remain in place. No system-owner exception is synthesized from user profile fields.

## Migration Phases

1. `observe`: collect safe state only.
2. `enroll_admins`: future trusted enrollment for administrators.
3. `enroll_staff`: extend trusted enrollment to staff.
4. `enroll_students`: extend trusted enrollment to students.
5. `enforce_all`: enforce only after backend evidence, recovery, and rollout checks exist.

Email policy can move separately from `observe` to `warn` and then `enforce`. No phase transition is part of this batch.

## Runtime Connections

- Main and admin load the shared resolver before `app.js`. Their canonical bootstrap records the resolved state after Firebase Auth, profile, system-owner registry, and membership resolution.
- Firestore profile listeners preserve Firebase Auth `emailVerified`; they cannot overwrite it.
- app-next imports the same resolver and exposes `firebaseAuthenticated`, `securityReady`, and `workspaceReady` separately through `AuthProvider`.
- The legacy `src/context/AuthContext.tsx` is not mounted by app-next. Its automatic sign-out-on-session-error behavior remains a documented legacy P0 risk and is not expanded in this batch.
- Local development password auth is host-limited to `localhost`/`127.0.0.1`, labeled `local-dev`, and cannot produce Firebase authentication, trusted identity/MFA, or system-owner authority in the resolver.

## Future Backend Integration

Trusted identity must arrive as a server-authenticated result. Trusted MFA must use Firebase Auth MFA state or an equivalent verified backend result. Recent reauthentication needs server-side `auth_time` validation bound to a one-time operation nonce. Until those integrations exist, the resolver must not report those controls as verified.

## Rules Impact

`firestore.rules` is unchanged. The current self-update allowlist for `users/{uid}` excludes `emailVerified`, identity, MFA, and reauthentication fields. User creation may retain legacy `emailVerified` metadata, but application security ignores it. Rules Emulator regression must remain 171/171.
