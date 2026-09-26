# P1.5-C2H2E3D-W1C-M3L2-R1A1 SetIamPolicy Audit-Log Target Recovery Design

## Scope and safety boundary

This is a local design and reconciliation audit only. No Cloud Logging query,
gcloud execution, IAM read, IAM mutation, token operation, M3/M4 operation, or
Firestore operation was performed. The historical M3L2, F1, R1D, and FP1
documents remain unchanged.

The supplied official evidence states that Admin Activity logs can record
SetIamPolicy events, policy binding deltas, service-account resources, and the
authenticated actor. Those facts are treated as design inputs here; they were
not live-verified in R1A1.

## Evidence locks

```text
FP1_VERDICT = P1_5_C2H2E3D_W1C_M3L2_R1D_FP1_TRUNCATED_FINGERPRINT_INSUFFICIENT_R1R_BLOCKED
FP1_EVIDENCE_EXPECTED = 482af60aa21660e02427640ae0bc7ed0d259c1f9c35ed0ca21468384aa409784
FP1_EVIDENCE_MATCH = yes

R1D_DESIGN_MATCH = yes
M3L2_RESULT_EVIDENCE_MATCH = yes
RG2C_FINAL_COMPOSITE_MATCH = yes
```

## M3L2 time anchor

The persisted M3L2 result contains bounded counts, exit status, safe stderr
metadata, prestate, and postcheck status, but no authoritative execution start,
OP-E start, OP-E completion, or bounded interval. File modification time is not
part of the result contract and is not used.

```text
M3L2_AUDIT_TIME_ANCHOR_AVAILABLE = no
M3L2_AUDIT_TIME_ANCHOR_TYPE = none recorded in the bounded result contract
M3L2_AUDIT_QUERY_TIME_WINDOW_DESIGN = unavailable until an independently recorded exact execution interval exists
```

This is the primary live-approval blocker: without a trustworthy interval, a
historical SetIamPolicy event cannot be safely bound to this exact M3L2 run.

## Candidate event selector

The selected future command surface is `gcloud logging read`. The local SDK
implementation in `lib/surface/logging/read.py` accepts a positional filter,
`--limit`, ordering, freshness, and resource scope. `lib/googlecloudsdk/api_lib/
logging/common.py` passes the filter to `ListLogEntriesRequest` and uses the
bounded limit through the pager.

The intended selector is narrow and must remain a design template until the
exact emitted audit schema is confirmed:

```text
AUDIT_WRITER_RESOURCE_FILTER = protoPayload.resourceName = <exact locked writer resource>; exact emitted field requires schema confirmation
AUDIT_SET_IAM_POLICY_METHOD_FILTER = UNRESOLVED exact SetIamPolicy method variant
AUDIT_STATIC_FILTER_PREDICATES = [
  Admin Activity log scope,
  IAM service name,
  exact SetIamPolicy method name,
  exact writer service-account resource,
  exact execution-time window
]
```

Cloud Logging query fields are passed through by the local SDK, but the local
CLI source does not establish which IAM audit method-name variant or resource
field is emitted for this operation. No variant is promoted to an exact live
filter in R1A1.

## Uniqueness and pagination contract

The first result must never win. The future bounded classifier is:

- zero exact candidates: `NONE` / unresolved
- one exact candidate: `UNIQUE` only when the bounded query proves no
  continuation remains
- two candidates: `MULTIPLE` / ambiguous

```text
AUDIT_EVENT_FIRST_MATCH_WINS = no
AUDIT_QUERY_RESULT_LIMIT = 2
AUDIT_UNIQUENESS_PAGINATION_CONTRACT = use one logical read with limit 2; classify 0 as NONE, 1 as UNIQUE only without continuation, and 2 as MULTIPLE; any hidden continuation or pager ambiguity is unresolved
```

The local SDK sets page size to the requested limit and routes results through
`list_pager.YieldFromList`. A future adapter must expose enough bounded
metadata to ensure a continuation cannot be hidden. Since the time anchor and
exact audit schema are not established, this contract is not live-ready.

## OP-A, OP-E, and authenticated actor semantics

The current M3 code proves that the principal selected by OP-A is normalized
and used transiently to construct the OP-E target member. It does not prove
that the account returned by OP-A is necessarily the credential that the
SetIamPolicy request authenticates as: the mutation argv does not carry an
explicit account selector, and the effective gcloud credential/configuration
binding is not persisted in the M3 evidence.

