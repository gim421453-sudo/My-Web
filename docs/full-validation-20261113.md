# Integrated validation — 2026-11-13

Integration branch: `codex/full-validation-20261113`, based on `origin/main` at `1874119`. All five follow-up branches were merged for joint validation. Only AGENTS.md and CURRENT_HANDOFF.md conflicted; their dated independent results were preserved together. Main was not changed.

## Correction found by the expanded checks

The release manifest regression initially failed: index.html loaded `?v=1`, while app-next.html loaded `?v=4`. This mismatch also existed on origin/main. Updated the operational entry to v4 and changed the regression to require exactly one same-origin manifest script in each entry, a valid version parameter and equality of the two resolved URLs. It does not bypass the assertion or change feature permission policy. Source correction: `0476483`.

## Validation scope

Standard application and local Firebase development workflow, including all added follow-up tests. No production Firebase requests, deployments, IAM changes, destructive administrative scripts, environment publication or live authority-audit tools were executed. Bundles were built with lifecycle scripts disabled to avoid replacing runtime configuration; these are compilation checks, not deployment artifacts.

Root/browser: Node 24.22.1, TZ=Asia/Seoul. Functions/backend: Node 22.23.5. Java 21.0.13. Local Auth/Firestore/Functions emulators, explicitly named demo projects, isolated CLI state and no ADC in backend validation.

## Confirmed results

- Root npm test PASS, including 669 auth module tests.
- Login-copy regression PASS.
- Role/workspace release gate PASS 33/33.
- Owner-preview release manifest regression PASS 18/18 after the cache correction.
- TypeScript check, main build and admin build PASS after the source correction.
- Functions build/unit PASS 559/559; active Rules supplemental suite PASS 171/171; configured teacher-scope tests PASS 9/9.
- Complete `bash scripts/validate-backend-local.sh` PASS, exit 0; this time the whole wrapper ran, including all 11 sequential Functions integration scripts.
- Candidate `firestore.rules.next` Auth/workspace suites PASS 30/30. Together with configured scope tests this is 39 tests, kept distinct from the 171 active Rules supplemental tests.
- Full Browser suite PASS 20/20 in one run, including both follow-up cases and the runtime-error check; fail/cancel/skip/todo 0; duration 181.5 seconds. Emulator shutdown completed normally.
- Fresh legacy/App Next PDF text extraction confirmed the canonical title in both and the mixed title in App Next.
- git diff --check PASS. No lint script exists in the root manifest.

All required automatic checks for this integration passed after the cache correction. This is READY_WITH_WARNINGS, not an assertion that the existing vulnerabilities or documented functional limitations have been fixed.

## Remaining known limitations

Fresh lockfile audits still report root 55 findings (20 high), production-only 14 (5 high), Functions 16 (3 high), Rules tooling 49 (20 high). Audit completion is not a vulnerability-free result; no dependencies changed.

The legacy arbitrary-ID timetable race remains deliberately reproduced by its characterization test. Mixed legacy schedule display/export parity, mobile sidebar interaction and App Next print layout remain documented follow-ups. School write scope changes are design/negative tests only. No new school write endpoint or global timetable uniqueness guarantee was activated. Physical printing, actual production data and hours offline remain unverified. These limits are distinct from regressions introduced by this change.

## Publication preparation

The original atomic push was rejected by GitHub GH007 (private author email), not by tests or an automatic approval reviewer. Originals were retained. Privacy-safe publication branches use new commits with verified identical content trees; source tests do not need to be rerun for author/parent metadata or documentation-only updates. See the branch index for exact mapping. No force push or rewriting of existing branch history was used. Main, environment publication and production remain untouched.
