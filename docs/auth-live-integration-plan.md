# Auth Live Integration Plan

Date: 2026-07-22

## Current Baseline

- Operational app: `index.html + app.js?v=111`
- React production router: none
- React guard production consumers: 0
- React login production consumers: 0
- New AuthProvider verified only through development previews and direct read-only pages
- Timetable V111 must remain untouched

## Integration Strategy Options

### A. Keep Static App + Connect One Separate React Auth Page

Add one explicit link or direct standalone page for a read-only React auth screen.

Advantages:

- Smallest blast radius
- Does not touch the static dashboard, timetable, or write-heavy features
- Easy rollback by hiding/removing the link or using feature flag off
- Matches the already tested standalone page pattern

Risks:

- Does not yet prove full React routing
- Users may see two UI systems during transition

Required work:

- Choose one read-only page
- Ensure it is copied or served in the intended deployment
- Add a controlled entry link only if desired
- Keep feature flag off by default until browser validation passes

Rollback:

- Remove/hide the link
- Use query `?newAuth...=off`
- Set env flag false

Timetable V111 impact:

- None

### B. Gradually Move Static App Screens Into React Routes

Start moving individual operational screens from `app.js` into React routes.

Advantages:

- Long-term architectural direction
- Can eventually remove large static app complexity

Risks:

- High chance of breaking existing workflows
- Requires route tree, shared layout, data service compatibility, and write-path parity
- Time-sensitive features like timetable could regress

Required work:

- Build React app shell
- Map static navigation to React routes
- Port data access one screen at a time
- Add migration tests per screen

Rollback:

- Keep static app as default
- Do not remove old `app.js` surface until parity is proven

Timetable V111 impact:

- Medium to high if timetable is selected too early

### C. Run React App Beside Static App Under `/next` or `/app-next`

Create a parallel React app entry and route tree under a separate path.

Advantages:

- Clear separation between current production app and new React app
- Allows real router testing without hijacking `/`
- Safer than in-place replacement

Risks:

- Requires hosting configuration and deployment copy rules
- Needs session-origin consistency
- Users may need explicit navigation between two surfaces

Required work:

- Add a React app shell entry such as `app-next.html`
- Add internal React routes
- Expose only read-only screens first
- Keep static `/` as default

Rollback:

- Stop linking to `/app-next`
- Leave static `/` untouched

Timetable V111 impact:

- None if timetable is excluded

### D. Keep React Transition Code; Refactor Static App Auth First

Do not create React production routes yet. Stabilize `app.js` auth/session behavior separately.

Advantages:

- Directly improves the current production app
- Avoids two UI systems

Risks:

- `app.js` is large and already sensitive
- Can interfere with timetable and workspace sync if done broadly
- Does not advance React route migration immediately

Required work:

- Audit static auth service calls
- Refactor compat auth flow behind a service boundary
- Add static-app-only regression tests

Rollback:

- Keep changes behind static feature flags
- Preserve old login branch until verified

Timetable V111 impact:

- Medium if `app.js` is touched near shared bootstrap code

## Recommendation

Recommended path: **C, with A-style first screen discipline**.

Create a separate React route surface under an isolated entry such as `/app-next` or `app-next.html`, but initially expose only one read-only page. This proves real React routing without disturbing the static operational app.

## First Real Connection Candidate

Best first candidate: **Verify Email / Account Status read-only page**.

Reason:

- Already implemented as a standalone React page
- Uses new `AuthProvider`
- Read-only
- No Firestore write
- Handles `currentWorkspaceId = null`
- Handles `system_owner`
- Smaller privacy surface than notification/device lists

Secondary candidates:

1. Login devices read-only
2. Notifications read-only
3. Owner/admin diagnostics, development-only

Excluded from first connection:

- timetable
- user management
- role changes
- workspace management
- approval handling
- any Firestore write screen

## Proposed Transition Sequence

1. Add a separate React app-next entry with one read-only route.
   - Test: direct load, refresh, signed-out, active, pending, rejected, disabled, system_owner.
   - Rollback: remove link or route entry.
   - Entry condition: current direct read-only page remains stable.
   - Stop condition: any automatic logout or permission-denied loop.

2. Compare legacy/new session output.
   - Test: same account in static app and app-next.
   - Rollback: keep app-next hidden.

3. Test normal user, manager, and system_owner.
   - Test: each role can open only the read-only route.
   - Rollback: keep route hidden.

4. Test network and permission errors.
   - Test: no forced signOut, safe error UI.
   - Rollback: feature flag off.

5. Verify rollback.
   - Test: query/env off restores legacy or hides new route.

6. Default the limited read-only route to the new branch.
   - Test: route still read-only.
   - Stop condition: auth loop, signOut, wrong workspace exposure.

7. Expand to another read-only route.
   - Candidate: LoginDevices, then Notifications.

8. Connect React `LoginPage` to a real route only after app-next route guard behavior is stable.
   - Test: login success, pending/rejected/disabled, remember login.

9. Plan existing `AuthContext` removal only after all consumers are migrated.

## Rollback Plan

- Static app remains `/`.
- React app-next stays optional.
- Feature flags default off.
- If a route fails, hide the link or disable the flag.
- Do not delete legacy AuthContext until production consumers are zero and app-next is stable.

## Next Step Recommendation

Do not connect `LoginPage` next. First create a single isolated React route shell for `VerifyEmail` or account status under a non-root entry, then verify real browser behavior at `http://127.0.0.1:5173`.
