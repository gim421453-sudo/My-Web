# P1.5-C2H2E3C1A2H dormant C1A3 token caller and active-caller gate

## Scope

This package completes the missing repository-controlled C1A3 wiring using dormant, dependency-injected code and synthetic tests only. It does not generate a token, impersonate, access Firestore, access IAM, read production data, or write canonical/manifest data.

Previous `P1_5_C2H2E3C1A2G_BLOCKED` was caused by the missing caller/gate graph, not by an executor contract failure.

## Proven local contracts

The active-caller fingerprint contract is established by the earlier local approval evidence:

1. run `gcloud auth list --filter=status:ACTIVE --format=value(account)`;
2. require exactly one output account;
3. trim the account;
4. lowercase with invariant semantics;
5. hash its UTF-8 bytes with SHA-256;
6. use the first 12 lowercase hexadecimal characters.

The expected fingerprint remains `sha256/12:5e6692dda08c`. Raw account text is transient only and is never returned, logged, persisted, or placed in errors.

The token command contract recovered from the prior approval evidence is:

```text
gcloud.cmd auth print-access-token
  --impersonate-service-account=myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
  --scopes=https://www.googleapis.com/auth/datastore
```

It is invoked only through the corrected Windows process adapter and classified by the narrow stderr classifier. No service-account JSON, ADC fallback, Firebase Admin fallback, or alternate principal is used.

## Implemented wiring

`tools/authority-audit/c1a3ExactClassStateReadCaller.mjs` now provides:

- active caller discovery and exact count/fingerprint gate;
- dormant impersonated-token provider using the corrected adapter and classifier;
- explicit `runC1A3CorrectedExactClassStateRead` orchestration;
- static identity validation before active-caller discovery;
- active caller validation before token generation;
- token provider at most once, followed by the existing exact executor;
- bounded result counters with no token or Authorization field.

The existing `exactClassStateRead.mjs` remains unchanged and owns target construction, field-mask validation, HTTPS GET, redirect rejection, body limit, timeout, parser, classification, and one-shot HTTP behavior.

## Runtime graph after implementation

```text
c1a3ExactClassStateReadCaller.mjs
  -> exactClassStateRead.mjs
       -> node:https
  -> windowsGcloudProcessAdapter.mjs
       -> invokeWindowsExecutable.ps1
       -> local gcloud.cmd (dormant; not called in this package)
  -> gcloudTokenOutputClassifier.mjs
  -> node:crypto
```

`functions/src/registries/classRegistryContract.ts` remains the canonical schema reference but is not a runtime import because the authority tools run as ESM JavaScript. The executor's strict parser mirrors its validated Class contract without changing the Functions source.

Execution order is fixed: static contract, active caller, token provider, exact executor, bounded result. No top-level side effects occur on import.

## Synthetic validation

`c1a3ExactClassStateReadCaller.test.mjs` covers successful synthetic 404 and 200 flows, active caller count 0/2/wrong fingerprint, raw identity privacy, static identity drift before discovery, token warning success, unknown stderr, nonzero exit, empty/malformed/multiline output, timeout, 401/403/429/500, network failure, no retry, and no write/query/list surface.

Results:

- active caller success: discovery 1, token 1, HTTP 1, retry 0;
- caller mismatch: token 0, HTTP 0;
- static mismatch: discovery 0, token 0, HTTP 0;
- token failure: token attempt 1, HTTP 0;
- HTTP failures: token 1, HTTP 1, retry 0;
- raw caller/token/Authorization values absent from public orchestration results;
- exact executor, classifier, and Windows synthetic adapter tests passed.

No real gcloud command was run in C1A2H. C1A1R remains the host-runtime evidence.

## Required values

