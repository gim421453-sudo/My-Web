# G2B M3 Provider / Process Root-Cause Diagnostic Approval

This packet is local preparation only. It is not approval and performs no
remote operation.

STAGE=P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PROVIDER-PROCESS-ROOT-CAUSE-DIAGNOSTIC
TYPE=M3_PROVIDER_PROCESS_ROOT_CAUSE_DIAGNOSTIC
M3_OPERATION_GENERATION=ac1c8343-5837-4a75-ad55-c93ac320f937
CURRENT_G2B_M3_STATE=CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION
RECOVERY_EXECUTION_EVIDENCE_SHA256=0db8f9d3d6307cd519b0cc4c2fc0ef955287bd83009bf0b8cd9c4b6fc96fe74e
RECOVERY_RESULT_DOCUMENT_SHA256=8998bc5f40f4a42730c1c119639ed43a2e884425f9f1396ab85cd824b868750d
LOCAL_DIAGNOSTIC_SHA256=23e4d5346336b2d3332b3817fa28f4663349d35bd63854379fc4b15c0e7482a9
DIAGNOSTIC_APPROVAL_PACKET_SHA256=50b4048f545d8c7a3b1c9d2ea342720b37e9172fa68f3c6b70f5481d5a8284e8
PACKET_HASH_SCOPE=CANONICAL_SORTED_JSON_WITH_SELF_HASH_FIELD_EXCLUDED

## Local Finding

The exact G2B target-role binding is absent after the consumed mutation
attempt. The current command builder targets the exact G2B writer, uses the
exact token-creator role and `--condition=None`, and the Windows process
adapter has no shell fallback or retry.

The consumed execution persisted no mutation exit code, timeout category,
safe error identifier, stdout, or stderr. Therefore the exact provider/process
failure cannot be reconstructed offline. Permission denial, provider command
rejection, and process transport/timeout remain hypotheses, not findings.

ROOT_CAUSE_RESULT=EXACT_PROVIDER_PROCESS_FAILURE_NOT_ESTABLISHED_FROM_PERSISTED_EVIDENCE

## Proposed Separately Approved Surface

PURPOSE=distinguish caller authorization failure from the bounded provider/process path without repeating M3
OP_A_MAX=1
WRITER_IAM_POLICY_READS_MAX=0
PROJECT_IAM_READS_MAX=0
TEST_IAM_PERMISSIONS_CALLS_MAX=1
EXACT_PERMISSION_UNDER_TEST=iam.serviceAccounts.setIamPolicy
MUTATIONS_MAX=0
M3_MUTATIONS_MAX=0
M4_MUTATIONS_MAX=0
RETRIES=0
ROLLBACKS=0
SECOND_MUTATION_ALLOWED=no
FIRESTORE_ALLOWED=no
ACCESS_TOKEN_ALLOWED=no
CLOUD_LOGGING_ALLOWED=no
SERVICE_ACCOUNT_KEY_ALLOWED=no
APPROVAL_CONSUMPTION_POINT=WHEN_FIRST_SEPARATELY_APPROVED_REMOTE_DIAGNOSTIC_CALL_BEGINS
SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no

No command described above may run until a new explicit approval binds the
packet and its exact current hashes.
