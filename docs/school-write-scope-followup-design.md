# School write scope — follow-up design, 2026-11-13

Status: design and fail-closed regression characterization, not an activated endpoint. Base `1874119`.

## Existing components and limits

- `src/app-next/appNextTimetableRowCrudUtils.ts:timetableRowWritePolicy` denies school-mode manager/teacher timetable writes. It is a client operating policy, not proof of server enforcement. `normal` has an existing different policy; do not expand this task into a silent role-matrix change.
- `functions/src/authz/assignmentScopeResolver.ts:resolveTeacherAssignedScope` requires complete workspace context, active canonical **teacher** membership and valid server-authored assignments. It validates workspace/teacher identity, activity and validity intervals.
- `teacherAssignmentContract.ts` supports student/class/subject/class_subject assignment targets. The resolver's relationship matching proves access to a requested **student**, using active canonical registries and enrollment relationships. A timetable cell is not a student. A class assignment is not blanket permission to mutate a timetable row.
- `scopeAuthorization.ts` combines the permission catalog with scope; a denied/deferred permission cannot be rescued by an assignment. Its ALLOW path for broader roles does not imply the teacher resolver supports managers.
- `functions/src/index.ts` exports the local health endpoint. Existing pure policy/repository support does not establish a deployed attendance/grade/timetable mutation endpoint. Do not treat a successful policy test as connected UI authorization.
- Configured Rules teacher-scope tests protect sensitive data from direct teacher writes without a verified server path. They do not prove the stricter timetable client policy is enforced server-side for every role.

## Proposed endpoint boundary

First implement a narrow student-scoped attendance operation through the existing verified actor, permission, operation/idempotency and security audit infrastructure. Keep timetable and grade mutations separate. Use a proposed operation name such as `attendance.upsert`; it is not an existing public route and is not exported by this branch.

Accept only workspace ID, target student ID, canonical attendance date/record identity, an allowlisted field patch, an idempotency key and expected record revision. Derive actor identity, role, mode, assignment, school/class/subject relationships and timestamps on the server. Reject client-provided authority fields, unknown fields, cross-workspace references and arbitrary document paths.

Inside one trusted Firestore transaction, read canonical user/workspace/membership authority, the operation permission, student registry, applicable assignment documents, enrollment/class/subject registries, the target record and the idempotency record. Reuse `resolvePermissionWithAssignedScope` with transaction-backed repositories and a trusted timestamp. Every authorization dependency, including expiry/relationship changes, must participate in the retry/read-set contract. Return DENY for missing, malformed, inactive, expired or unverifiable scope. Audit + mutation + idempotency result commit atomically. No external side effect belongs in a retry body.

Confirm exact server state in the UI; reject double submissions, surface safe reason codes and never fall back to a direct Firestore write after a server error. Keep reads and writes explicitly scoped to the selected workspace.

## Role and feature decisions

| Role/operation | Current state | Proposed release condition |
| --- | --- | --- |
| teacher attendance/grade direct client writes | Sensitive paths fail closed under configured Rules | Keep denied; implement scoped backend and emulator matrix before any cutover |
| school manager timetable writes | App Next client denied | Define a separate delegated management policy; never masquerade as a teacher or relabel membership |
| school teacher timetable writes | App Next client denied | Define a timetable-specific target and assignment mapping first; existing student resolver alone is insufficient |
| system_owner / super_manager | Existing operation-specific policy | Preserve canonical authority checks; no new bypass or permission expansion |
| normal / viewer / print_account | Existing individual role contracts | No expansion or collateral restriction in this design branch |

Manager delegation remains a product-policy decision: a manager role does not automatically grant schoolwide academic writes. Before implementing it, define who can grant/revoke delegation, scope dimensions, validity, audit, and whether it includes create/update/delete. Until defined and verified, maintain the present school timetable denial.

For timetable writes additionally adopt the occupancy/legacy-writer contract from the separate timetable concurrency review branch. A cell must carry stable canonical class/subject references before an assignment can authorize it; free-text teacher/subject labels cannot be authority. A move must prove scope for both source and destination. Time-table permission names and endpoints require explicit catalog entries and a reviewed role matrix; do not borrow `attendance.write`.

## Implementation sequence and release gates

1. Keep this branch's guard tests green. Write an operation-specific contract, exact field schema and teacher/manager action matrix. Resolve manager delegation and timetable target semantics before activating those cases.
2. Implement an emulator-only attendance operation and transaction-backed scope dependencies. Test exact-match positive teacher scope plus inactive membership, wrong workspace/actor/student, forged assignment payload, missing/expired/malformed assignment, missing canonical registry and incomplete enrollment graph.
3. Race assignment revoke/expiry, membership disable and relationship changes against commit; validate retry authority. Test idempotent replay, changed-payload replay, concurrent edits and audit atomicity.
4. Add UI integration to that verified local operation behind an off-by-default feature flag. Without a verified available backend, keep the existing write denial; no client-only permission relaxation.
5. Exercise direct SDK bypass attempts against the proposed Rules. Rules and the endpoint must be reviewed together; Admin SDK ignores Rules and needs independent server authorization tests.
6. Run root/typecheck/build, Node 22 Functions tests, configured Rules tests and Browser role matrix. Production endpoints/exports, credential provisioning, migration, deployment and IAM require a separate authorized rollout and remain HOLD.

## This branch's evidence

New targeted tests establish that the current teacher resolver denies manager membership and rejects a timetable-cell target even when a valid student assignment exists. These are characterization guards for the reviewed design boundary, not a new permission implementation. No production endpoint, Rules, UI policy or role grants change.

Validation: Node 22.23.5 Functions TypeScript build PASS; `node --test functions/lib/test/authzPolicies.test.js` PASS 63/63 including both new boundary cases; fail/cancel/skip/todo 0. This does not claim a new endpoint or school timetable write capability is implemented.
