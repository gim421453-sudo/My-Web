# P1.5-C2H2E3D-W1C-M3L2-G4R3F

## Scope

Local installed Cloud SDK source proof only. No gcloud process, cloud API, IAM, token, Firestore, M3, M4, or Cloud Logging operation was performed.

## Evidence binding

- G4R3S payload: `5f679e024fd20dcc1f7a7c362ea7fa2df05c57a0618fedbf9756b9205de84acf`
- G4R3S result document: `1b32e9ac0966c8e3bb95d5a8b59ec5ad544047583ffc9afbc01fcf34b49ee802`
- G4R3D payload: `6dcce593886701d31bd341bf91d6edf080cd76082fb39dcfb30aec23a7dc27ef`
- G4R2 composite: `790c903219ec3cb7f9aa536c2c3881b8fc889471fd0505f05c38060d1835d0c1`
- G4R3F canonical payload: `4f8b1c2fd110abfeeb44279ead491684d2f88068979ec397c3d714cd4b4c7b25`

## Control-flow proof

The installed SDK is version `580.0.0`. Its `store.Load(account=None, ...)` accepts an explicit account; only when that argument is absent does it read `core/account`. `_Load` first handles access-token environment, access-token-file, and credential-file override branches. Under the G4R3S future sanitized environment and `--configuration=NONE` contract, those branches are excluded.

The normal branch calls the credential store's `Load(account)`. The store interface and concrete cache loader accept the requested account identifier directly and return only that account's record or `None`; account enumeration is a separate inventory API and is not a fallback in `Load(account)`. If the store returns no credential, `STATIC_CREDENTIAL_PROVIDERS.GetCredentials(account)` receives the same account. The installed `GceCredentialProvider` checks membership of that exact account in metadata accounts before constructing the credential. If both paths fail, `NoCredentialsForAccountException` is raised. No alternate stored account is selected.

Refresh and invalid credential errors remain on the loaded credential path; the source contains no branch that selects another account. Removing the requested account likewise reaches failure. This proves the requested-account fallback property from SDK control flow, not stderr text.

## Configuration-root boundary

`CLOUDSDK_CONFIG` selects the configuration root and therefore the credential store location. It can change credential origin, so the future child environment must pin the approved configuration-root selector consistently. That change must not copy credential databases, tokens, or keys. With explicit account selection, a changed root may make the requested account unavailable, but the proven `Load(account)` path does not replace it with another account.

## Result

- `PINNED_ACCOUNT_CREDENTIAL_FALLBACK = FAILS_CLOSED`
- `ALTERNATE_ACCOUNT_SELECTED = no`
- `CREDENTIAL_FALLBACK_PROOF_SOURCE = SDK_CONTROL_FLOW`
- `G4R3H_RUNTIME_CHANGE_REQUIRED = yes`
- G4R1/G4R2 become historical-only after future argv/environment changes.
- M3L3 approval remains not granted.

The future exact caller contract is now semantically closed for missing-account fallback, but implementation and fresh runtime/capability re-attestation are still required.

## Safety counters

`REAL_GCLOUD_EXECUTIONS=0`, `LIVE_IAM_READS=0`, `IAM_MUTATIONS=0`, `M3_LIVE_MUTATIONS=0`, `M4_MUTATIONS=0`, `ACCESS_TOKEN_CALLS=0`, `FIRESTORE_API_CALLS=0`, `STAGING=0`, `COMMIT=0`, `PUSH=0`, `DEPLOY=0`.

Verdict: **P1_5_C2H2E3D_W1C_M3L2_G4R3F_PINNED_ACCOUNT_FALLBACK_PROVEN_FAILS_CLOSED_IMPLEMENTATION_REQUIRED**
