# P1.5-C2H2E3C1A2G Final corrected single-read execution lock and approval gate

## Scope and verdict

This is a local integrity gate only. No token, impersonation, Firestore, IAM, production, canonical, manifest, staging, commit, push, or deploy operation was performed.

`P1_5_C2H2E3C1A2F_BOUNDED_SINGLE_READ_EXECUTOR_PASS` was verified. The executor and focused matrix are sound, but the final C1A3 runtime graph is incomplete because the repository has no exact token-generation caller wired to this executor. The broader `runProductionInventory.mjs` token path is explicitly excluded because it serves a different inventory flow and is not an exact C1A3 caller.

Verdict: `P1_5_C2H2E3C1A2G_BLOCKED`.

## Runtime dependency graph

Actual current executor graph:

```text
exactClassStateRead.mjs
  -> node:https (built-in)
```

The executor contains its exact contract validation, resource and URL builders, field-mask guard, typed Firestore REST parser, Class state validation, semantic comparison, bounded HTTPS GET, timeout, redirect rejection, and one-shot counters.

Not currently present in the exact C1A3 graph:

- token-generation caller/helper
- adapter/classifier wiring into `runExactClassStateReadOnce`
- active caller identity gate

Available but not loaded by the executor itself:

- `windowsGcloudProcessAdapter.mjs`
- `invokeWindowsExecutable.ps1`
- `gcloudTokenOutputClassifier.mjs`
- `functions/src/registries/classRegistryContract.ts` as the schema reference, not a runtime import

These remain candidate dependencies for a separately reviewed dormant token caller. They cannot be claimed as the final C1A3 runtime graph until that caller exists and is locked.

## Locked identity and field mask

- Project: `my-management-app-8a933`
- Database: `(default)`
- Workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Class: `class_2026_g2_c5`
- Plan ID: `2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1`
- Source fingerprint: `sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da`
- Target: `workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5`

Exact mask, with no runtime expansion or replacement:

`[schemaVersion, version, workspaceId, classId, status, source, createdAt, updatedAt, createdBy, displayName, schoolYear, grade]`

## Current execution locks

These are the current local locks. They are not a complete C1A3 lock until the missing caller is added and reviewed.

| Path | SHA-256 |
|---|---|
| `tools/authority-audit/exactClassStateRead.mjs` | `ad4bc204eceecf5526e428a9d610de41f6d2868bb06631255b6209cf4bb73ee7` |
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudTokenOutputClassifier.mjs` | `a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4` |
| `functions/src/registries/classRegistryContract.ts` | `bd3a236ac56d2339d6304f7b2e17a2074cb218b59e173eecd5c9cb6f09a47f8b` |

Validation test locks:

| Path | SHA-256 |
|---|---|
| `tools/authority-audit-tests/exactClassStateRead.test.mjs` | `91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c` |
| `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs` | `966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5` |
| `tools/authority-audit-tests/windowsProcessSynthetic.test.mjs` | `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a` |
| `tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs` | `6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3` |

All current hashes match the C1A2F/C1A1R values. Final C1A3 lock status is incomplete, not drifted.

## Local verification

- Executor security matrix: PASS.
- Token classifier matrix: PASS.
- Identity drift fails before token: PASS.
- Target and field-mask guards: PASS.
- One token / one HTTP / zero retry enforcement: PASS.
- HTTP method: GET only.
- Redirect: fail closed.
- Response bound: `65536` bytes.
- HTTP timeout: `10000` ms.
- Write capability: none.
- Query/list capability in exact path: none.
- Token return/log/persistence: none.
- `git diff --check`: only pre-existing line-ending warnings.
- Sensitive scan: no matches in new C1A2G material and focused runtime/test files.

No new gcloud host command was needed; C1A1R already validated the host path.

## Required values

```text
C1A2F_VERDICT = P1_5_C2H2E3C1A2F_BOUNDED_SINGLE_READ_EXECUTOR_PASS
C1A3_EXECUTOR_IMPLEMENTED = yes
EXECUTOR_WRITE_CAPABILITY = none
QUERY_CAPABILITY_IN_C1A3_PATH = none
LIST_CAPABILITY_IN_C1A3_PATH = none
TARGET_RESOURCE_GUARD = PASS
FIELD_MASK_GUARD = PASS
ALL_IDENTITY_DRIFT_FAILS_BEFORE_TOKEN = yes
TOKEN_CALL_MAX_ENFORCED = yes
HTTP_CALL_MAX_ENFORCED = yes
RETRY_ZERO_ENFORCED = yes
AUTO_REDIRECT_DISABLED = yes
MAX_RESPONSE_BYTES = 65536
HTTP_TIMEOUT_MS = 10000
KNOWN_WARNING_CLASSIFIER = PASS
UNKNOWN_STDERR_FAILS_CLOSED = yes
NONZERO_EXIT_FAILS_CLOSED = yes
INVALID_TOKEN_FAILS_CLOSED = yes
TIMEOUT_FAILS_CLOSED = yes
TOKEN_RETURNED = no
TOKEN_LOGGED = no
TOKEN_PERSISTED = no
ABSENT_CLASSIFICATION = PASS
PRESENT_EQUIVALENT_CLASSIFICATION = PASS
PRESENT_CONFLICT_CLASSIFICATION = PASS
PRESENT_SCHEMA_REVIEW_CLASSIFICATION = PASS
HTTP_ERROR_MATRIX = PASS
FOCUSED_TESTS = PASS
REGRESSION_TESTS = PASS (C1A1R host regression and classifier regression)
ORIGINAL_C1A_BUDGET = EXHAUSTED
C1A3_ACCESS_TOKEN_MAX = 1
C1A3_GETDOCUMENT_MAX = 1
C1A3_RETRY_MAX = 0
C1A3_QUERY_MAX = 0
C1A3_LIST_MAX = 0
C1A3_WRITE_MAX = 0
C1A3_CORRECTED_SINGLE_READ_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

## Approval wording prepared, not granted

The following is the exact future approval scope and is intentionally not an approval:

> P1.5-C2H2E3C1A3 Corrected Exact Real Class Production State Single Read를 승인합니다. 기존 C1A의 token 1회와 GetDocument 0회 결과 및 budget EXHAUSTED 상태를 별도 historical evidence로 인정합니다. 새 실행은 별도 budget으로만 수행합니다. 대상은 project `my-management-app-8a933`, database `(default)`, workspace `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`, class `class_2026_g2_c5`이며, 정확한 target resource와 승인된 field mask만 사용합니다. access token 최대 1회, exact GetDocument 최대 1회, retry/query/list/batchGet/other document read/write/IAM mutation은 0회입니다. token은 memory-only이고 로그·문서·파일에 기록하지 않습니다. 401/403/429/5xx/timeout/network/redirect/unexpected response 및 contract mismatch는 즉시 fail-closed하며 retry하지 않습니다. 결과가 ABSENT, PRESENT_EQUIVALENT, PRESENT_CONFLICT, PRESENT_SCHEMA_OR_STATE_REVIEW_REQUIRED 중 무엇이든 write는 승인하지 않습니다.

This wording must not be treated as granted until a separate explicit user approval is received.

## Safety and next action

For C1A2G: live impersonation, token calls/generation, Firestore API/read/write, IAM read/mutation, service-account key use/creation, production data read, manifest persistence, canonical write, Rules/Indexes changes, staging, commit, push, and deploy are all `0`.

Recommended next action: add and separately review the dormant exact token-generation caller plus active-caller gate, then rerun C1A2G to produce a complete C1A3 lock. Do not run C1A3 from the current blocked gate.
