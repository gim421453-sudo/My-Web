# App Next parity hardening — Cloud to PC handoff

Date: 2026-11-13 (Asia/Seoul). Branch: `codex/feat-app-next-parity-hardening`.
Base: `cda1f1de2d18b835a4aa8dd92afba9271f28e3b2`, freshly fetched and verified before work. Main is not a development target. Original PC cancellation/diagnostic and integration records remain historical records; the latest user explicitly authorizes this Cloud feature branch and its push.

## Completed implementation

- TASK A: closed legacy mobile sidebar is invisible and noninteractive, including keyboard inertness; menu expanded state/label follows the actual drawer state. Escape closes it and returns focus to the menu toggle. Desktop behavior is retained. Tests exercise mobile opening, closing, focus return and overflow.
- TASK B: notices, schedules and timetable have a current-list print action and dedicated tabular print snapshots. Only data already loaded/authorized by the route is used. No additional Firestore read is made for printing. Schedules honor current list filters; timetable uses the current normalized visible cells. Print CSS removes the interactive shell, editors and diagnostics, repeats table headers and wraps long text. Portals are mounted only in print mode; beforeprint flushes the snapshot synchronously. This avoids duplicate hidden text in normal UI and removes portals on route unmount.
- TASK C: legacy schedule table and downloaded report project name/startAt/description aliases to display values without modifying stored documents, IDs or unknown fields. Canonical nonblank fields retain precedence. ISO timestamps use the browser's local date/time, matching the App Next local display convention. A pure regression checks immutability, canonical precedence, timezone conversion and invalid timestamps; Browser tests verify the mixed title and report text and confirm no title was persisted to the source document.
- TASK D: App Next schedule route requests a fresh server list automatically on browser online events, using existing workspace/session guards and force-refresh sequencing. Listeners are cleaned up on unmount/context change. No write retry/queue, permission relaxation or optimistic success was introduced. Both existing 60-second manual-refresh and new automatic-reconnect cases are retained.
- TASK E: all four dependency scopes re-audited and a remediation sequence recorded below. No dependency declaration, lockfile, Rules or Functions runtime change was made.

Legacy app.js cache key is now 165. Existing fixed-version regression assertions were advanced from 164 to 165 without deleting assertions or weakening permission/isolation expectations. The first full Browser attempt exposed duplicate hidden print text (11 failures). The implementation was corrected to mount print snapshots only during printing; the original failing login locator was not relaxed.

## Incomplete / next implementation

- A: actual phone/tablet orientation, touch outside-click and full focus-containment/manual assistive-technology QA.
- B: physical printer/page-break QA, long notice bodies, very large timetables and cross-browser beforeprint/afterprint behavior. The first print layout is a simple current-list report, not a configurable export engine.
- C: full legacy/Mixed filter-option, date-range, sorting and edit parity across all aliases/resources remains incomplete. This patch does not migrate data or change editor write schemas. Non-string timestamp shapes need explicit contracts before adding support to the legacy projection.
- D: automatic reconnect for notices and timetable is not added. Hours offline, auth expiry, cross-workspace switching during reconnect and repeated flapping still need dedicated tests. Offline writes and legacy concurrency invariants remain unchanged.
- E: vulnerabilities remain. Do not interpret successful audit execution as a vulnerability-free result.

## Dependency findings and plan

Fresh npm audit findings: root 55 (20 high), production-only 14 (5 high), Functions 16 (3 high), Rules tooling 49 (20 high). Registry results can differ from the dated PC records without a lockfile change. Machine-local JSON evidence: `/workspace/.myweb/parity-evidence/`.

Prioritize supported Firebase Functions HTTP dependency releases (express/body-parser/qs) separately from Firebase SDK transitive grpc/re2js paths. Trace browser-bundle reachability versus Node/admin/tooling exposure; an installed package is not by itself an exploitability conclusion. Evaluate vendor-supported candidates in a separate dependency branch, compare lock/audit deltas, then run Node 22 Functions, Rules, root/build and Browser suites. Do not use force fixes, unsupported overrides or major downgrades. No actual upgrade is claimed here.

## Validation

