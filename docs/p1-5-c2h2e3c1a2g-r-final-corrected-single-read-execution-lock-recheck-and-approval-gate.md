# P1.5-C2H2E3C1A2G-R Final Corrected Single-Read Execution Lock Recheck

## Verdict

`P1_5_C2H2E3C1A2G_R_FINAL_EXECUTION_LOCK_APPROVAL_GATE_PASS`

This is a local, read-only recheck. C1A3 approval remains `NOT_GRANTED`.
No live gcloud, IAM, Firestore, API, token, or production request was made.

## Baseline and Scope

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Code files changed in this recheck: `0`
- Only this result document is added by this recheck.
- The earlier C1A2G block was caused by the absence of an active caller and gate in the runtime graph. C1A2H added the dormant, dependency-injected caller and gate; this recheck independently confirmed that graph.

## Runtime Graph

The exact future C1A3 entrypoint is:

`tools/authority-audit/c1a3ExactClassStateReadCaller.mjs`

The graph is:

```text
c1a3ExactClassStateReadCaller.mjs
  -> exactClassStateRead.mjs
       -> node:https
  -> windowsGcloudProcessAdapter.mjs
       -> invokeWindowsExecutable.ps1
       -> local gcloud.cmd (dormant external executable)
  -> gcloudTokenOutputClassifier.mjs
  -> node:crypto
```

`functions/src/registries/classRegistryContract.ts` is a schema reference and is not loaded by this ESM runtime graph. Node built-ins are runtime prerequisites, not project lock files.

| Gate | Result |
|---|---|
| Active caller gate in graph | YES |
| Token generator in graph | YES |
| Corrected Windows adapter in graph | YES |
| PowerShell runner in graph | YES |
| Token classifier in graph | YES |
| Exact class-state executor in graph | YES |
| HTTPS transport in graph | YES |

## Identity, Order, and Target Contract

The static contract is checked before caller discovery. The caller gate runs before token generation, and token generation runs before the exact HTTP request. Static drift is rejected before any token or HTTP dependency is called.

- Project: `my-management-app-8a933`
- Database: `(default)`
- Target workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Target class: `class_2026_g2_c5`
- Plan ID: `2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1`
- Source fingerprint: `sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da`
- Active-caller fingerprint algorithm: trimmed lowercase UTF-8 SHA-256, first 12 lowercase hex
- Expected active-caller fingerprint: `5e6692dda08c`
- Field mask: `schemaVersion, version, workspaceId, classId, status, source, createdAt, updatedAt, createdBy, displayName, schoolYear, grade`
- Target is one exact document path; no query, list, collection scan, or fallback path exists.

The raw caller output is not returned, logged, or persisted. The token, authorization header, and raw response body are likewise not returned, logged, or persisted.

## Token and Transport Lock

- Service account identity is bound to `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`.
- The executable is invoked through the corrected Windows adapter and its local `gcloud.cmd` resolution; the host runtime behavior was validated by C1A1R.
- Discovery command: `auth list --filter=status:ACTIVE --format=value(account)`.
- Token command: `auth print-access-token --impersonate-service-account=myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com --scopes=https://www.googleapis.com/auth/datastore`.
- Token provider calls: maximum `1`.
- Exact HTTPS calls: maximum `1`.
- Retry count: `0`.
- Redirects: disabled.
- Maximum response body: `65536` bytes.
- Request timeout: `10000` ms.
- Query/list/write surface: none.

The classifier is wired into the token path. Known benign impersonation warning text is accepted only for that operation; unknown stderr, nonzero exit, invalid token, multiline token output, and timeout fail closed.

## Focused Verification

Executed locally with synthetic or dependency-injected inputs only:

- `c1a3ExactClassStateReadCaller.test.mjs`: PASS
- `exactClassStateRead.test.mjs`: PASS
- `gcloudTokenOutputClassifier.test.mjs`: PASS
- `windowsProcessSynthetic.test.mjs`: PASS
- `node --check` for caller, executor, and caller test: PASS

Windows adapter host regression: PASS based on C1A1R host evidence and unchanged current adapter lock; this recheck did not invoke gcloud.

The test matrix covers caller-gate rejection, static identity drift, token/header secrecy, exact target and mask, HTTP success/error classifications, no retry, and no query/list/write behavior.

## Runtime Lock Hashes

The following SHA-256 locks were recomputed from the current files and exactly match the C1A2H provisional locks:

```text
a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4  tools/authority-audit/gcloudTokenOutputClassifier.mjs
512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f  tools/authority-audit/windowsGcloudProcessAdapter.mjs
ad4bc204eceecf5526e428a9d610de41f6d2868bb06631255b6209cf4bb73ee7  tools/authority-audit/exactClassStateRead.mjs
ef7fc61a6b8a8fdb03d951e63d7c448fa3483559f44efff9dd7052b4d08263ae  tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5  tools/authority-audit/invokeWindowsExecutable.ps1
```

Test lock files were also unchanged and rechecked:

```text
64aaaf8c1505d3fc054045a8566dfb1609bdb3c4557a1c44f10e4f70b6635f0b  tools/authority-audit-tests/c1a3ExactClassStateReadCaller.test.mjs
91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c  tools/authority-audit-tests/exactClassStateRead.test.mjs
966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5  tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs
d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a  tools/authority-audit-tests/windowsProcessSynthetic.test.mjs
6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3  tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs
```

`PROVISIONAL_VS_FINAL_LOCK_MATCH = true`.

## Safety and Approval State

- Active caller discovery executed: `0`
- Token generated: `0`
- Exact GetDocument executed: `0`
- Firestore reads: `0`
- Firestore writes: `0`
- IAM/API calls: `0`
- Retries: `0`
- Approval granted: `NO`
- Current approval: `NOT_GRANTED`

The prepared future C1A3 approval must remain bounded to exactly one active-caller discovery, one token generation, one exact GetDocument, zero retry, zero write, and no alternate path. It is not an approval for this recheck.

## Prepared C1A3 Approval Wording (Not Granted)

```text
승인합니다. 단, 다음 단일 실행 범위로만 승인합니다.

- 대상 workspace: owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
- 대상 class: class_2026_g2_c5
- planId: 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
- source fingerprint: sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da
- 요청: 정확한 단일 Firestore GetDocument 1회
- token 생성: 최대 1회
- active caller discovery: 최대 1회
- retry: 0회
- query/list/collection scan: 금지
- write/delete/update/batch/transaction: 금지
- 응답: 지정된 field mask만 반환
- token, authorization header, UID, 전체 raw response, 전체 경로 로그: 금지
```

이 문구는 현재 승인 아님. 현재 단계의 판정은 실행 잠금 재검증 PASS이며, C1A3 live execution은 별도 승인 전까지 수행하지 않는다.

## Final Decision

The corrected caller, token, transport, classifier, exact executor, identity, field mask, target, and lock hashes are internally consistent. The implementation is ready for a separately approved C1A3 single-run gate, but no C1A3 approval is granted by this document.

`CODE_FILES_CHANGED = 0`

