# M3-R3 Post-Indeterminate Recovery Strategy

This local-only evaluation preserves the consumed M3 state without running
OP-A, Cloud Logging, IAM reads, or mutations.

```text
M3_EXECUTION_EVIDENCE_SHA256=a70acc78ca206c7725dee76008575d68dd0da154f39bd90b3c43b8b3b46a3955
M3_RESULT_DOCUMENT_SHA256=09288b56747d55111d484fa6279a85e60ba8c1c7760317c0af66a74c9a5f20f6
CURRENT_M3_STATE=FROZEN_INDETERMINATE_MEMBER_IDENTITY_LOST
```

## Path A

`MEMBER_INDEPENDENT_RECOVERY_NOT_PROVABLE`.

The persisted V2 execution evidence records only `TARGET_MEMBER_ABSENT`. It
does not retain a target-role binding cardinality proof, complete policy
structure digest, or role-level digest. Therefore it cannot establish that the
target role was empty before mutation. A current policy with one target-role
member also cannot attribute that member to this mutation because external
concurrent writers cannot be ruled out.

A future complete current policy with zero target-role bindings may prove that
the unknown historical member is absent *now*, but it cannot recover whether
the consumed mutation reached the server. It must not authorize another
mutation.

## Path B

`NOT_ELIGIBLE` for the consumed session.

The command surface is the exact writer-service-account policy-binding command
whose underlying IAM write is `iam.projects.serviceAccounts.setIamPolicy`.
The locked writer resource and method are recoverable semantically from the
runtime authority chain. The execution evidence deliberately retains no
bounded execution time window, operation identifier, raw target member, or
verified emitted audit-event schema. A future audit event cannot be uniquely
correlated to this consumed mutation using resource and method alone.

Cloud Audit Logging may be a future design surface, but whether it can recover
the exact target member for this session is `UNRESOLVED`; it is not an approved
or eligible recovery operation. Missing or multiple events, parser failure,
or an IAM read failure must remain non-success states.

## Future Sessions

`POST_MUTATION_RECOVERY_IDENTITY_ANCHOR_MISSING` is a future-runtime design
defect. A future execution may use a protected authorization-grade equality
anchor, such as a domain-separated full SHA-256 value held in a protected
recovery envelope or an HMAC backed by a protected secret. A display
fingerprint and any anchor generated after this session are forbidden.

No historical value is reconstructed or persisted by this strategy.

```text
REMOTE_OPERATIONS=0
IAM_MUTATIONS=0
M3_MUTATIONS=0
M4_MUTATIONS=0
FIRESTORE=0
TOKEN=0
LOGGING=0
```
