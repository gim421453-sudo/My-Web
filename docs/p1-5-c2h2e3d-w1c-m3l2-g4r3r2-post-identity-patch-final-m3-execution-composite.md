# P1.5-C2H2E3D-W1C-M3L2-G4R3R2

## Final verdict

`FINAL_VERDICT=P1_5_C2H2E3D_W1C_M3L2_G4R3R2_POST_IDENTITY_PATCH_FINAL_EXECUTION_COMPOSITE_PASS_M3L3_APPROVAL_ELIGIBLE`

`POST_IDENTITY_PATCH_FINAL_EXECUTION_COMPOSITE=LOCKED`

`M3L3_APPROVAL_ELIGIBLE=yes`

`M3L3_LIVE_APPROVAL=NOT_GRANTED`

`M4_APPROVAL=NOT_GRANTED`

This is a local-only final composite. It authorizes no gcloud, IAM, M3, M4, Firestore, token, key, Cloud Logging, push, or deployment operation.

## Authority chain

- `F1_ATTESTATION_MATCH=yes`
- `G4R3H_R2_VERDICT=P1_5_C2H2E3D_W1C_M3L2_G4R3H_R2_CURRENT_STATE_SUPERSEDING_ATTESTATION_PASS_G4R3R1_ELIGIBLE`
- `G4R3H_R2_ATTESTATION_EXPECTED=dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc`
- `G4R3H_R2_ATTESTATION_MATCH=yes`
- `G4R3H_R2_RESULT_EXPECTED=dc7650788218f7aae178f8d657c81bc816a4848e4061e0364aa0c99b34b911e1`
- `G4R3H_R2_RESULT_MATCH=yes`
- `G4R3R1_VERDICT=P1_5_C2H2E3D_W1C_M3L2_G4R3R1_POST_IDENTITY_PATCH_RUNTIME_CAPABILITY_REATTESTATION_PASS_G4R3R2_REQUIRED`
- `G4R3R1_ATTESTATION_EXPECTED=82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9`
- `G4R3R1_ATTESTATION_MATCH=yes`
- `G4R3R1_RESULT_EXPECTED=11bcb124f12500805da2f8b2937c1456caf10e0ec9bab3fbf63e6bbd911278b7`
- `G4R3R1_RESULT_MATCH=yes`

Historical G4R3H generation 1, G4R1, and G4R2 are not current execution authority. Current authority is exactly `G4R3H-R2 -> G4R3R1 -> G4R3R2`.

## Composite identity

- `M3_M3L2_G4R3R2_POST_IDENTITY_PATCH_FINAL_EXECUTION_COMPOSITE_SHA256=1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195`
- `SECOND_G4R3R2_COMPOSITE_SHA256=1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195`
- `G4R3R2_COMPOSITE_REPRODUCIBLE=yes`
- `CANONICAL_PAYLOAD_SCHEMA=myweb.m3l2.g4r3r2.post-identity-patch-final-execution-composite.v1`
- `CANONICAL_PAYLOAD_PATH=docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-execution-composite-v1.json`
- `CANONICALIZER_VERIFIER=tools/authority-audit/g4r3r2PostIdentityPatchFinalM3ExecutionComposite.mjs`

## Current locks and graph

- `UNIQUE_REPOSITORY_LOCK_COUNT=26`
- `UNIQUE_SDK_LOCK_COUNT=15`
- `UNIQUE_TOTAL_LOCK_COUNT=41`
- `ALL_CURRENT_REPOSITORY_LOCKS_MATCH=yes`
- `ALL_CURRENT_SDK_LOCKS_MATCH=yes`
- `SDK_VERSION=580.0.0`
- `SDK_PATH_CONTAINMENT=PASS`
- `EXTERNAL_CAPABILITY_COUNT=15`
- `EXTERNAL_CAPABILITY_BOUND=15`
- `EXTERNAL_CAPABILITY_UNBOUND=0`
- `CURRENT_GRAPH_NODE_COUNT=9`
- `CURRENT_EXECUTION_EDGE_COUNT=8`
- `CURRENT_PREDECESSOR_METADATA_EDGE_COUNT=7`
- `CURRENT_GRAPH_IDENTITY=db970e486979b1a82b4245141236d534e2b754bd345c2dc0c913e02232d5a424`
- `CURRENT_GRAPH_IDENTITY_MATCH=yes`