```text
C1A2G_PREVIOUS_VERDICT = P1_5_C2H2E3C1A2G_BLOCKED
C1A2G_BLOCK_REASON = MISSING_C1A3_TOKEN_CALLER_AND_ACTIVE_CALLER_GATE
ACTIVE_CALLER_FINGERPRINT_CONTRACT_PROVEN = yes
ACTIVE_CALLER_FINGERPRINT_ALGORITHM = trim + lowercase + UTF-8 SHA-256 + first 12 lowercase hex
ACTIVE_CALLER_GATE_IMPLEMENTED = yes
ACTIVE_CALLER_RAW_ID_RETURNED = no
ACTIVE_CALLER_RAW_ID_LOGGED = no
ACTIVE_CALLER_DISCOVERY_MAX = 1
TOKEN_GENERATION_CALLER_IMPLEMENTED = yes
TOKEN_COMMAND_EXECUTABLE = local gcloud.cmd via windowsGcloudProcessAdapter.mjs
CORRECTED_WINDOWS_ADAPTER_WIRED = yes
TOKEN_OUTPUT_CLASSIFIER_WIRED = yes
C1A3_DORMANT_ORCHESTRATOR_IMPLEMENTED = yes
EXACT_CLASS_STATE_READ_WIRED = yes
STATIC_IDENTITY_FAILS_BEFORE_TOKEN = yes
CALLER_MISMATCH_FAILS_BEFORE_TOKEN = yes
TOKEN_FAILURE_PREVENTS_HTTP = yes
TOKEN_CALL_MAX_ENFORCED = yes
HTTP_CALL_MAX_ENFORCED = yes
RETRY_ZERO_ENFORCED = yes
WRITE_CAPABILITY = none
QUERY_CAPABILITY = none
LIST_CAPABILITY = none
TOKEN_IN_PUBLIC_RESULT_SCHEMA = no
AUTHORIZATION_IN_PUBLIC_RESULT_SCHEMA = no
```

## Provisional runtime locks

| Path | SHA-256 |
|---|---|
| `tools/authority-audit/c1a3ExactClassStateReadCaller.mjs` | `ef7fc61a6b8a8fdb03d951e63d7c448fa3483559f44efff9dd7052b4d08263ae` |
| `tools/authority-audit/exactClassStateRead.mjs` | `ad4bc204eceecf5526e428a9d610de41f6d2868bb06631255b6209cf4bb73ee7` |
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudTokenOutputClassifier.mjs` | `a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4` |

## Provisional test locks

| Path | SHA-256 |
|---|---|
| `tools/authority-audit-tests/c1a3ExactClassStateReadCaller.test.mjs` | `64aaaf8c1505d3fc054045a8566dfb1609bdb3c4557a1c44f10e4f70b6635f0b` |
| `tools/authority-audit-tests/exactClassStateRead.test.mjs` | `91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c` |
| `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs` | `966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5` |
| `tools/authority-audit-tests/windowsProcessSynthetic.test.mjs` | `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a` |
| `tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs` | `6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3` |

These are provisional until C1A2G-R independently retraces and recomputes them.

## Approval remains closed

```text
C1A3_CORRECTED_SINGLE_READ_APPROVAL = NOT_GRANTED
C1A3_ACCESS_TOKEN_APPROVAL = NOT_GRANTED
C1A3_FIRESTORE_READ_APPROVAL = NOT_GRANTED
FIRESTORE_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

## Safety counters

For C1A2H: real gcloud commands `0`, live gcloud auth calls `0`, active-caller live discovery `0`, impersonation `0`, token calls/generation `0`, Firestore API/read/write `0`, IAM reads/mutations `0`, service-account key use/creation `0`, production data reads `0`, canonical writes `0`, manifest persistence `0`, Rules/Indexes changes `0`, staging/commit/push/deploy `0`.

## Verdict and next action

`P1_5_C2H2E3C1A2H_DORMANT_C1A3_CALLER_GATE_PASS`

Recommended next action: `P1.5-C2H2E3C1A2G-R FINAL CORRECTED SINGLE-READ EXECUTION LOCK RECHECK AND APPROVAL GATE`.
