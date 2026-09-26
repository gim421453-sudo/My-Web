# P1.5-C2H2E3D-W1C-M3L2-F1 Local Forensic and Outcome Classifier Safety Audit

## Scope and safety boundary

This is a local, read-only forensic result for the M3L2 OP-E outcome classifier.
No source code, production data, IAM policy, Firestore data, token, or cloud
resource was changed or queried in this audit. No retry, recovery read, M4
operation, or second mutation was attempted.

Baseline evidence:

- branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- RG2C composite evidence: `b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1`
- M3L2 result evidence: `4ec4415863f1432a72f2e1e9b7d682da92b947c69a0fda315551b5f72247cdb4`
- local runtime evidence: 7 process calls; OP-E was the final call
- prestate: `ABSENT`; OP-C_POST and OP-D_POST were not executed

## A. ERROR_PREFIX_V1 source and contract

Source: `tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs`,
`RULES.errorPrefix`, `matchRuleIds`, and `analyzeStderrLine`.

The rule is matched by the generic predicate `^(ERROR|ERR)\\b`, after trimming
the line. It emits `ERROR_PREFIX_V1`. The same analyzer assigns the generic
line semantic category `UNKNOWN` and template `UNKNOWN_TEMPLATE`; it does not
parse a provider error code, API method, HTTP status, or mutation stage.

Therefore the rule specificity is `GENERIC`. It is an observability label only:
the analyzer contract does not allow a rule, template, or fingerprint to
override acceptance or establish a successful mutation.

Observed safe metadata from M3L2:

- rule identifier: `ERROR_PREFIX_V1`
- stderr line count: `7`
- stderr byte count: `419`
- raw stderr persisted: no
- root-cause specificity: `NOT_PROVABLE`

## B. UNKNOWN_NONZERO trigger and mapping

Source: `tools/authority-audit/m3RuntimeCommandGraph.mjs`,
`projectSafeMutationDiagnostic` and `runM3Dormant`.

`UNKNOWN_NONZERO` is emitted when `exitCode` is an integer other than zero and
`timedOut` is false. In `runM3Dormant`, every such mutation result is mapped
directly to `M3_MUTATION_FAILURE` with `mutationOutcome: CONFIRMED_FAILURE`.
The mapping does not inspect `ERROR_PREFIX_V1`, the error template, the
fingerprint, or whether a remote response may have been lost.

M3L2 observed:

- exit code: `1`
- timed out: `false`
- failure class: `UNKNOWN_NONZERO`
- current mutation outcome: `CONFIRMED_FAILURE`
- post-state reads executed: `false`
- retry count: `0`
- rollback count: `0`

## C. Local OP-E execution path

The current command is the exact service-account IAM binding command already
covered by the preceding approval evidence. Local Cloud SDK source inspection
was limited to the installed SDK implementation; no command was executed.

The relevant SDK path is:

1. `add_iam_policy_binding.yaml` declares the service-account IAM collection,
   condition support, policy version 3, and the requested policy version path.
2. `AddIamPolicyBindingCommandGenerator.Run` calls
   `_GetModifiedIamPolicyAddIamBinding`.
3. `_GetModifiedIamPolicyAddIamBinding` calls `_GetIamPolicy`, then applies the
   local binding transformation through `AddBindingToIamPolicy` or
   `AddBindingToIamPolicyWithCondition`.
4. `Run` places the modified policy into the `setIamPolicyRequest.policy`
   static field and calls `_CommonRun`.
5. `_CommonRun` constructs and calls the SetIamPolicy API request.
6. Only after that call returns does the command call `LogSetIamPolicy` and
   `_HandleResponse`.

This proves the local operation model is `GET -> local mutation -> SET ->
local response/log handling`. It does not prove that an exit code of `1` means
the SET was never accepted: a response/transport or subsequent local failure
can leave remote application status unresolved. The local source does not
provide an atomic client-side receipt that the classifier consumes.

