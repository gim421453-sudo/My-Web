# P1.5-C2H2E3C1A4G Enriched Stderr Observability Final Relock

## Verdict

`P1_5_C2H2E3C1A4G_FINAL_RELOCK_LIVE_APPROVAL_GATE_PASS`

Local validation and final relock only. No real active-caller discovery,
gcloud auth, token, impersonation, Firestore, IAM, or write was performed.

## Gate Results

- C1A4F verdict: `P1_5_C2H2E3C1A4F_SAFE_STDERR_OBSERVABILITY_ENRICHMENT_PASS`
- Previous C1A3G lock: `INVALIDATED_BY_C1A4F`
- C1A4F changed runtime: `tools/authority-audit/gcloudTokenOutputClassifier.mjs`
- C1A5 entrypoint: `tools/authority-audit/c1a3ExactClassStateReadCaller.mjs`
- Enriched stderr observability in graph: `yes`
- Whole-buffer match strategy unchanged: `yes`
- Line observability affects acceptance: `no`
- Allowlist broadened: `no`
- Token acceptance changed: `no`
- Previously accepted/rejected fixtures: `yes / yes`
- Unknown stderr line diagnostic ready: `yes`
- Diagnostic useful for next attempt: `yes`
- Token plus terminal CRLF accepted: `yes`

## Runtime Graph

`c1a3ExactClassStateReadCaller.mjs` -> static identity/caller gate ->
`windowsGcloudProcessAdapter.mjs` -> `invokeWindowsExecutable.ps1` -> local
`gcloud.cmd` -> token process result -> `gcloudTokenOutputClassifier.mjs` ->
safe whole-process and per-line stderr diagnostics -> token provider ->
`exactClassStateRead.mjs` -> `node:https`.

All required links are present: caller gate, Windows adapter, PowerShell
runner, token classifier/provider, enriched diagnostics, exact executor, and
HTTPS transport.

## Diagnostic and Privacy Contract

Per-line stderr fields are `index`, `charCount`, `isBlank`, `prefixCategory`,
and `semanticCategory`. Prefix enums are `EMPTY`, `WARNING`, `ERROR`, `INFO`,
`OTHER`. Semantic enums are `IMPERSONATION_NOTICE`, `CREDENTIAL_NOTICE`,
`SDK_CONFIGURATION_NOTICE`, and `UNKNOWN`.

No raw stderr/stdout, token, Authorization header, or caller account is
returned, logged, persisted, or included in diagnostics. Structural metadata
is diagnostic-only and does not participate in acceptance.

## Identity and Executor

- Project: `my-management-app-8a933`
- Project number: `607154464656`
- Database: `(default)`
- Workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Class: `class_2026_g2_c5`
- Plan: `2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1`
- Source fingerprint: `sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da`
- Caller fingerprint: `sha256/12:5e6692dda08c`
- Field mask: exact approved 12 fields
- Target resource: exact workspace/class document only

The executor remains GET-only, one request, zero retry, no redirect, response
limit `65536`, timeout `10000`, and no query/list/write capability. Static
identity precedes caller; caller precedes token; provider acceptance precedes
HTTP. Token rejection prevents HTTP.

## Final Runtime Locks

Runtime dependencies:

- `tools/authority-audit/c1a3ExactClassStateReadCaller.mjs`
- `tools/authority-audit/gcloudTokenOutputClassifier.mjs`
- `tools/authority-audit/windowsGcloudProcessAdapter.mjs`
- `tools/authority-audit/invokeWindowsExecutable.ps1`
- `tools/authority-audit/exactClassStateRead.mjs`

SHA-256 locks:

- `c1a3ExactClassStateReadCaller.mjs`: `4b24f8a10df98db85958f9e134e907ccea14b9758c1b288b98c2f7a026903a80`
- `gcloudTokenOutputClassifier.mjs`: `7b1610fe782e57dfe5b95d83f747e184a82470b7f83009367608cc458678aff0`
- `windowsGcloudProcessAdapter.mjs`: `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f`
- `invokeWindowsExecutable.ps1`: `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5`
- `exactClassStateRead.mjs`: `7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776`

Test locks:

- classifier: `88e09ef2d71b6868ab8a4e2035cbd4471b93bd968225daf87dba921bb109f7cc`
- caller: `7e3be887f4b5b657e71f7808cdd5ef3e4740d0258bad6e75d59a2188fa5c55ae`
- executor: `91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c`
- Windows synthetic: `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a`

`C1A4F_PROVISIONAL_VS_C1A4G_FINAL_MATCH = not_available` because C1A4F did
not record provisional hashes. `CODE_FILES_CHANGED = 0` during C1A4G.

## Tests and Safety

Classifier, caller/provider, exact executor, and Windows process synthetic
tests passed. The host adapter test was not run because it invokes
`gcloud --version`; C1A4G prohibits real gcloud commands. C1A1R host evidence
and unchanged adapter lock remain valid.

- Focused test count: `4`
- Focused result: `PASS`
- Regression result: `PASS`
- Real gcloud/token/Firestore/IAM: `0`
- Firestore reads/writes: `0/0`
- Rules/index changes: `0/0`
- Staging/commit/push/deploy: `0/0/0/0`
- Historical Original C1A/C1A3/C1A4 budgets: `EXHAUSTED`

## New C1A5 Budget and Approval

- Active caller discovery max: `1`
- Access token max: `1`
- GetDocument max: `1`
- Retry max: `0`
- Firestore write max: `0`
- `C1A5_LIVE_APPROVAL = NOT_GRANTED`

Prepared wording, not approval:

> P1.5-C2H2E3C1A5 Enriched-Stderr Exact Real Class Production State Single Read 실행을 승인합니다. Active caller discovery 1회, caller count 1과 fingerprint `sha256/12:5e6692dda08c`, 새 token 1회, 정확한 GetDocument 1회만 허용합니다. retry/query/list/다른 문서 read/Firestore write/IAM mutation/manifest persistence는 0회입니다. 대상은 지정된 workspace/class와 12개 field mask로 제한하며 raw stdout/stderr/token/Authorization/caller 원문은 저장·로그하지 않습니다. provider가 수락한 경우에만 GetDocument를 수행하고 즉시 중단합니다. 이 문구는 현재 승인 상태를 변경하지 않습니다.

