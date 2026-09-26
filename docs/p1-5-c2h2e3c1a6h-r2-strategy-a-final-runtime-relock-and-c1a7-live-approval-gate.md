# P1.5-C2H2E3C1A6H-R2 Strategy-A Final Runtime Relock

## Verdict

`P1_5_C2H2E3C1A6H_R2_FINAL_RELOCK_C1A7_APPROVAL_GATE_PASS`

This is a local, read-only relock. No gcloud process, active-caller
discovery, token generation, impersonation, Firestore, IAM, network, or
production operation was performed.

## Baseline and Safety

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Dirty count: `197`
- Staging: `0`
- CODE_FILES_CHANGED: `0`
- REAL_GCLOUD_PROCESS_SPAWN_COUNT: `0`
- LIVE_ACTIVE_CALLER_DISCOVERY_CALLS: `0`
- LIVE_ACCESS_TOKEN_CALLS: `0`
- LIVE_FIRESTORE_CALLS: `0`
- IAM_MUTATIONS: `0`
- Firebase writes, canonical writes, manifest persistence, Rules/Indexes
  changes, commit, push, and deploy: `0`

All pre-existing dirty and untracked files were preserved.

## Previous Evidence

- C1A6H:
  `P1_5_C2H2E3C1A6H_STRATEGY_A_NARROWER_SECURITY_IMPLEMENTATION_PASS`
- C1A6H-R1:
  `P1_5_C2H2E3C1A6H_R1_HOST_SAFE_TRANSPORT_REGRESSION_PASS`
- R1 recorded argument-boundary, exit-code, stdout/stderr separation, LF,
  and CRLF transport checks as `PASS`.
- R1 recorded empty-stderr-only acceptance and rejection of old warning,
  UNKNOWN stderr, and ERROR-like stderr.
- R1 explicitly recorded that real gcloud warning suppression was not proven
  by a real token command; that remains the separate C1A7 gate.

## C1A7 Entry Point and Runtime Graph

`C1A7_LIVE_ENTRYPOINT` =
`runC1A3CorrectedExactClassStateRead` in
`tools/authority-audit/c1a3ExactClassStateReadCaller.mjs`.

`C1A7_FINAL_RUNTIME_GRAPH`:

```text
runC1A3CorrectedExactClassStateRead
 -> validateExactClassReadContract (static identity and field-mask guard)
 -> discoverActiveCaller / expected fingerprint gate
 -> createImpersonatedAccessTokenProvider
 -> runWindowsProcess
 -> invokeWindowsExecutable.ps1
 -> local gcloud.cmd (external capability only; not executed in R2)
 -> bounded process result
 -> classifyImpersonatedTokenProcessResult
 -> analyzeStderrLines (diagnostic-only metadata)
 -> runExactClassStateReadOnce
 -> httpsGetBounded (node:https GET)
```

```text
STATIC_IDENTITY_GUARD_IN_GRAPH = yes
ACTIVE_CALLER_GATE_IN_GRAPH = yes
TOKEN_COMMAND_BUILDER_IN_GRAPH = yes
WINDOWS_ADAPTER_IN_GRAPH = yes
POWERSHELL_RUNNER_IN_GRAPH = yes
SECURITY_CLASSIFIER_IN_GRAPH = yes
DIAGNOSTIC_ANALYZER_IN_GRAPH = yes
TOKEN_PROVIDER_IN_GRAPH = yes
EXACT_EXECUTOR_IN_GRAPH = yes
HTTPS_TRANSPORT_IN_GRAPH = yes
HOST_TEST_HELPER_RUNTIME_DEPENDENCY = no
PRODUCTION_TOKEN_EXECUTABLE_OVERRIDE = none
```

The R1 synthetic helper is test-only. The production path has no caller,
environment, config, or test-helper executable override.

## Strategy-A Security Contract

The current token command builder and `C1A3_CALLER_CONTRACT.tokenCommand`
contain exactly five arguments, ending in `--verbosity=error`.

