# Backend and Rules validation — 2026-11-13

Base: `1874119`; branch: `codex/backend-rules-validation-20261113`.

| Target | Result |
| --- | --- |
| Functions build + unit, Node 22.23.5 | PASS 557/557; fail/skip/cancel/todo 0 |
| Active firestore.rules supplemental suite | PASS 171/171 across 5 suites; fail/skip/cancel/todo 0 |
| Configured teacher-scope suite | PASS 9/9; fail/skip/cancel/todo 0 |
| Functions/Auth/Firestore integration | PASS all 11 sequential scripts, exit 0 |

Java 21.0.13, Node 22.23.5 official Linux archive verified against the official SHA-256 manifest. Dependencies installed with npm ci against unchanged lockfiles. Only explicitly named demo projects and loopback emulators were used. Functions cases report production access=0. This does not test deployed Functions or production credentials.

## Reproduction

1. Select Node 22 on PATH and Java 21. Install root, functions and tools/firestore-rules-tests dependencies with npm ci.
2. Preserve local settings and add `MYWEB_TRUSTED_BACKEND_MODE=emulator` to ignored `functions/.env.local` if absent. Never use production values.
3. If needed, set `FIREBASE_EMULATORS_PATH` to a writable persistent cache directory. Keep inherited TLS/proxy trust intact.
4. Run `bash scripts/validate-backend-local.sh`. It scopes ADC removal to the child validation shell, uses an isolated CLI config directory, checks Node 22, and executes suites sequentially to avoid emulator logging/hub port races.

The script's component commands were executed successfully; `bash -n` also passed. The entire wrapper was not rerun as a second duplicate test run. Existing individual commands remain unchanged.

## Diagnosed setup failures

- The first Rules attempt failed before tests because an injected ADC variable violated its existing guard. The successful run excluded it only from the test process; no credentials were inspected or copied.
- Concurrent emulator invocations raced on logging port 4500. Those aborted attempts were not counted as product failures. Sequential Functions execution passed and shut down its services.
- CLI metadata probing was disabled using the library's supported `METADATA_SERVER_DETECTION=none` option in the isolated local validation process.
- Auth Emulator logged warnings that no Authentication trigger ran. The HTTP/core integration assertions and all 11 scripts passed; actual auth-trigger dispatch is not validated by this result.

No application code, security Rules, manifests, lockfiles, production exports, deployment or IAM configuration was changed. Existing vulnerabilities remain a separate work item. This branch adds only a Linux validation helper and documentation.