Execution edges and predecessor metadata edges remain separate classes. They are not reported as 15 execution edges.

## Identity and session contract

- `LEGACY_FINGERPRINT_M3_AUTHORIZATION_REACHABILITY=0`
- `OP_A_ROLE=BOOTSTRAP_DISCOVERY_ONLY`
- `OP_A_CARDINALITY=EXACTLY_ONE`
- `OP_A_CONFIG_ROOT_EQUALS_SESSION_CONFIG_ROOT=BY_CONSTRUCTION`
- `IDENTITY_CONTEXT_IMMUTABLE=yes`
- `EXACT_MEMBER_CONSTRUCTED_COUNT=1`
- `IAM_MEMBER_REDERIVATION_AFTER_CONTEXT=0`
- `SESSION_CHILD_ENV_SNAPSHOT_CREATED_ONCE=yes`
- `CONFIG_ROOT_PINNED_FOR_SESSION=yes`
- `SESSION_CONFIG_ROOT_RE_READ=no`
- `ACCOUNT_PINNED_OPERATIONS=[OP_B,OP_C_PRE,OP_D_PRE,OP_E,OP_C_POST,OP_D_POST]`
- `ACCESS_TOKEN_ARGV_OVERRIDE_REACHABLE=no`
- `ACCESS_TOKEN_ENV_OVERRIDE_REACHABLE=no`
- `CREDENTIAL_FILE_OVERRIDE_REACHABLE=no`
- `IMPERSONATION_ARGV_REACHABLE=no`
- `IMPERSONATION_ENV_OVERRIDE_REACHABLE=no`
- `FLAGS_FILE_REACHABLE=no`
- `WINDOWS_ADAPTER_SECURITY=PASS`
- `ARGUMENT_ARRAY_BOUNDARY=PASS`
- `UNPINNED_AUTH_RETRY_REACHABLE=no`

## Prestate, mutation, and classifier

- `M3L3_FRESH_PRESTATE_REQUIRED=yes`
- `R1B4_STATE_REUSABLE_AS_M3L3_FRESH_PRESTATE=no`
- `PRESTATE_RESULT_DOMAIN=[TARGET_MEMBER_PRESENT,TARGET_MEMBER_ABSENT,AMBIGUOUS,READ_FAILURE]`
- `PRESTATE_MEMBER_EQUALS_OP_E_MEMBER=BY_CONSTRUCTION`
- `PRESTATE_EFFECTIVE_CALLER_CONTEXT=SAME_SESSION_IDENTITY_CONTEXT`
- `OP_E_EFFECTIVE_CALLER_CONTEXT=SAME_SESSION_IDENTITY_CONTEXT`
- `OP_E_MUTATIONS_MAX=1`
- `OP_E_AUTOMATIC_RETRIES=0`
- `OP_E_AUTOMATIC_ROLLBACKS=0`
- `SECOND_OP_E_MUTATION_REACHABLE=no`
- `UNKNOWN_NONZERO_CLASSIFICATION=INDETERMINATE`
- `ERROR_PREFIX_V1_PROVES_REMOTE_NON_APPLICATION=no`
- `TIMEOUT_AFTER_MUTATION_START=INDETERMINATE`
- `UNKNOWN_MUTATION_RESULT_DEFAULT=INDETERMINATE`
- `OP_E_CONFIRMED_FAILURE_RULES=[]`
- `OP_E_PROCESS_SUCCESS_SEMANTICS=PROCESS_SUCCESS_PLUS_EXACT_POSTSTATE_PRESENT_CONFIRMED`

## Poststate decisions

- `M3L3_POSTSTATE_VERIFICATION_REQUIRED=yes`
- `POSTSTATE_RESULT_DOMAIN=[TARGET_MEMBER_PRESENT_CONFIRMED,TARGET_MEMBER_ABSENT,AMBIGUOUS,READ_FAILURE]`
- `INDETERMINATE_POSTSTATE_RECOVERY_MODE=SEPARATE_APPROVAL`
- `PREEXISTING_BINDING_ADOPTION_POLICY=REQUIRES_SEPARATE_GATE`

