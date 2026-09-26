# P1.5-C2H2E3C1A2F bounded single-read executor

## Scope

This package implements and tests the repository-controlled executor required before any future C1A3 live read. It is local-only. No access token was generated, no impersonation or Firestore/IAM call was made, and no canonical or manifest write occurred.

The previous C1A2 approval remains only a gate document. `C1A3_CORRECTED_SINGLE_READ_APPROVAL = NOT_GRANTED`.

## Reusable components and gaps

Reused:

- `tools/authority-audit/windowsGcloudProcessAdapter.mjs` for the corrected host process boundary.
- `tools/authority-audit/invokeWindowsExecutable.ps1` for separated stdout/stderr and preserved exit code.
- `tools/authority-audit/gcloudTokenOutputClassifier.mjs` for narrow token-result policy.
- `functions/src/registries/classRegistryContract.ts` as the schema contract reference; the executor mirrors its strict base rules without changing that source.

Implemented narrowly because they were absent:

- immutable exact Class request contract and target resource builder
- deterministic Firestore v1 GetDocument URL builder
- bounded HTTPS GET transport with no redirect following, timeout, and response limit
- typed Firestore REST value parser and strict Class state classifier
- one-shot orchestration guard with injected token and HTTP dependencies

No live token provider or live C1A3 caller was executed or added. A future live entrypoint must be separately reviewed and must not run on import.

## Executor contract

`tools/authority-audit/exactClassStateRead.mjs` validates project, database, workspace, class, plan, source fingerprint, expected semantic identity, and the exact ordered field mask before invoking the token provider. It derives the resource only from validated IDs and never from display name.

The executor allows at most one token-provider call and one HTTP call. It has no retry, query, batchGet, list, collection-ID, or write surface. The token is used only to construct the in-memory Bearer header for the injected transport and is not returned, logged, serialized, or included in errors/results.

The default transport is HTTPS GET only, rejects non-HTTPS URLs, does not follow redirects, uses a 10-second timeout, and limits the response body to 64 KiB. The executor itself uses the locked Firestore URL and only repeated `mask.fieldPaths` parameters in the approved order.

## Classification coverage

- Canonical 404 `NOT_FOUND` -> `ABSENT`, CAS `MISSING`, create prerequisite confirmed, no write.
- Exact-name 200 with valid equivalent Class -> `PRESENT_EQUIVALENT`.
- Exact-name 200 with one semantic difference -> `PRESENT_CONFLICT`, field names only.
- Unsupported schema, missing CAS field, invalid state, malformed typed value -> `PRESENT_SCHEMA_OR_STATE_REVIEW_REQUIRED`.
- Wrong resource name or redirect -> `STATE_READ_UNEXPECTED_RESPONSE_ABORT`.
- 401 -> `STATE_READ_AUTHENTICATION_FAILED`.
- 403 -> `STATE_READ_PERMISSION_DENIED`.
- 429, 500, timeout, and network failure -> `STATE_READ_INCONCLUSIVE`.

## Local test results

`tools/authority-audit-tests/exactClassStateRead.test.mjs` passed the required matrix: equivalent, conflict, absent, wrong resource, malformed/schema/CAS cases, 401/403/429/500, timeout, network failure, redirect, token rejection, identity guards, field-mask guard, no-retry counts, URL/mask construction, token non-return, and no-write surface.

The gcloud token classifier focused test passed. The Windows process synthetic stderr test passed in the approved host runtime; no real gcloud command was needed for C1A2F because C1A1R already validated that path.

## Required values

```text
C1A2_VERDICT = P1_5_C2H2E3C1A2_CORRECTED_RETRY_APPROVAL_GATE_PASS
C1A3_EXECUTOR_PREVIOUSLY_PRESENT = no
C1A3_EXECUTOR_IMPLEMENTED = yes
EXECUTOR_WRITE_CAPABILITY = none
TARGET_RESOURCE_GUARD = PASS
INPUT_IDENTITY_GUARD = PASS
FIELD_MASK_GUARD = PASS
TOKEN_CALL_MAX_ENFORCED = yes
HTTP_CALL_MAX_ENFORCED = yes
RETRY_ZERO_ENFORCED = yes
AUTO_REDIRECT_DISABLED = yes
RESPONSE_SIZE_BOUNDED = yes
TOKEN_FAILURE_PREVENTS_HTTP = yes
ABSENT_CLASSIFICATION = PASS
PRESENT_EQUIVALENT_CLASSIFICATION = PASS
PRESENT_CONFLICT_CLASSIFICATION = PASS
PRESENT_SCHEMA_REVIEW_CLASSIFICATION = PASS
ERROR_CLASSIFICATION_MATRIX = PASS
TOKEN_NOT_RETURNED_OR_LOGGED = yes
FOCUSED_TESTS = PASS
REGRESSION_TESTS = PASS (classifier and prior host-process regression; no live calls)
LIVE_ACCESS_TOKEN_CALLS = 0
LIVE_FIRESTORE_CALLS = 0
IAM_MUTATIONS = 0
C1A3_CORRECTED_SINGLE_READ_APPROVAL = NOT_GRANTED
```

## Proposed C1A3 execution locks

| Path | SHA-256 |
|---|---|
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudTokenOutputClassifier.mjs` | `a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4` |
| `tools/authority-audit/exactClassStateRead.mjs` | `ad4bc204eceecf5526e428a9d610de41f6d2868bb06631255b6209cf4bb73ee7` |
| `tools/authority-audit-tests/exactClassStateRead.test.mjs` | `91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c` |
| `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs` | `966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5` |
| `tools/authority-audit-tests/windowsProcessSynthetic.test.mjs` | `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a` |
| `tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs` | `6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3` |
| `functions/src/registries/classRegistryContract.ts` | `bd3a236ac56d2339d6304f7b2e17a2074cb218b59e173eecd5c9cb6f09a47f8b` |

## Safety counters and next step

All live Google Cloud, token, impersonation, Firestore, IAM, service-account-key, production-data, canonical-write, manifest-persistence, staging, commit, push, and deploy counters are `0` for C1A2F.

Next package: `P1.5-C2H2E3C1A2G FINAL CORRECTED SINGLE-READ EXECUTION LOCK AND APPROVAL GATE`. Only after that gate and a new explicit approval may C1A3 perform one token call plus one exact GetDocument with zero retry.

Verdict: `P1_5_C2H2E3C1A2F_BOUNDED_SINGLE_READ_EXECUTOR_PASS`.