```text
VERBOSITY_FLAG_PRESENT = yes
VERBOSITY_FLAG_VALUE = error
VERBOSITY_FLAG_COUNT = 1
VERBOSITY_SECURITY_VALUE_RUNTIME_OVERRIDE = no
VERBOSITY_FLAG_POSITION_VALID_BY_LOCAL_SOURCE = yes
TOKEN_SUCCESS_SECURITY_CONTRACT =
  processStarted=true, exitCode=0, timedOut=false,
  valid bounded token stdout, stderr=EMPTY
SECURITY_ACCEPTED_STDERR_VARIANTS = EMPTY_ONLY
LEGACY_BENIGN_STDERR_ALLOWLIST_ACTIVE = no
OLD_BENIGN_WARNING_ACCEPTED = no
UNKNOWN_STDERR_ACCEPTED = no
ERROR_STDERR_ACCEPTED = no
ALL_NONEMPTY_STDERR_REJECTED = yes
NEWLY_ACCEPTED_UNKNOWN_STDERR_CASES = 0
CURRENT_SECURITY_SURFACE_NARROWER = yes
```

Timeout, nonzero exit, process-start failure, empty/malformed/multiline or
contaminated stdout are rejected. Diagnostic metadata cannot grant
acceptance:

```text
SECURITY_CLASSIFIER_SEPARATE_FROM_DIAGNOSTIC_ANALYZER = yes
DIAGNOSTIC_ANALYZER_CAN_OVERRIDE_SECURITY = no
RULE_ID_USED_FOR_ACCEPTANCE = no
TEMPLATE_ID_USED_FOR_ACCEPTANCE = no
FINGERPRINT_USED_FOR_ACCEPTANCE = no
```

The analyzer returns bounded categories, rule IDs, template IDs, and hashes;
it does not return raw process output, tokens, Authorization values, or
caller identity.

## External Capability Locks

These are local evidence locks only, not authority, IAM, an allowlist, or
dynamic runtime input. Only the previously reviewed minimum SDK files were
hashed:

```text
bin/gcloud.cmd                                      a1eccc60e26714cbff8c7f6a0aa8577a1f83073cdc33d80b671d0686f4ff2ef1
VERSION                                             3438cbff7b43185435735f5836141b180593ac7b15f332e2504d9922afe15897
lib/googlecloudsdk/core/properties.py               cf9cf38c0949f06c11a110675d4dbad647e3d4091901f6f3f734386cda7a32bb
lib/googlecloudsdk/core/log.py                      b503b94fbc53943de0ec4a7ca93bc02fa764d35553f658a92e93a38fd4427b3e
lib/googlecloudsdk/core/credentials/store.py        1fcb3b856eb1584491d6f6160983808ca1f3574e44de86f53ac8d86f882e2a6f
```

```text
C1A7_EXTERNAL_CAPABILITY_EVIDENCE_FILES = 5
LOCAL_SDK_SOURCE_READ_DURING_C1A7 = no
```

If any lock changes before C1A7, stop before active-caller discovery. Do not
auto-relock, generate a token, or run gcloud.

## Identity and Exact Read Contract

The executor validates project, database, workspace, class, plan, source
fingerprint, and exact field mask before caller discovery. The active-caller
gate requires one caller and the locked 12-hex fingerprint.

```text
RUNTIME_HASH_BEFORE_CALLER = yes
EXTERNAL_CAPABILITY_HASH_BEFORE_CALLER = yes
STATIC_IDENTITY_BEFORE_CALLER = yes
TOKEN_TARGET_SA_MATCH = yes
TOKEN_CALL_MAX_ENFORCED = yes
TOKEN_REJECTION_PREVENTS_FIRESTORE = yes
WRITE_CAPABILITY = none
QUERY_CAPABILITY = none
LIST_CAPABILITY = none
TARGET_RESOURCE_GUARD = PASS
FIELD_MASK_GUARD = PASS
GETDOCUMENT_MAX_ENFORCED = yes
RETRY_ZERO_ENFORCED = yes
AUTO_REDIRECT_DISABLED = yes
MAX_RESPONSE_BYTES = 65536
HTTP_TIMEOUT_MS = 10000
```

The exact resource and mask are locked in
`tools/authority-audit/exactClassStateRead.mjs`. It has one GET path, no
retry, no redirect following, no query/list/batch-get/list-collection
capability, and no write surface.

## Final Repository Runtime Locks

`C1A7_FINAL_RUNTIME_DEPENDENCIES`:

```text
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
tools/authority-audit/gcloudTokenOutputClassifier.mjs
tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs
tools/authority-audit/windowsGcloudProcessAdapter.mjs
tools/authority-audit/invokeWindowsExecutable.ps1
tools/authority-audit/exactClassStateRead.mjs
```