```text
OP_A_CALLER_EQUALS_OP_E_TARGET_MEMBER = yes
OP_A_CALLER_EQUALS_SETIAMPOLICY_AUTHENTICATED_ACTOR = unresolved
AUDIT_ACTOR_CAN_BIND_HISTORICAL_TARGET = no
```

`authenticationInfo.principalEmail` cannot therefore be used by itself as the
M3L2 target-member proof. It may become a corroborating signal only if a future
runtime contract proves actor/target equivalence.

## Policy-delta recovery

The supplied official evidence says policy delta binding information may be
present. The local repository does not contain a live audit entry proving its
shape for this operation.

```text
AUDIT_POLICY_DELTA_EXPECTED_SUPPORT = OPTIONAL
AUDIT_POLICY_DELTA_CAN_DIRECTLY_BIND_M3L2_TARGET = yes if an exact delta is present and validated
```

The preferred transient delta predicates are: exact target resource, exact
SetIamPolicy operation, `ADD`, exact Token Creator role, and one member. The
member is compared in process only and discarded. Missing delta, malformed
delta, wrong role/resource, `REMOVE`, multiple candidates, or unsupported shape
is `AMBIGUOUS`, never `ABSENT`.

## Historical target extraction hierarchy

```text
HISTORICAL_TARGET_RECOVERY_HIERARCHY = [
  exact unique policyDelta ADD for the target role and resource,
  authenticated actor only if a future static/runtime contract proves actor equals the OP-E target member,
  otherwise AMBIGUOUS
]
```

If both delta member and authenticated actor are present, they must be compared
transiently. A mismatch is fail-closed. The prior 48-bit fingerprint is not a
fallback identity proof.

```text
AUDIT_TARGET_SIGNALS_CONSISTENT = yes / no / not_available
SAME_SESSION_RAW_TARGET_COMPARISON = SUPPORTED
```

The raw values are never persisted. Only bounded event and recovery enums may
be retained.

## Audit operation status

Presence of an audit entry is not success proof. A future parser should inspect
the bounded operation status fields:

```text
AUDIT_REMOTE_OPERATION_STATUS_FIELDS = [
  timestamp,
  insertId,
  protoPayload.status.code
]
```

`status.code = 0` may classify the recorded operation as `SUCCESS`, a nonzero
status code as `FAILURE`, and absent or malformed status as `UNKNOWN`. This is
historical remote-effect classification only; it does not prove current policy
state.

```text
AUDIT_HISTORICAL_REMOTE_EFFECT_CLASSIFICATION = design only
AUDIT_HISTORY_USED_AS_CURRENT_STATE = no
```

## Future combined recovery flow

If the missing time/schema contracts are separately resolved, the minimum
future flow is:

```text
R1A2_FUTURE_LIVE_GRAPH = [
  one exact Cloud Logging query,
  require one unique exact M3L2 SetIamPolicy event,
  recover historical target transiently from validated delta or proven actor,
  one exact current writer-SA IAM policy read,
  compare exact normalized target transiently using current M3 predicate,
  discard raw audit and policy values,
  persist only PRESENT / ABSENT / AMBIGUOUS and bounded audit enums
]
FRESH_CALLER_REDISCOVERY_STILL_REQUIRED = no
```

The current target result remains only:

`TARGET_BINDING_RECOVERY_STATE = PRESENT / ABSENT / AMBIGUOUS`

Possible bounded historical fields are `AUDIT_EVENT_MATCH = UNIQUE / NONE /
MULTIPLE / UNRESOLVED`, `AUDIT_REMOTE_EFFECT = SUCCESS / FAILURE / UNKNOWN`,
`AUDIT_HISTORICAL_TARGET_RECOVERED = yes/no`, and
`AUDIT_TARGET_SIGNALS_CONSISTENT = yes/no/not_available`.

## Future budget

```text
R1A2_FUTURE_LIVE_BUDGET = {
  cloudLoggingReadsMax: 1,
  writerSaIamPolicyReadsMax: 1,
  activeCallerDiscoveryMax: 0,
  testIamPermissionsMax: 0,
  projectIamReadsMax: 0,
  retriesMax: 0,
  iamMutationsMax: 0,
  m3MutationsMax: 0,
  m4MutationsMax: 0,
  accessTokenCallsMax: 0,
  firestoreCallsMax: 0
}
```

Any unresolved audit query or writer policy read stops the flow. No automatic
second query or retry is allowed.

## New external capability reconciliation

