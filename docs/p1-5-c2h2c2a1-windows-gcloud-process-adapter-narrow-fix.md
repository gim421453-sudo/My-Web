# P1.5-C2H2C2A1 Windows GCloud Process Adapter Narrow Fix

## Result

`P1_5_C2H2C2A1_WINDOWS_PROCESS_ADAPTER_FIX_PASS`

This package changes only the local Stage-1 process-launch mechanism. It does
not generate credentials, impersonate a service account, call Google Cloud or
Firestore, or alter application/runtime code.

## Baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
```

The C2H2C2 failed adapter was not a tracked repository file. It was an inline
Node 22 program executed in the C2H2C2 session; repository search found no
persisted Stage-1 gcloud launcher to edit. Its documented execution shape was:

```text
spawnSync(cmd.exe, ["/d", "/s", "/c", manually-quoted-gcloud-command])
```

That program manually constructed one whole `.cmd` command string. Its parent
captured stdout/stderr, but discarded the failed process detail under the
token-safe policy. This means there is no file/line source beyond that session
execution record.

## Root cause and narrow replacement

The old launch shape is confirmed defective on this Windows host:

```text
OLD_WINDOWS_PROCESS_ADAPTER = Node -> cmd.exe /d /s /c -> quoted gcloud.cmd string
OLD_ADAPTER_DEFECT = CONFIRMED
```

`gcloud.cmd` resides at a local path containing spaces. Node's Windows argument
serialization caused `cmd.exe` to receive the quoted launcher as an
unresolvable command. Direct spawning of a `.cmd` also returns `EINVAL`. A
native PowerShell invocation of the same local SDK succeeds.

The replacement is deliberately small:

```text
NEW_WINDOWS_PROCESS_ADAPTER = Node -> powershell.exe -NoProfile -NonInteractive -File -> fixed local argument-forwarder -> executable + argument array
```

The new files are:

- `tools/authority-audit/windowsGcloudProcessAdapter.mjs`
- `tools/authority-audit/invokeWindowsExecutable.ps1`
- `tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs`

The PowerShell script is fixed local code, not dynamically composed command
text. Node serializes the executable plus argument array as a base64-encoded
JSON data payload, and the script restores that data before calling the
resolved executable with a PowerShell argument array. This prevents PowerShell
from parsing child dash-prefixed arguments such as Node's `-e` as its own
options. The Node adapter runs with `shell: false`, has no `cmd.exe` layer,
accepts an executable/argument-array/timeout/capture-mode contract, captures
output in memory, and never retries or echoes child output.

## Local resolution and harmless validation

GCloud resolution considers only local OS state: an explicit local override,
`where.exe`, and the SDK location under `LOCALAPPDATA`. It does not embed a
machine-specific user directory in production logic.

| Validation | Result |
| --- | --- |
| Resolved local `gcloud.cmd` exists | PASS |
| New adapter: `gcloud --version` | PASS, exit `0`, no timeout |
| New adapter: `gcloud help` | PASS, exit `0`, no timeout |
| Path containing spaces | PASS through the local SDK path |
| Argument containing `@`, `:`, and `=` | PASS unchanged through a synthetic local executable |
| stdout capture | PASS, captured in parent memory |
| stderr and non-zero exit capture | PASS, synthetic exit `7` retained |
| timeout handling | PASS, synthetic local child reported timed out |

```text
GCLOUD_LOCAL_RESOLUTION = SUCCESS
HARMLESS_GCLOUD_VERSION_TEST = PASS
HARMLESS_SECOND_LOCAL_TEST = PASS
NEW_ADAPTER_EXIT_CODE_HANDLING = VERIFIED
NEW_ADAPTER_STDOUT_CAPTURE = VERIFIED
NEW_ADAPTER_STDERR_CAPTURE = VERIFIED
NEW_ADAPTER_TIMEOUT_HANDLING = VERIFIED
LOCAL_PROCESS_DEFECT_SUFFICIENT_TO_EXPLAIN_C2H2C2_FAILURE = yes
TOKEN_RETRY_TECHNICALLY_READY = yes
TOKEN_RETRY_APPROVAL = NOT_GRANTED
LIVE_DIAGNOSTIC_REQUIRED_BEFORE_RETRY = no
```

This result establishes only that the local runner plausibly explains the prior
failure. It does not establish that the IAM binding, audit service account, IAM
Credentials service, or effective permission is healthy.

## Security and approval boundary

The adapter keeps stdout/stderr in memory and does not stream, persist, debug
dump, or expose child output. That remains safe when a later separately
approved command returns a short-lived credential. The current tests use only
SDK version/help commands and synthetic local Node processes.

```text
LOCAL_PROCESS_TESTS = 5
LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
SERVICE_USAGE_READS = 0
AUDIT_SA_METADATA_READS = 0
AUDIT_SA_RESOURCE_IAM_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next approval recommendation

The next package may be **P1.5-C2H2C2B - Corrected Token-Generation
Single-Retry Approval Gate**. It must be design/approval only and retain the
exact existing caller fingerprint, audit service-account target, project,
database, selected workspace, one token generation maximum, one
`ListCollectionIds` maximum, no token persistence, and no automatic retry.
Nothing in this package authorizes that execution.