Current runtime returns success only after the exact writer-policy postcheck and bounded project-policy postcheck pass. A process-level OP-E success alone is not durable M3 completion. An indeterminate OP-E result returns before poststate, so no recovery read is implied by the consumed session. A preexisting exact binding currently enters the prestate safety stop rather than the success branch, so adoption is not silently inferred.

## Future live budget and approval consumption

- `OP_A_LIVE_BUDGET_CLASS=LOCAL_IDENTITY_DISCOVERY`
- `FUTURE_M3L3_LIVE_BUDGET={localIdentityDiscoveryMax:1,remoteIamPrestateReadsMax:5,iamMutationAttemptsMax:1,remoteIamPoststateReadsMax:2,retriesMax:0,cloudLoggingReadsMax:0,projectIamReadsMax:2,testIamPermissionsMax:0,accessTokenCallsMax:0,firestoreCallsMax:0,m4MutationsMax:0}`
- `M3L3_APPROVAL_CONSUMPTION_POINT=WHEN_FRESH_EXACT_PRESTATE_READ_BEGINS`
- `IDENTITY_CONTEXT_RESTART_RESUMABLE=no`
- `APPROVAL_SESSION_RESTARTABLE=no`

The five prestate reads are the two exact role reads, writer metadata read, writer-policy precheck, and project-policy precheck. The two poststate reads are the writer-policy and project-policy postchecks. The two bounded project IAM reads are already included in the prestate/poststate totals and are reported separately for transparency.

Crash after prestate but before mutation requires a new approval. Crash during OP-E is indeterminate with no retry or rollback. Crash after process success but before required poststate leaves M3 unconfirmed and requires a separately approved recovery read; it never permits a second mutation.

## Skipped-test policy

- `GCLOUD_VERSION_HELP_TEST_STATUS=NOT_RUN_BY_ZERO_GCLOUD_POLICY`
- `GCLOUD_VERSION_HELP_TEST_AUTHORITY_CLASS=NON_BLOCKING_BY_SOURCE_ATTESTATION`
- `SAFE_AUTHORITY_TEST_FILES_RUN=28`
- `SAFE_AUTHORITY_TEST_FILES_PASS=28`
- `POLICY_SKIPPED_TEST_FILES=[windowsGcloudProcessAdapter.test.mjs]`

The skipped test was not reported as PASS. Its relevant launcher boundary, SDK version/path containment, synthetic Windows process behavior, and 15 external capability sources are covered by current source locks and zero-gcloud-safe tests.

## Forbidden reachability and counters

- `M4_REACHABLE_FROM_G4R3R2=no`
- `FIRESTORE_REACHABLE=no`
- `ACCESS_TOKEN_GENERATION_REACHABLE=no`
- `WRITER_IMPERSONATION_REACHABLE=no`
- `SERVICE_ACCOUNT_KEY_ACCESS_REACHABLE=no`
- `CLOUD_LOGGING_REACHABLE=no`
- `PROJECT_IAM_MUTATION_REACHABLE=no`
- `CURRENT_M3_EFFECTIVE_STATE=ABSENT_PROVEN`
- `REAL_GCLOUD_EXECUTIONS=0`
- `LIVE_IAM_READS=0`
- `IAM_MUTATIONS=0`
- `M3_LIVE_MUTATIONS=0`
- `M4_MUTATIONS=0`
- `ACCESS_TOKEN_CALLS=0`
- `FIRESTORE_API_CALLS=0`
- `STAGING=0`
- `COMMIT=0`
- `PUSH=0`
- `DEPLOY=0`

No timestamp, raw identity, raw IAM member, raw account value, config-root value, credential material, raw IAM policy, raw process output, token, private key, or personal absolute path is persisted in the canonical payload.

## Next action

`RECOMMENDED_NEXT_ACTION=P1.5-C2H2E3D-W1C-M3L3_POST_IDENTITY_PATCH_COMPOSITE_LOCKED_EXPLICIT_LIVE_APPROVAL`

A new explicit approval is required before OP-A, fresh prestate, OP-E, poststate, or any other live operation.
