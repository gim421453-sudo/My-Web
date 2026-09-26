# P1.5-C2H2E3D-W1C-M3L2-G4R3S

## Scope

Local-only reconciliation of supplied official gcloud semantics with the installed local SDK source and the repository launcher. No gcloud command, IAM read/mutation, token generation, Firestore, production, or Cloud Logging operation was performed.

## G4R3D/G4R2/G4R1 binding

- G4R3D payload: `6dcce593886701d31bd341bf91d6edf080cd76082fb39dcfb30aec23a7dc27ef`
- G4R3D result document exact byte hash: `5f842adf69e2dfe3c33326a5109ddd2c3b6ff29bc7149f32197b479afc1df7bd`
- G4R2 composite: `790c903219ec3cb7f9aa536c2c3881b8fc889471fd0505f05c38060d1835d0c1`
- G4R1 attestation: `5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e`

## Local reconciliation

The installed SDK source documents `NONE` as a property-empty configuration and resolves `--configuration` before invocation properties. The credential store separately detects the access-token environment override, access-token-file property, credential-file override, and impersonation property. The supplied official semantics establish that `--account` overrides `core/account`, while access-token and impersonation paths can supersede the selected account.

The current M3 graph contains none of `--account`, `--configuration`, `--access-token-file`, `--impersonate-service-account`, or `--flags-file`. `runWindowsProcess` uses the fixed PowerShell host without constructing a sanitized child environment; the normal child inherits the parent environment. Consequently, current OP-A discovery is bootstrap-only and does not prove the effective caller of later operations.

For a future session, `--configuration=NONE` plus explicit `--account` closes configuration/account selection TOCTOU. It does not close credential overrides by itself. Every relevant child must receive a newly constructed sanitized environment that rejects access-token, credential-file, and impersonation override surfaces. A missing pinned credential must fail closed; the current local evidence does not prove that no alternate stored account fallback can occur, so this contract remains blocked.

## Required future contract

OP-A discovers exactly one candidate and creates one immutable in-memory context containing the exact principal kind, exact principal, exact IAM member, and pinned credential identity. OP-B through OP-E use the pinned account/configuration and sanitized environment. Fresh OP-C compares the exact member transiently and returns only bounded states. Only exact `TARGET_MEMBER_ABSENT` can reach OP-E, which receives the same member by construction. No rediscovery, persistence, restart resume, hash authorization, raw override value, or mutation-as-diagnostic is allowed.

The current constructor is bounded: a validated service-account suffix maps to `serviceAccount`, otherwise a validated email maps to `user`. The future implementation must retain exact transport value and must not reuse fingerprint lowercasing/trimming for authorization.

## Proposed next implementation

G4R3H should update `m3RuntimeCommandGraph.mjs` and, if needed, `windowsGcloudProcessAdapter.mjs` to add explicit per-invocation pinning, sanitized child environment construction, immutable context flow, exact prestate comparison, and fail-closed credential fallback. This changes argv/environment/runtime semantics and invalidates G4R1/G4R2 for future live M3 use. New runtime and external-capability re-attestation plus a new final composite are required before any M3L3 approval.

## Safety result

`USER_GCLOUD_CONFIG_MUTATIONS=0`, `CREDENTIAL_COPY=0`, `SERVICE_ACCOUNT_JSON_KEY_PATH=ABSENT`, `ACCESS_TOKEN_GENERATION_ADDED=no`, and all live counters are zero. M3L3 approval is not granted.

Verdict: **P1_5_C2H2E3D_W1C_M3L2_G4R3S_PINNED_ACCOUNT_CREDENTIAL_FALLBACK_UNRESOLVED**