Cloud Logging is a new external read capability. The selected surface is:

```text
SELECTED_AUDIT_LOG_READ_SURFACE = gcloud logging read
AUDIT_LOG_NEW_EXTERNAL_CAPABILITY_COUNT = 5
AUDIT_LOG_ALL_CAPABILITIES_PATH_BOUND = yes
```

The five local SDK components inspected for the command graph are recorded by
SDK-relative path and SHA-256:

| Capability component | SDK-relative path | SHA-256 | Security role |
|---|---|---|---|
| command surface | `lib/surface/logging/read.py` | `cb739cec236e1738f4e26cf7d2bb89aed4f3a473d092375001f89a3be5a36074` | positional filter, scope, limit, ordering |
| argument parser | `lib/googlecloudsdk/command_lib/logs/read.py` | `ab510d1e87b5e47ee06dd9b8ca5ceaddfdefc62fe2cc5e9d0748f6769f0c3897` | timestamp/freshness and limit handling |
| list request adapter | `lib/googlecloudsdk/api_lib/logging/common.py` | `e902c135dbfeebecc35326c257dc39eb71fd3276ba4adbd2bb2abdc687c4402e` | `ListLogEntries` request and bounded pager |
| logging client resolver | `lib/googlecloudsdk/api_lib/logging/util.py` | `bea07703fe447b16a7351b1a66138fd14d4faf474d889c46ca60b54c117d291d` | Logging v2 client selection |
| API client factory | `lib/googlecloudsdk/api_lib/util/apis.py` | `3196fbf904b546ba6e8f5d98e4e130125df71a301da008390b8aa9318e64f71c` | client/message module resolution |

All five files are contained under the inspected local SDK root. The SDK
version was `580.0.0`. No SDK file was modified.

```text
R1A2_EXTERNAL_CAPABILITY_RECONCILED = yes
```

## Permission and grant boundary

The required future permission for basic log-entry listing is:

```text
AUDIT_LOG_REQUIRED_PERMISSIONS = [logging.logEntries.list]
LOGGING_IAM_GRANTS = 0
```

No Logging role or permission was added. A future permission preflight must be
separately approved and must not be combined with recovery or IAM grant work.

## Privacy and result branches

Raw audit entries, actor/member values, policy objects, operation output,
etag/conditions, and credential material may exist only transiently during an
approved future read. They are not persisted.

- unique historical event + exact current binding present -> recommend local
  R1P adoption gate; do not execute M3
- unique historical event + exact current binding absent -> G4 classifier
  correction and new readiness review; no automatic retry
- missing, multiple, inconsistent, malformed, or unresolved evidence -> stop
  with `AMBIGUOUS`; no second query automatically

## Carry-forward locks

```text
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
M4_READINESS = BLOCKED
M4_APPROVAL = NOT_GRANTED
M4_BLOCKER = M3_EFFECTIVE_CURRENT_STATE_NOT_YET_RECOVERED
PRODUCTION_M3_RUNTIME_CHANGED = 0
F4P1_RUNTIME_CHANGED = 0
```

## Deterministic R1A1 attestation

Canonicalization: UTF-8 JSON with sorted object keys, no timestamp, no raw
principal, no raw audit entry, and only bounded design fields. The payload was
hashed twice with identical output.

```text
M3_M3L2_R1A1_AUDIT_LOG_TARGET_RECOVERY_DESIGN_SHA256 = 745c4aaa9f18ee3a9f799a31695af194551b108ef7813a8fac496838ec6e1e40
SECOND_R1A1_ATTESTATION_SHA256 = 745c4aaa9f18ee3a9f799a31695af194551b108ef7813a8fac496838ec6e1e40
R1A1_ATTESTATION_REPRODUCIBLE = yes
```

## Safety counters and approval status

```text
REAL_GCLOUD_EXECUTIONS = 0
CLOUD_LOGGING_READS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
R1A2_LIVE_APPROVAL = NOT_GRANTED
```

## Final verdict

`P1_5_C2H2E3D_W1C_M3L2_R1A1_AUDIT_EVENT_TIME_ANCHOR_INSUFFICIENT`

The audit-log recovery path is structurally promising and the new local
Logging capability is path-bound, but the exact M3L2 execution time anchor and
the exact emitted SetIamPolicy schema are not present in the local evidence.
The authenticated actor is also not statically proven equal to the OP-E target
member. Do not grant R1A2 live approval until those contracts are separately
resolved.