Validated implementation commit: `148ea67f62e3cc8c4133fdc212acbd3294d46047`. The following documentation-only commit is included in the same branch; resolve its final delivery HEAD with `git rev-parse HEAD` / `git ls-remote origin refs/heads/codex/feat-app-next-parity-hardening` rather than embedding a self-referential SHA.

| Check | Actual final result |
| --- | --- |
| npm test | PASS, 669 auth module cases plus the other root script checks |
| npm run typecheck | PASS; both actual build lifecycles also run tsc |
| npm run build / build:admin | PASS including demo config generation and postbuild |
| Release gates | PASS 33/33 and manifest 18/18 |
| Functions Node 22 build/unit | PASS 559/559 |
| Functions integration | PASS all 11 sequential flows; complete backend wrapper exit 0 |
| Active Rules / configured teacher scope / candidate Rules | PASS 171/171, 9/9, 30/30 |
| Full Browser E2E | PASS 23/23, fail/cancel/skip/todo 0; 205.6 seconds |
| Mixed schedule pure projection | PASS; immutable/canonical/timezone/invalid timestamp assertions |
| Timetable row / management and login copy | PASS 10/10, 6/6 and login regression |
| Syntax / whitespace / added-content secret patterns | PASS; not an assertion about all historical secrets |

All requested automatic areas were run; none was recorded as PASS without execution. Initial print-DOM Browser failure was diagnosed and fixed in production code; no existing test was deleted or skipped. New assertions strengthen mixed parity, mobile keyboard behavior, print isolation and reconnect behavior. Cache pin updates preserve their existing assertions. The fixes were retested by the full suite.
 Root/browser tools and Node 22 Functions with Java 21 use demo projects and loopback emulators only. Builds use the repository's actual npm build and build:admin lifecycle with demo VITE variables. Generated config, dist outputs, logs and screenshots remain ignored/local. No PC filesystem, PC backup or PC Firebase configuration was accessed.

## PC continuation

Inspect `git status` and preserve local changes before switching. Fetch the branch, then switch to an existing local branch or create its tracking branch if absent. Pull with `--ff-only`; do not reset/clean or overwrite local user files. Reinstall only if needed with npm ci, select Node 22 for Functions and Java 21, use demo settings, and rerun all recorded commands before any separate main/deploy proposal.

Keep period-delete-blocked, all original branches, ignored personal files and IAM HOLD. Do not enable period deletion or school scoped writes without their separate server contracts. Nothing in this branch authorizes main push, operational data access, Firebase deployment or environment publication.

## Changed tracked files

- `app.js`
- `index.html`
- `scripts/test-app-target-isolation.mjs`
- `scripts/test-auth-modules.mjs`
- `scripts/test-owner-preview-pre-deploy-final-gate.mjs`
- `scripts/test-parity-schedule-display.mjs`
- `scripts/test-role-workspace-release-gate.mjs`
- `scripts/test-timetable-quick-view.mjs`
- `src/app-next/AppNextPrintReport.tsx`
- `src/app-next/AppNextSchedulesReadOnly.tsx`
- `src/app-next/AppNextTimetableReadOnly.tsx`
- `src/app-next/AppNextWorkspaceNotices.tsx`
- `src/app-next/styles.css`
- `styles.css`
- `tests/browser/recovery-ui.e2e.test.mjs`
- Documentation: `README.md`, `CHANGELOG.md`, `AGENTS.md`, `docs/handoff/CURRENT_HANDOFF.md`, this handoff.

## Recheck on PC

After preserving local work: `git fetch origin`, then switch to this branch (or `git switch --track origin/codex/feat-app-next-parity-hardening` if absent), followed by `git pull --ff-only origin codex/feat-app-next-parity-hardening`. Verify the expected remote HEAD reported by Cloud. Never overwrite ignored PC handoff/config files.

Rerun npm test, typecheck, actual demo build/build:admin, the two release gate scripts, the pure projection test, Node 22 Functions/Rules tests and npm run test:recovery:browser. The Linux backend wrapper was executed here; Windows setup/PowerShell instructions remain in docs/trusted-backend-development.md. Configure only demo values and writable local cache/config paths, select the correct Playwright browser and Java 21. Test real print preview/afterprint, touch sidebar behavior and local time conversion before any separate main merge.