## D. Candidate meanings of a generic ERROR prefix

`ERROR_PREFIX_V1` plus `UNKNOWN_NONZERO` cannot distinguish these supported
classes on the current evidence:

1. authorization or permission rejection before SET
2. invalid member, role, condition, or resource argument
3. stale etag or concurrent policy precondition failure
4. target not found or target state rejection
5. policy version or condition validation rejection
6. command usage or local argument validation failure
7. credential, configuration, or caller-context failure
8. network or transport failure during GET or SET
9. local process/SDK failure after a successful remote response
10. response parsing or response handling failure after SET
11. local executable/spawn failure represented as a nonzero result
12. another provider or SDK error not represented by the bounded metadata

This is a candidate-class matrix, not a claim that each class occurred. The
available safe fields do not select one class.

## E. Remote outcome safety determination

`NONZERO_AFTER_POSSIBLE_REMOTE_SUCCESS_PATH = PROVEN_POSSIBLE` at the
classifier-safety level: the SDK path performs SET before local logging and
response handling, while the M3 adapter receives only the final process result.
The audit does not claim that this particular SET succeeded.

Consequences:

- `ALL_CURRENT_EVIDENCE_MATCHING_PATHS_REMOTE_MUTATION_ABSENT = false`
- `CONFIRMED_FAILURE_SEMANTICS = UNSAFE_OR_UNPROVEN`
- `CURRENT_TARGET_BINDING_STATE = INDETERMINATE`
- `CURRENT_M3_EFFECTIVE_STATE_CONFIDENCE = INDETERMINATE`
- `PRESTATE_USED_AS_POSTSTATE_PROOF = no`
- `EXIT_CODE_1_ROOT_CAUSE_SPECIFIC = no`
- `STDERR_STRUCTURE_NARROWS_ROOT_CAUSE = no`
- `M3L2_ROOT_CAUSE = NOT_PROVEN`

The prior prestate `ABSENT` is only a before-state observation. Because the
post-state reads were not reached, it cannot establish the target's state
after OP-E.

## F. Required safe reclassification

The current effective result must not be treated as a confirmed remote
failure. For safety it should be reclassified as:

`M3L2_SAFE_OUTCOME_RECLASSIFICATION = INDETERMINATE`

The current observability is `TOO_BROAD`. `ERROR_PREFIX_V1` should remain a
bounded diagnostic label, but it is not a provider-specific failure class and
must not decide the mutation outcome. A future classifier may refine local
error categories, but even a refined prefix classifier cannot replace a
post-state recovery read for a mutation whose final process result is nonzero.

Recommended next design gate:

`M3L2-R1D exact target-binding poststate recovery read design`

That design must be separately approved and must remain read-only until its
scope, identity, bounded read count, and stale/ambiguous-state handling are
ratified. This F1 audit does not implement it.

## G. Evidence and safety counters

Canonical safe evidence payload hash (sorted-key JSON, SHA-256, computed twice
with identical output):

`77effbddd0a047eb99b887289de28cb3c415ee6f73811e54120add992a8d5ee8`

The payload records the bounded result, classifier predicates, source mapping,
and zero-operation constraints without raw stderr, credentials, caller/member
identifiers, policy contents, document paths, or local absolute paths.

- mutation attempts: `1`
- retry allowed/used: `0 / 0`
- M4: `0`
- Firestore: `0`
- production runtime changed: `0`
- raw recovery attempt: `no`
- approval consumed: `yes`
- reusable approval: `no`
- mutation budget: `EXHAUSTED`

## H. Final verdict

`P1_5_C2H2E3D_W1C_M3L2_F1_OUTCOME_CLASSIFIER_UNSAFE_RECLASSIFY_INDETERMINATE_NEEDS_STATE_RECOVERY_DESIGN`

No code or test file was changed. The analyzer and runtime classifier remain
unchanged; this result documents why the existing `CONFIRMED_FAILURE` label is
not sufficient evidence of remote mutation absence.

