# P1.5-C2H2B3A Firebase Admin SDK Token-Creator Dependency Review

## 1. Scope and baseline

This review uses the local repository, local non-secret configuration, Git
history, the retained B2/B3 evidence, and authoritative public platform
contracts. It performs no live IAM, Firebase, Firestore, workload, or logging
request and changes no cloud policy.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 129
STAGING = 0
INITIAL_GIT_DIFF_CHECK = pass; pre-existing CRLF warnings only
```

## 2. Exact existing principal

B2 retained the only required live evidence. No IAM policy was queried again.

```text
EXISTING_PROJECT_TOKEN_CREATOR_PRINCIPAL = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
PRINCIPAL_TYPE = FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT
SOURCE_EVIDENCE = docs/p1-5-c2h2b2-exact-audit-principal-live-iam-verification.md, project IAM read retained from B2
ROLE = roles/iam.serviceAccountTokenCreator
SCOPE = PROJECT
```

The exact email matches the Firebase Admin SDK service-account naming pattern,
not merely a display name. Firebase documents that an Admin SDK service account
is automatically created when Firebase is added to a project, but that fact does
not establish the origin or necessity of this account's project-level Token
Creator binding. See [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).

## 3. Repository-wide match classification

Two independent searches covered source, tests, scripts, docs, configuration,
environment templates, lockfiles, legacy/backup docs, and Git history.

| Evidence | File and symbol | Classification | Reachability and purpose | Token Creator relevance |
| --- | --- | --- | --- | --- |
| ID-token verification | `functions/src/auth/verifiedActor.ts:74-88`, `verifyActorFromRequest` | `ACTIVE_RUNTIME` source, currently Emulator/future only | verifies revoked ID token and loads user; not exported by current production entry | none; verification does not remotely sign or impersonate |
| Auth account management | `functions/src/accounts/trustedAuthAdmin.ts:45-52`, `createTrustedAuthAdmin` | `ACTIVE_RUNTIME` source, currently Emulator/future only | get/update/disable, revoke refresh tokens, delete user | none of these calls requires custom-token signing by design |
| Auth and Firestore Admin initialization | `functions/src/runtime/adminApp.ts:19-56`; `adminFirestore.ts:37-67` | `ACTIVE_RUNTIME` source, Emulator-gated | initializes Admin SDK with project context | initialization alone is not Token Creator evidence |
| Emulator Auth operations | `functions/test/*.integration.ts` | `TEST_ONLY` | create/get/update/delete users in Auth Emulator | no production identity or remote signing |
| Authority audit impersonation | `tools/authority-audit/runProductionInventory.mjs:48-79` | `BUILD_TOOLING` | `GoogleAuth` source client impersonates the dedicated audit SA | relevant to future Stage-1 caller, not dependent on Firebase Admin SDK SA |
| Exact generated-key filename | `scripts/audit-workspace-integrity.mjs:8`; `audit-user-auth-data.mjs:8` | `LEGACY` / `BUILD_TOOLING` | optional local key-file credential for manual audits | private-key credential signs locally; no `signBlob` call found |
| Generic Admin credential scripts | `set-system-owner.mjs`, `initialize-firebase-schema.mjs`, `reset-firebase-test-data.mjs`, `delete-non-owner-accounts.mjs` | `BUILD_TOOLING` | manual scripts accept arbitrary service-account JSON or ADC | no custom-token/sign/impersonation operation found |
| Key exclusions | `.gitignore`, `.dockerignore`, `functions/.gitignore` | `BUILD_TOOLING` safety | prevents Firebase Admin key artifacts from source/build contexts | confirms historical key handling, not role dependency |
| Key setup instructions | `docs/firebase-production-setup.md`; archived handoff docs | `DOCUMENTATION_ONLY` | manual local Admin SDK setup | no project-level Token Creator requirement specified |
| Client Google login | `app.js`, `services/authService.js`, `src/auth/AuthProvider.tsx` | `ACTIVE_RUNTIME` client | Firebase client `GoogleAuthProvider` sign-in | unrelated to Admin SDK service-account signing |
| `google-auth-library` lockfile entries | root/functions/tool lockfiles | `BUILD_TOOLING` dependency metadata | transitive/direct package inventory | dependency presence alone proves no invocation |

No current repository file calls `createCustomToken`, `createSessionCookie`,
`verifySessionCookie`, `setCustomUserClaims`, `signBlob`, `signJwt`, `signBytes`,
or an IAM Credentials endpoint from the Firebase Admin SDK path.

## 4. Firebase Admin SDK module inventory

| Module | Local use | Current production reachability | Signing requirement |
| --- | --- | --- | --- |
| `firebase-admin/app` | initialize Admin app with project ID | only health export; Emulator guard rejects production mode/project | none by itself |
| `firebase-admin/auth` | verify ID token, get/update/delete users, revoke refresh tokens | core modules are not current production exports | no custom-token signing call exists |
| `firebase-admin/firestore` | trusted repositories and Emulator integration | operation modules not current production exports | Firestore access is not service-account impersonation evidence |
| `firebase-admin/storage` | no import found | none | not applicable |
| `firebase-admin/messaging` | no import found | none | not applicable |

The current Functions entry exports only `trustedBackendHealth`. It initializes
the Admin app through an Emulator-only guard and performs no Auth token creation.
The static production-export test requires that sole export.

## 5. Runtime identity inventory

| Runtime | Local configured service account | Documented default if deployed | Local evidence | Confidence | Token-signing relevance |
| --- | --- | --- | --- | --- | --- |
| Cloud Functions v2 source | none | project-number Compute Engine default SA | `functions/src/health/trustedBackendHealth.ts`; no `serviceAccount` option | high locally | remote signing only if custom-token code is later added |
| Cloud Functions v1 | none; no v1 export/config | App Engine default SA | no v1 source or deployment target | high locally | none currently |
| Firebase Hosting | none; static client | none | `firebase.json` contains Hosting and Firestore only | high | none |
| Docker main/admin | none; Vite/static local development | local process identity | `compose.dev.yaml`, `Dockerfile.dev` | high | none |
| Cloud Run | none | Compute Engine default unless explicitly replaced | no service YAML or deployment script | medium for local absence | unknown external state; no local signing path |
| App Engine | none | App Engine default SA | no `app.yaml` | high for local absence | none locally |
| Firebase App Hosting | none | dedicated `firebase-app-hosting-compute@...` default SA | no App Hosting config | high for local absence | none locally |
| Local Admin scripts | optional key JSON or ADC | operator-selected credential | root package scripts and setup docs | high | key-based signing would be local; no custom-token call |
| Authority inventory tool | caller ADC to dedicated audit SA | none | explicit `Impersonated` client | high | intentionally unrelated to Firebase Admin SDK SA |

Official runtime contracts use different defaults: Functions v2 uses the
Compute default service account, Functions v1 uses the App Engine default
account, Cloud Run defaults to the Compute account, and App Hosting creates a
dedicated App Hosting account. See [Functions service accounts](https://firebase.google.com/docs/functions/manage-functions),
[Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity),
and [App Hosting architecture](https://firebase.google.com/docs/app-hosting/about-app-hosting).

The carried project baseline says deployed Functions count was previously
verified as `0`; B3A does not requery production and records that as historical,
not current live proof.

```text
CURRENT_DEPLOYED_FUNCTIONS = 0 (carried prior evidence; not reverified)
FUTURE_PLANNED_FUNCTIONS = v2 Emulator-only source present
LOCAL_RUNTIME_SERVICE_ACCOUNT_OVERRIDE = none
```

## 6. Exact principal references

The exact service-account email appears in B2/B3 security documents only. A
generated key filename consistent with the same Firebase Admin SDK account
family appears in two legacy/manual audit scripts and ignore rules. No runtime
configuration names the exact email as a Functions, Cloud Run, App Engine, or
App Hosting service identity.

```text
FIREBASE_ADMIN_SA_DIRECT_RUNTIME_REFERENCE = no
FIREBASE_ADMIN_SA_DIRECT_LOCAL_TOOLING_ARTIFACT_REFERENCE = yes
FIREBASE_ADMIN_SA_DIRECT_SIGNING_REFERENCE = no
FIREBASE_ADMIN_SA_DIRECT_IMPERSONATION_REFERENCE = no

CREATE_CUSTOM_TOKEN_ACTIVE_RUNTIME = no
SIGN_BLOB_ACTIVE_RUNTIME = no
SIGN_JWT_ACTIVE_RUNTIME = no
GENERATE_ACCESS_TOKEN_ACTIVE_RUNTIME = no
```

## 7. Authoritative signing contract

Firebase supports custom-token creation with a service-account key or remote
signing in Google-managed environments. Remote signing requires the runtime
caller to have `iam.serviceAccounts.signBlob` on the selected signing account;
Firebase's troubleshooting guidance points to Token Creator for that use case.
The local project does not call `createCustomToken` or configure
`serviceAccountId`. See [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

The predefined Token Creator role also permits access-token generation, OIDC
tokens, blob/JWT signing, and delegation. Google recommends granting
impersonation roles on the target service account where possible. See
[service-account authentication roles](https://docs.cloud.google.com/iam/docs/service-account-permissions)
and [direct short-lived credentials](https://docs.cloud.google.com/iam/docs/create-short-lived-credentials-direct).

```text
ADMIN_SDK_CUSTOM_TOKEN_SIGNING = SUPPORTED_PLATFORM_USE_CASE
ADMIN_SDK_CUSTOM_TOKEN_SIGNING_LOCAL_USE = no
GOOGLE_MANAGED_RUNTIME_REMOTE_SIGNING = POSSIBLE
GOOGLE_MANAGED_RUNTIME_REMOTE_SIGNING_LOCAL_EVIDENCE = none
FIREBASE_MANAGED_INTERNAL_REQUIREMENT = NOT_DOCUMENTED
BINDING_ORIGIN_CLASSIFICATION = NOT_ESTABLISHED
```

Official documentation establishes automatic creation of the Admin SDK service
account, but the reviewed documentation does not establish project-wide Token
Creator on that account as a universal Firebase default. It also does not prove
the binding was manually added. Origin therefore remains unresolved.

## 8. Transitive Stage-1 risk

Once the audit SA receives `datastore.entities.list`, the existing project-level
Token Creator binding creates this policy path:

```text
firebase-adminsdk-fbsvc service account
  -> project-level roles/iam.serviceAccountTokenCreator
  -> impersonate myweb-authority-audit-reader
  -> datastore.entities.list
```

The graph exists regardless of whether MY WEB currently exercises it. This is a
real lateral-movement path, not merely a naming concern.

B2 intentionally minimized its project-policy output and did not retain all
project roles of the Firebase Admin SDK service account. Local files cannot
prove its current effective Firestore/Datastore privileges. Therefore they
cannot establish whether the audit role would add a materially new data
capability or merely duplicate broader existing access.

```text
FIREBASE_ADMIN_SA_EFFECTIVE_PROJECT_PRIVILEGES = UNRESOLVED
TRANSITIVE_STAGE1_ACCESS_RISK = PRESENT
TRANSITIVE_RISK_SEVERITY = STRUCTURAL_RISK_PRESENT; MATERIAL_INCREMENT_UNRESOLVED
WOULD_AUDIT_SA_DATA_ROLE_CREATE_NEW_EFFECTIVE_DATA_CAPABILITY_FOR_EXISTING_FIREBASE_ADMIN_SA = UNRESOLVED
```

The Firebase Admin SDK account is privileged by purpose, but that does not make
project-wide lateral impersonation acceptable by default. Conversely, repository
absence alone is insufficient evidence for removing the binding.

## 9. Binding disposition

| Option | Local conclusion |
| --- | --- |
| `KEEP_EXISTING_PROJECT_TOKEN_CREATOR` | possible only after current privileges and actual dependency are known or risk is explicitly accepted |
| `RESOURCE_SCOPE_IT` | structurally preferred if exact caller/target signing relationships are identified; requires separate mutation and rollback approval |
| `REMOVE_EXISTING_BINDING` | not supported; `NO_LOCAL_EVIDENCE` is insufficient |
| `KEEP_PENDING_FUTURE_RUNTIME_MIGRATION` | viable temporary posture, but does not close Stage-1 transitive access risk |

```text
FIREBASE_ADMIN_TOKEN_CREATOR_DEPENDENCY = NO_LOCAL_EVIDENCE
EXISTING_BROAD_BINDING_DISPOSITION = KEEP_PENDING_DEPENDENCY_REVIEW
EXISTING_BROAD_BINDING_STAGE1_STATUS = BLOCK_STAGE1_PENDING_LIVE_DEPENDENCY_VERIFICATION
NEXT_LIVE_VERIFICATION_REQUIRED = yes
```

No binding is changed or marked for immediate removal.

## 10. Minimum next live verification package

Recommended next package:

**P1.5-C2H2B3A1 - Firebase Admin Token-Creator Minimum Live Dependency
Verification Approval Gate**

It must be a design/approval gate first. A later explicitly approved execution
should be staged and stop as soon as the central question is resolved:

1. **One project IAM policy read**, filtered immediately to the exact Firebase
   Admin SDK service-account member, to enumerate its current direct project
   roles and determine whether it already has `datastore.entities.list` or
   broader Firestore/Datastore access.
2. **One bounded Cloud Audit Logs read only if needed**, limited to the exact
   principal, IAM Credentials methods `SignBlob`, `SignJwt`, and
   `GenerateAccessToken`, a short explicitly approved time window, a small result
   cap, and metadata-only output. First verify that relevant Data Access logging
   is available; absence of events is not proof of non-use.
3. **Targeted workload metadata only if roles/logs leave dependency unresolved**,
   limited to Functions, Cloud Run, App Engine, and Firebase App Hosting service
   identity fields. Do not perform a general project resource inventory.

The package must not read Firestore, generate a token, impersonate any account,
read service-account keys, mutate IAM, or export broad logs. It must report each
logical metadata/log call separately.

## 11. Local C2H2 mismatch review

The three carried mismatches concern operational-versus-canonical student and
subject terminology and weak subject provenance/bootstrap behavior:

- `LCM-1`: student roster source terminology;
- `LCM-2`: operational subject rows called canonical;
- `LCM-3`: local/default subject merge and bootstrap provenance.

None concerns runtime identity, Firebase Admin SDK, token signing, IAM, or the
existing Token Creator binding. No mismatch is changed.

## 12. Required result values

```text
EXISTING_PROJECT_TOKEN_CREATOR_PRINCIPAL = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
PRINCIPAL_TYPE = FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT

FIREBASE_ADMIN_SA_DIRECT_RUNTIME_REFERENCE = no
FIREBASE_ADMIN_SA_DIRECT_SIGNING_REFERENCE = no
FIREBASE_ADMIN_SA_DIRECT_IMPERSONATION_REFERENCE = no

CREATE_CUSTOM_TOKEN_ACTIVE_RUNTIME = no
SIGN_BLOB_ACTIVE_RUNTIME = no
SIGN_JWT_ACTIVE_RUNTIME = no
GENERATE_ACCESS_TOKEN_ACTIVE_RUNTIME = no

FIREBASE_ADMIN_TOKEN_CREATOR_DEPENDENCY = NO_LOCAL_EVIDENCE
BINDING_ORIGIN_CLASSIFICATION = NOT_ESTABLISHED
FIREBASE_ADMIN_SA_EFFECTIVE_PROJECT_PRIVILEGES = UNRESOLVED
TRANSITIVE_STAGE1_ACCESS_RISK = PRESENT
WOULD_AUDIT_SA_DATA_ROLE_CREATE_NEW_EFFECTIVE_DATA_CAPABILITY_FOR_EXISTING_FIREBASE_ADMIN_SA = UNRESOLVED

EXISTING_BROAD_BINDING_DISPOSITION = KEEP_PENDING_DEPENDENCY_REVIEW
EXISTING_BROAD_BINDING_STAGE1_STATUS = BLOCK_STAGE1_PENDING_LIVE_DEPENDENCY_VERIFICATION
NEXT_LIVE_VERIFICATION_REQUIRED = yes
```

## 13. Safety accounting

```text
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## 14. Verdict

**`P1_5_C2H2B3A_NEEDS_LIVE_VERIFICATION`**

Local evidence is sufficient to reject automatic removal and to confirm the
transitive policy path, but insufficient to decide material authority increase,
binding dependency, or safe narrowing. Stage 1 remains blocked until the
minimum, separately approved verification package resolves those questions.
