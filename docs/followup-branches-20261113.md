# Independent follow-up branches — 2026-11-13

All five branches start from `origin/main` at `1874119fa5c7a871840df6a18c071455935f1788`. They are independent review units, not a cumulative stack. At initial follow-up completion, no merge, push, deployment, environment reapplication or publication had been performed. Evidence files/screenshots and ignored local toolchains remain in this cloud workspace. Do not assume these local commits or artifacts are on GitHub or included in the previously published snapshot.

| Item | Branch | Commit / evidence | Outcome |
| --- | --- | --- | --- |
| 2 dependency audit | codex/dependency-audit-20261113 | c7c5a6d; docs/dependency-audit-20261113.md | Audit complete; vulnerabilities remain, no forced remediation |
| 3 backend/Rules | codex/backend-rules-validation-20261113 | 1e5aeb0; docs/backend-validation-20261113.md | 557 Functions unit, 171 Rules, 9 teacher-scope tests and 11 integration flows PASS |
| 4 UI/print/offline | codex/ui-print-offline-20261113 | 4e52ed6; docs/testing/ui-print-offline-20261113.md | Focused local checks PASS; parity/print observations and manual checks remain |
| 5 timetable concurrency review | codex/timetable-concurrency-review-20261113 | a3f6773; docs/timetable-cell-uniqueness-contract.md | Race reproduced; 10 row tests and npm test PASS; server contract proposed, not activated |
| 6 school-scope design | codex/school-scope-design-20261113 | Current branch HEAD; docs/school-write-scope-followup-design.md | Design + boundary guards; Node 22 build and 63 policy tests PASS; no write permission expansion |

Each branch updates AGENTS.md and CURRENT_HANDOFF.md. Integrating multiple branches will require combining their new dated handoff sections; preserve all independent results rather than taking one side of the documentation conflict.

Next implementation candidates: vendor-supported dependency remediation; mixed legacy schedule display/export compatibility; mobile sidebar interaction; dedicated App Next print layout; trusted timetable occupancy protocol and coordinated all-writer cutover; narrow assignment-scoped backend operation. Actual production-data comparison, hours offline and physical printing remain unverified. School manager delegation and timetable-specific scope semantics remain design decisions before implementation. IAM and production rollout remain HOLD.

## Integrated verification

`codex/full-validation-20261113` merges all five branches and includes the manifest cache correction `0476483`. See `docs/full-validation-20261113.md` for the complete rerun: Browser 20/20, Functions unit 559/559, active Rules 171/171, configured teacher scope 9/9, candidate Rules 30/30 and all 11 Functions integration flows PASS, plus root regressions, release gates, typecheck and both builds. The earlier per-branch partial-run statements remain historical evidence. Main and production remain unchanged.
