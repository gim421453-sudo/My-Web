# P1.5-C2H2E3C1A2 Corrected exact-state single-read retry approval gate

## Gate scope

This document prepares a new, independent approval for a future bounded C1A3 read. C1A2 performs no access-token generation, impersonation, Firestore read/write, IAM operation, canonical write, or manifest persistence.

The original C1A budget is permanently exhausted and is not reused.

## Historical result verification

The local C1A result confirms:

- `TARGET_STATE = STATE_READ_INCONCLUSIVE`
- historical access-token calls/generation: `1 / 1`
- exact GetDocument requests: `0`
- Firestore reads/writes: `0 / 0`
- retries: `0`
- original budget: `EXHAUSTED`

C1A1 confirms the narrow stderr fix, and C1A1R confirms the corrected Node -> PowerShell -> local gcloud host path.

## Locked future identity

- Target workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Target class: `class_2026_g2_c5`
- Exact canonical path: `workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5`
- Plan ID: `2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1`
- Source fingerprint: `sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da`

Local approval documents and the E3B intake identity agree. No alternate workspace, display-name-derived path, fallback, or sibling read is permitted.

## Exact field mask

Recovered unchanged from the C1 approval gate:

`[schemaVersion, version, workspaceId, classId, status, source, createdAt, updatedAt, createdBy, displayName, schoolYear, grade]`

The future read must use only this mask and must first require the returned resource name to equal the exact locked resource.

## Current execution locks

| Path | SHA-256 |
|---|---|
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs` | `512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f` |
| `tools/authority-audit/invokeWindowsExecutable.ps1` | `2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5` |
| `tools/authority-audit/gcloudTokenOutputClassifier.mjs` | `a9b16b1d89925bb5e6e1eb848d438b39ee8c80dd466290ca0343c9ec1e1611a4` |
| `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs` | `966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5` |
| `tools/authority-audit-tests/windowsProcessSynthetic.test.mjs` | `d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a` |
| `tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs` | `6c72389832d1cb312f5af1bddd51e2a83214c767253ab690cc8b0565c3211cc3` |
| `functions/src/registries/classRegistryContract.ts` | `bd3a236ac56d2339d6304f7b2e17a2074cb218b59e173eecd5c9cb6f09a47f8b` |

All current locks match the post-C1A1/C1A1R values. There is no existing repository C1A3 token-generation caller or HTTP GetDocument caller to lock; those must be introduced or identified in a separately reviewed execution package before C1A3. No broader inventory or Admin SDK reader is accepted as a substitute.

## Focused local validation

- Token output classifier: pass.
- Known benign warning: pass using synthetic fixture only.
- Unknown stderr, nonzero exit, invalid/multiline output, and timeout: fail closed.
- Windows stderr separation synthetic test: pass in approved host runtime; sandbox-only run was blocked by PowerShell `EPERM`.
- Host gcloud revalidation: not repeated; C1A1R already passed two safe local commands.
- `git diff --check`: only pre-existing line-ending warnings in unrelated dirty files.
- Sensitive-pattern scan: no matches in the new C1A2 material and focused tooling.

## New independent future budget

If separately approved, C1A3 may receive exactly:

- access-token calls/max: `1`
- generated tokens max: `1`
- exact GetDocument requests/max: `1`
- Firestore document reads max: `1`
- retries: `0`
- queries, list, collection IDs, batchGet: `0`
- all writes and manifest persistence: `0`

The token must remain memory-only, never be logged or written, and be discarded after the one read attempt. Unknown stderr, nonzero exit, invalid token, timeout, 401, 403, 429, 5xx, network failure, unexpected resource name, or payload mismatch must stop without retry or fallback.

## Approval state and next step

`C1A3_CORRECTED_SINGLE_READ_APPROVAL = NOT_GRANTED`  
`CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED`  
`FIRESTORE_WRITE_APPROVAL = NOT_GRANTED`

No live read is authorized by this document. The next action is to wait for explicit C1A3 approval with the independent budget above and a concrete, locked caller implementation.

## Verdict

`P1_5_C2H2E3C1A2_CORRECTED_RETRY_APPROVAL_GATE_PASS`

Safety counters for this gate: live impersonation `0`, access-token calls `0`, Firestore API calls/reads/writes `0`, IAM reads/mutations `0`, staging/commit/push/deploy `0`.