```text
C1A6H_R1_PROVISIONAL_HASHES_AVAILABLE = yes
C1A6H_R1_PROVISIONAL_VS_R2_CURRENT_MATCH = yes
C1A6H_R1_PROVISIONAL_VS_C1A7_FINAL_MATCH = yes

tools/authority-audit/c1a3ExactClassStateReadCaller.mjs  9b586a7c22661c728f6f3c0b2963430f73de5e90f2cac07c6452947f11851f18
tools/authority-audit/gcloudTokenOutputClassifier.mjs    26bc0a51fef813096b65f5f7c2d65832154b128583dd5be1d9aa3f7ceaad4613
tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs 660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656
tools/authority-audit/windowsGcloudProcessAdapter.mjs    512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
tools/authority-audit/invokeWindowsExecutable.ps1        2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
tools/authority-audit/exactClassStateRead.mjs            7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776
```

## Final Test Locks and Results

```text
tools/authority-audit-tests/c1a6H-R1HostSafeTransport.test.mjs       1cd1a9243d5e522d8389f14345761694b612b6dc4a47b63c121e9cc48987db99
tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs     c7c3f41eb2549de1862ade76c58e226d4baf71bf0bfb4ffeb57296e78b893e1e
tools/authority-audit-tests/gcloudStderrDiagnosticAnalyzer.test.mjs  dbf1c53e919f8af26c6ac1249711d753f3a72d6bf514b04c2b481f408b6caf04
tools/authority-audit-tests/c1a3ExactClassStateReadCaller.test.mjs   159b191cf577c916a5a3e58bccc1dc42f040a0a57ee0abcf02b91976cdc76cfd
tools/authority-audit-tests/exactClassStateRead.test.mjs             91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c
tools/authority-audit-tests/windowsProcessSynthetic.test.mjs          d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a

FOCUSED_TEST_COUNT = 6
FOCUSED_TEST_RESULT = PASS
SYNTAX_CHECK_RESULT = PASS
REGRESSION_RESULT = PASS (focused local authority-audit regression)
```

The real-gcloud adapter test was intentionally not run because it executes
`gcloud --version` and `gcloud help`; R2 prohibits real gcloud execution.

## Privacy, Approval, and Budgets

Sensitive scan result for the R2 runtime/test surface and result documents:

```text
TOKEN_PRIVACY = PASS
STDERR_PRIVACY = PASS
CALLER_PRIVACY = PASS
credential/private-key/API-key/raw-token/raw-stdout/raw-stderr/raw-caller = 0
```

```text
C1A7_LIVE_APPROVAL = NOT_GRANTED
C1A7_ACTIVE_CALLER_APPROVAL = NOT_GRANTED
C1A7_ACCESS_TOKEN_APPROVAL = NOT_GRANTED
C1A7_GETDOCUMENT_APPROVAL = NOT_GRANTED
FIRESTORE_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED

NEW_C1A7_ACTIVE_CALLER_DISCOVERY_MAX = 1
NEW_C1A7_ACCESS_TOKEN_MAX = 1
NEW_C1A7_GETDOCUMENT_MAX = 1
NEW_C1A7_RETRY_MAX = 0
NEW_C1A7_WRITE_MAX = 0
```

Original C1A, C1A3, C1A4, C1A5, and C1A6 budgets remain exhausted.

Prepared approval wording (not approval):

> I approve one bounded Strategy-A exact real Class production-state single
> read. Re-verify all R2 repository and external capability locks, then the
> static identity and exact field mask. Allow at most one active-caller
> discovery, one access-token process, and one exact GET; retry and writes are
> zero. Continue only for one matching caller and a token process with exit 0,
> no timeout, valid bounded stdout, and empty stderr. Any nonempty stderr,
> failure, malformed output, or unexpected response stops the attempt without
> retry. A read result never authorizes writes, manifest persistence, IAM,
> Rules/Indexes changes, or canonical Class changes.

## Final Safety Counters and Next Action

```text
REAL_GCLOUD_COMMANDS = 0
REAL_GCLOUD_PROCESS_SPAWN_COUNT = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

`RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_C1A7_LIVE_APPROVAL`

After a separate explicit approval, repeat lock checks immediately before the
single bounded live attempt. If any lock differs, stop before caller
discovery.
