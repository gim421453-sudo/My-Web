# P1.5-C2H2E3C1A6H Token Command Stderr-Independence Strategy Review

## Verdict

`P1_5_C2H2E3C1A6H_STRATEGY_A_NARROWER_SECURITY_IMPLEMENTATION_PASS`

This batch performed local source review and synthetic validation only. No
gcloud command, active caller discovery, token, impersonation, Firestore, IAM,
or production access was performed.

## Stop State and Baseline

- Latest live verdict: `P1_5_C2H2E3C1A6_TOKEN_PIPELINE_REJECTED`
- C1A6F verdict: `P1_5_C2H2E3C1A6F_EVIDENCE_INSUFFICIENT_PAUSE_LIVE_RETRY`
- Live retry paused: `yes`
- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- C1A7 created: `no`

## Token Command Contract

The repository token provider constructs this command contract without
executing it:

```text
TOKEN_EXECUTABLE = local gcloud.cmd resolved by the Windows adapter
TOKEN_ARGUMENTS =
[
  "auth",
  "print-access-token",
  "--impersonate-service-account=<locked audit service account>",
  "--scopes=https://www.googleapis.com/auth/datastore",
  "--verbosity=error"
]
```

The audit service-account value is locked in runtime code but is not repeated
in this result document. The token remains memory-only.

## Local SDK Source Proof

- Local SDK source available: `yes`
- Local SDK version metadata: `580.0.0`
- Supported verbosity values: `debug`, `info`, `warning`, `error`,
  `critical`, `none`
- Impersonation warning emission: `log.warning` in the local credential store
  impersonation path
- Warning respects verbosity: `yes`
- Suppression levels: `error`, `critical`, `none`

The local logging implementation sets the stderr handler threshold from the
verbosity value. The impersonation message uses the warning logger, so
`--verbosity=error` suppresses that warning while preserving error-level log
visibility. This conclusion is based on local source inspection only.

The access-token command continues to place its token on stdout. The Windows
adapter captures stdout/stderr in memory, preserves exit status, and exposes
timeouts without writing token material to disk.

## Failure Semantics

- Nonzero exit unaffected: `yes`
- Error-level stderr remains visible: `yes`
- Authentication failure remains fail-closed: `yes` at the subprocess/classifier
  boundary
- Timeout remains fail-closed: `yes`
- Empty/malformed/multiline stdout remains fail-closed: `yes`
- Empty-stderr success contract feasible: `yes`

The new security contract is:

```text
exitCode = 0
timedOut = false
stdout = one valid bounded token with approved framing
stderr = empty
```

Anything else is rejected. UNKNOWN stderr remains rejected.

## Strategy Evaluation

### Strategy A: verbosity suppression plus empty-stderr-only success

- Feasible: `yes`
- Security: `STRONGER`
- Acceptance surface: `NARROWER`
- Implementation: completed locally

The command now requests `--verbosity=error`, and the classifier no longer
accepts the previous impersonation-warning stderr template. This removes the
warning allowlist rather than adding another warning variant.

### Strategy B: warning allowlist correlation

- Feasible: `yes`
- Limitation: version-sensitive and already produced repeated unknown-stderr
  incidents
- Selected: `no`

### Strategy C: direct non-gcloud credential/API path

- Direct supported path in this repository's audit runtime: `no`
- Complexity: `HIGH` if introduced
- Selected: `no`

### Strategy D: wrapper-only redesign

The wrapper already preserves separate stdout/stderr, bounded capture, exit
status, and timeout metadata. It cannot remove the warning dependency by
itself. Selected: `no`.

Preferred strategy: `STRATEGY_A`.

## Implementation and Regression

- Implementation performed: `yes`
- Token acceptance behavior changed: `yes_narrower_empty_stderr_only`
- Newly accepted UNKNOWN stderr cases: `0`
- Diagnostic analyzer can override security: `no`
- Token file write/persistence/logging: `0/0/0`
- Authorization logging: `0`

Focused tests passed:

1. `gcloudTokenOutputClassifier.test.mjs`
2. `gcloudStderrDiagnosticAnalyzer.test.mjs`
3. `c1a3ExactClassStateReadCaller.test.mjs`
4. `exactClassStateRead.test.mjs`
5. `windowsProcessSynthetic.test.mjs`

The old warning fixture is now rejected, empty stderr is accepted, and all
negative cases remain fail-closed.

## Runtime Lock Consequence

Changed runtime files:

```text
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
tools/authority-audit/gcloudTokenOutputClassifier.mjs
```

Changed tests:

```text
tools/authority-audit-tests/c1a3ExactClassStateReadCaller.test.mjs
tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs
```

`C1A5G_R_RUNTIME_LOCK_STATUS = INVALIDATED_BY_C1A6H`.

Before any future real token attempt, perform host-safe validation of the
verbosity argument, stdout/stderr framing, and exit-code preservation, then a
new final runtime relock and explicit live approval.

Minimal external runtime capability lock required: `yes`. Record the local SDK
version, launcher hash, and hashes for the relevant logging and credential
source modules, plus a host-safe capability test. Do not hash the entire SDK
tree.

## Safety Counters

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_GCLOUD_AUTH_CALLS = 0
LIVE_IMPERSONATION_CALLS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next Action

`P1.5-C2H2E3C1A6H-R1 — HOST-SAFE TOKEN COMMAND TRANSPORT REGRESSION`

Do not execute gcloud or generate another token in this step. After R1, run a
new R2 final relock and approval gate. Only then may a separately approved
bounded live attempt proceed.
