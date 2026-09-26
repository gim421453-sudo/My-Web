# P1.5-C2H2E3C1A1R Windows host-runtime adapter regression

## Scope and safety

This validation used only the local Windows process path. It did not request an access token, impersonate a service account, call Firestore, call IAM, access production data, persist a manifest, or perform any write. No code bypass was used.

## Baseline

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- Dirty files were preserved.

## Execution path

The tested path was Node -> `windowsGcloudProcessAdapter.mjs` -> `invokeWindowsExecutable.ps1` -> the locally resolved `gcloud.cmd` executable. Host PowerShell process creation was available.

Safe local commands executed through the adapter:

- `gcloud --version`
- `gcloud help`

Both returned exit code 0. No credential, token, impersonation, Firestore, IAM, or project mutation command was used.

## Contract results

- `PROCESS_STARTED`: yes
- `TIMED_OUT`: no for successful commands
- `EXIT_CODE`: preserved
- `STDOUT_CAPTURED`: yes
- `STDERR_CAPTURED_SEPARATELY`: yes
- Safe gcloud command count: 2
- Nonzero exit: captured and fail-closed by synthetic process regression
- Argument forwarding with `@`, `:`, and `=`: passed
- Timeout result: preserved and fail-closed
- Known impersonation warning classifier: synthetic unit test passed
- Unknown stderr classifier: fail-closed

The real host test did not synthesize or require an impersonation warning. Warning classification remains covered only by synthetic fixtures as required.

## Execution locks

Current SHA-256 locks:

| Path | SHA-256 |
|---|---|
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudTokenOutputClassifier.mjs` | `a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4` |
| `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs` | `966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5` |
| `tools/authority-audit-tests/windowsProcessSynthetic.test.mjs` | `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a` |
| `tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs` | `6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3` |

## Verdict

`C1A1_VERDICT = P1_5_C2H2E3C1A1_STDERR_WARNING_NARROW_FIX_PASS`

`P1_5_C2H2E3C1A1R_HOST_RUNTIME_REGRESSION_PASS`

The corrected retry is technically ready, but C1A retry authorization remains `NOT_GRANTED`. Any next exact-state read requires a new independent approval gate with a new execution budget.

## Required counters

`ACCESS_TOKEN_CALLS = 0`  
`ACCESS_TOKENS_GENERATED = 0`  
`IMPERSONATION_CALLS = 0`  
`FIRESTORE_API_CALLS = 0`  
`FIRESTORE_READS = 0`  
`FIRESTORE_WRITES = 0`  
`IAM_LIVE_READS = 0`  
`IAM_MUTATIONS = 0`  
`PRODUCTION_DATA_READS = 0`  
`CANONICAL_WRITES = 0`  
`MANIFEST_PERSISTENCE_CALLS = 0`  
`STAGING = 0`  
`COMMIT = 0`  
`PUSH = 0`  
`DEPLOY = 0`

Recommended next action: `P1.5-C2H2E3C1A2 CORRECTED EXACT-STATE SINGLE-READ RETRY APPROVAL GATE`.
