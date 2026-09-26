# G2B M3 Root Cause Analysis and Next-Operation Decision

This is a local source/evidence audit. It performed no new IAM read, IAM
mutation, Firestore call, token call, Logging query, `testIamPermissions` call,
deploy, staging, commit, or push.

## Result

M3_ROOT_CAUSE_RESULT=LOCAL_ROOT_CAUSE_PROVEN_TARGET_SURFACE_MISMATCH
TARGET_RESOURCE_DEFECT=PROVEN
COMMAND_CONSTRUCTION_DEFECT=PROVEN
MUTATION_AND_RECOVERY_SAME_AUTHORITY_SURFACE=no
PRESTATE_AND_MUTATION_SAME_AUTHORITY_SURFACE=yes_but_wrong_legacy_target
ROLE_DEFECT=NOT_SUPPORTED
MEMBER_CONSTRUCTION_DEFECT=NOT_SUPPORTED
AUTHORIZATION_STATE=UNPROVEN
PROCESS_SPAWN_DEFECT=NOT_SUPPORTED_BY_LOCAL_SOURCE
PROCESS_TIMEOUT_OR_TERMINATION_DEFECT=UNRESOLVED_FROM_PERSISTED_EVIDENCE
CLASSIFIER_OBSERVABILITY_GAP=PROVEN
THIRD_M3_OPERATION_GENERATION_ALLOCATED=yes_local_only
THIRD_M3_MUTATION_REACHABLE=no_without_new_approval
M4_ALLOWED=no

The local fix is narrow: the current G2B executor now calls explicit
G2B-target command builders. The legacy generic builders retain their old
target for historical callers and are not reachable from the current G2B
executor.

## Preserved Histories

| history | local evidence | persisted facts | target-surface conclusion |
|---|---|---|---|
| earlier execution | `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-m3-r3-live-execution-v1.json` | one mutation, `UNKNOWN_NONZERO`, poststate not run; the evidence does not persist the exact target or process result | exact target relation is UNKNOWN from this artifact alone |
| current G2B execution | `docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-current-bound-live-result-v1.md` and its approval packet | G2B target was declared; one prestate, one mutation, indeterminate result; recovery later confirmed `MEMBER_ABSENT_CONFIRMED` | current executor source proves prestate and mutation used the legacy target while recovery used G2B |

The latest recovery artifacts are preserved and re-hashed without changing
their historical contents:

LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256=6cc8123cd11ba84c9fb4d4026f8c5f47c065f344c8ba648ec71414cd2b4a83d3
LATEST_RECOVERY_RESULT_DOCUMENT_SHA256=b156e2700bf1a7c5ea680ce44d10b8fd9344cfbe5dc898a44614964d35bbf77f
LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256=83f45eacb03f2b98d00a34413ddd71174532e30385f7f9c843b2c301fca28cc3
LATEST_RECOVERY_PRIVACY_EVIDENCE_SHA256=1c4acb8634f0eb805c29d9a7dca22a6c887bb36181127d10e8f5a96d482451f6

## Local Proof

| source | proof |
|---|---|
| `tools/authority-audit/m3RuntimeCommandGraph.mjs:16` | legacy `WRITER_SERVICE_ACCOUNT` is the old writer |
| `tools/authority-audit/m3RuntimeCommandGraph.mjs:119-121` | legacy policy-read builder hard-codes the old writer |
| `tools/authority-audit/m3RuntimeCommandGraph.mjs:131-138` | legacy mutation builder hard-codes the old writer and the exact token-creator role |
| `tools/authority-audit/g2bM3CurrentLiveExecutor.mjs:3-7,150-163` before the fix | current G2B prestate, mutation, and poststate called those legacy builders |
| `tools/authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs:95` | recovery policy read uses its record target, which is the G2B target |
| `tools/authority-audit/g2bRecoveryAnchor.mjs:8-9` | G2B target and role are explicit and stable |
| `tools/authority-audit/m3RuntimeCommandGraph.mjs:72-88` | one identity context constructs the exact member used by the command builders and anchor flow |
| `tools/authority-audit/windowsGcloudProcessAdapter.mjs:96-153` | process execution is bounded, captures exit/timing/stdout/stderr, and has no shell fallback or retry |
| `tools/authority-audit/m3RuntimeCommandGraph.mjs:488-558` | nonzero outcomes are conservatively projected to `UNKNOWN_NONZERO`/safe error identifiers |
| `tools/authority-audit/g2bM3CurrentLiveExecutor.mjs:152-159` | current live executor retains only the boolean mutation result, so provider semantics are not persisted |

The installed local Cloud SDK wrapper was inspected at
`C:\Users\USER\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`.
Local SDK source inspection found the IAM v1 `setIamPolicy` client method; no
SDK command was executed and no network result was used. The local source
therefore proves the target argument mismatch, but does not prove a provider
permission error or a successful/failed remote mutation.

## Fix and Re-attestation

Changed local execution code:

- `tools/authority-audit/m3RuntimeCommandGraph.mjs`: added explicit
  `buildPinnedG2BWriterPolicyReadCommand` and
  `buildPinnedG2BWriterBindingMutationCommand`; legacy builders remain intact.
- `tools/authority-audit/g2bM3CurrentLiveExecutor.mjs`: switched only the
  current G2B prestate, mutation, and poststate calls to those builders.
- `tools/authority-audit/g2bM3CurrentLiveAttestation.mjs`: allows the local
  fresh operation generation to participate in a new graph identity while
  preserving the historical default.
- `tools/authority-audit/g2bM3RootCauseFixedApprovalPacket.mjs`: creates a
  fresh, local-only re-attestation and approval packet with no execution.

Local evidence files:

- `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-root-cause-fixed-implementation-attestation-v1.json`
- `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-root-cause-fixed-runtime-capability-attestation-v1.json`
- `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-root-cause-fixed-final-execution-composite-v1.json`
- `docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-root-cause-fixed-approval-packet.md`

The new packet is not authorization. It requires a separate explicit approval,
one fresh prestate, at most one mutation, and no retry/rollback/second
mutation/M4. Its `SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no` lock is intentional.

## Local Test Contract

The fake executor tests assert that all current G2B policy reads and the
mutation use the G2B target, never the legacy target, and retain the exact
`roles/iam.serviceAccountTokenCreator` role. The attestation test retains the
historical v1 packet as immutable context; the new root-cause-fixed test
verifies the fresh local packet and all four recovery evidence hashes.

REMOTE_IAM_READS_THIS_TASK=0
REMOTE_IAM_MUTATIONS_THIS_TASK=0
FIRESTORE_CALLS_THIS_TASK=0
ACCESS_TOKEN_CALLS_THIS_TASK=0
CLOUD_LOGGING_READS_THIS_TASK=0
TEST_IAM_PERMISSIONS_CALLS_THIS_TASK=0
SERVICE_ACCOUNT_KEY_OPERATIONS_THIS_TASK=0

FINAL_DECISION=PASS_AFTER_PROVEN_LOCAL_FIX_NEW_APPROVAL_REQUIRED
