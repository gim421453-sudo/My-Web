# P1.5-C2H2B3C2 Project Token Creator Controlled Removal

## 1. Scope and baseline

This package used the explicit C2 approval to remove exactly one direct,
unconditional, project-level IAM binding member. No Stage-1 audit-SA change,
Firestore access, token/signing call, impersonation, deployment, code change,
or repository staging occurred.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 139
STAGING = 0

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
TARGET_MEMBER = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
TARGET_ROLE = roles/iam.serviceAccountTokenCreator
TARGET_SCOPE = PROJECT
```

## 2. Before-state gates

The approved existing gcloud environment completed the minimum identity and
project-policy reads. The full policy was retained only in process memory;
this document stores no unrelated policy or principal data.

```text
OBSERVED_AT = 2026-08-22T12:29:07.4318842Z
PROJECT_ID_VERIFIED = yes
PROJECT_NUMBER_VERIFIED = yes
PRE_STATE_IAM_READS = 1
TARGET_BINDING_PRESENT_BEFORE = yes
TARGET_BINDING_CONDITIONAL = no
STATE_DRIFT_DETECTED = no
PREEXISTING_ROLE_STATE_DRIFT = no
FIREBASE_ADMIN_SA_DIRECT_ROLE_COUNT_BEFORE = 3
OTHER_TARGET_ROLE_MEMBER_COUNT_BEFORE = 0
OTHER_TARGET_ROLE_MEMBER_SET_FINGERPRINT_BEFORE = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
AUDIT_SA_DIRECT_ROLE_COUNT_BEFORE = 0
AUDIT_SA_ROLE_SET_FINGERPRINT_BEFORE = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

The expected Firebase SDK Admin Service Agent and Firebase Authentication
Admin roles were both present before removal.

## 3. Exact primary mutation

```text
PRIMARY_IAM_MUTATION_ATTEMPTS = 1
PRIMARY_IAM_MUTATION_RESULT = APPLIED
MUTATION_STARTED_AT = 2026-08-22T12:29:20.3110498Z
MUTATION_COMPLETED_AT = 2026-08-22T12:29:22.5420574Z
```

The only mutation was removal of the exact target member from the exact target
role at the exact project scope. No replacement binding was added.

## 4. After-state verification

One approved post-mutation project-policy read completed. Its policy was also
processed only in memory.

```text
OBSERVED_AT = 2026-08-22T12:29:57.4947752Z
POST_STATE_IAM_READS = 1
TARGET_BINDING_PRESENT_AFTER = no
FIREBASE_SDK_ADMIN_SERVICE_AGENT_ROLE_PRESERVED = yes
FIREBASEAUTH_ADMIN_ROLE_PRESERVED = yes
UNEXPECTED_TARGET_PRINCIPAL_ROLE_DELTA_COUNT = 0

OTHER_TARGET_ROLE_MEMBER_COUNT_AFTER = 0
OTHER_TARGET_ROLE_MEMBER_SET_FINGERPRINT_AFTER = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
OTHER_TARGET_ROLE_MEMBERS_PRESERVED = yes
TARGET_ROLE_EMPTY_BINDING_CLEANUP = accepted

AUDIT_SA_DIRECT_ROLE_COUNT_AFTER = 0
AUDIT_SA_ROLE_SET_FINGERPRINT_AFTER = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
AUDIT_SA_IAM_CHANGE_COUNT = 0
```

The target role had no members other than the removed member before the
operation. The CLI therefore removed the now-empty binding. Preservation is
compared as the set of other members, not as the presence of an empty binding;
both sets were empty. This is the approved normal empty-binding cleanup, not a
post-mutation anomaly.

## 5. Result and rollback

```text
PROJECT_WIDE_FIREBASE_ADMIN_TOKEN_CREATOR = absent
TRANSITIVE_FIREBASE_ADMIN_TO_AUDIT_SA_PATH = closed_at_project_token_creator_edge

ROLLBACK_TRIGGERED = no
ROLLBACK_EXECUTED = no
ROLLBACK_RESULT = NOT_REQUIRED
ROLLBACK_IAM_MUTATIONS = 0
ROLLBACK_VERIFICATION_IAM_READS = 0

SAFE_TO_GRANT_AUDIT_DATA_ROLE_NOW = pending next IAM approval package
STAGE1_EXECUTION_AUTHORIZED = no
```

No immediate credible regression or unexpected IAM state requiring exact
restoration was observed during this controlled execution window. No synthetic
functional probe was performed.

## 6. Safety accounting

```text
PRE_STATE_IAM_READS = 1
PRIMARY_IAM_MUTATIONS = 1
POST_STATE_IAM_READS = 1
ROLLBACK_IAM_MUTATIONS = 0
ROLLBACK_VERIFICATION_IAM_READS = 0

FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
SERVICE_ACCOUNT_KEY_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No artifact contains access tokens, private keys, JSON service-account
credentials, JWTs, signatures, a raw IAM policy, or an unrelated-principal
dump.

## 7. Next boundary

The controlled removal is complete, but Stage 1 is still not authorized. The
next safe package is `P1.5-C2H2B4 STAGE-1 IAM MINIMAL MUTATION APPROVAL GATE`.
It may design, but not execute without new explicit approval, the separate
custom role, audit-SA binding, and exact caller-to-audit-SA resource binding.
It must not run ListCollectionIds.

## 8. Verdict

`P1_5_C2H2B3C2_TOKEN_CREATOR_CONTROLLED_REMOVAL_PASS`

