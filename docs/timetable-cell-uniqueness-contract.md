# Timetable cell uniqueness — contract review, 2026-11-13

Status: proposed server contract; no production or Rules activation. Base `1874119`.

## Verified current behavior

`src/app-next/appNextTimetableRowCrudService.ts` reads the timetable collection before a row transaction, checks legacy occupancy, then transactionally reads only the canonical row and workspace/set/period metadata. `timetableCellDocumentId` uses set + normalized day + period. Two App Next creates contend on that document. An arbitrary-ID legacy insert after the collection preflight does not touch it and cannot cause a retry.

Counterexample: A reads an empty cell; legacy B inserts `legacy-id` into that cell; A commits `cell-…` after reading its still-absent canonical document. Both rows remain. Retrying a collection preflight or adding a client-only lock cannot close this gap. Existing legacy occupancy is detected only if it is already visible to preflight. Deletion/recreation and moves need the same invariant as creation.

This branch adds a deterministic characterization of that interleaving to the existing service harness. It expects two occupants as evidence of the known limitation; a passing test does **not** mean uniqueness is fixed. It does not emulate Firestore MVCC or test production Rules.

## Proposed invariant and authority

For every normalized `(workspaceId, setId, day, periodNumber)`, at most one nondeleted timetable row may own that cell, regardless of client or row-ID format. Reuse the existing alias/day/period normalization, reject conflicting aliases and invalid IDs, and preserve unrecognized fields in updates. Do not infer new sets, periods, programs or assignment permissions.

Use a server-owned occupancy document keyed by a versioned SHA-256 hash of an unambiguous encoded tuple. Store the full tuple in the document and compare it on every read; a hash match alone is insufficient. Suggested future path: `workspaces/{workspaceId}/timetableCells/{cellKey}`. This path is a proposal and has not been added to Rules or data.

Occupancy states: `empty`, `occupied(rowId)`, or `conflict`. Persist a revision/epoch for delete/recreate and migration fencing; do not silently discard it. A `conflict` state blocks mutation until an explicitly reviewed reconciliation chooses the surviving row. Existing rows are never automatically deleted or rewritten by a client.

## Transaction protocol

All supported writers must enter one trusted operation. Verify ID token, active canonical membership, workspace mode, operation permission and any required scope on the server. Never trust the client role, supplied occupancy or assignment proof.

| Operation | Read before any write | Atomic writes |
| --- | --- | --- |
| Create | Authority, workspace write epoch, set/period/program references, occupancy, target row, idempotency record | Claim empty cell, create row, write audit and idempotency result |
| Edit in place | Same authority/references, occupancy ownership, existing row/version | Preserve ID/unknown fields; update editable fields and audit |
| Move | Old and new occupancies, row/version, both cells' references and authority | Release old + claim new + move row + audit in one transaction; no delete-then-create window |
| Delete | Authority, occupied cell owner, row/version | Remove/soft-delete exactly that row, transition occupancy to empty with increased revision, audit |
| Replay | Actor/workspace/operation-bound idempotency record | Return prior result only for identical payload binding; reject key reuse for a different target/payload |

Read all authorization and relationship dependencies inside the transaction or through a revision fence that is part of its read set. A revoked membership or changed write epoch must invalidate an in-flight write. Use Firestore transaction retries, bounded payload/field validation and trusted timestamps. Avoid nontransactional Auth/external side effects in the retry body. Confirm committed server state before a client displays success.

## Compatibility and rollout gate

1. Inventory all writers, including legacy `app.js`, imports, admin tools and scheduled jobs. Security Rules do not constrain Admin SDK writers: these must also adopt the protocol.
2. Produce a read-only normalized occupancy inventory and conflict report. Preserve original IDs, fields and aliases. Resolve ambiguity through a reviewed plan; do not migrate live data in this branch.
3. Test the operation and proposed Rules in demo emulators. Enforce that clients cannot write occupancy documents or bypass the canonical mutation route. A backend endpoint alone cannot guarantee uniqueness while legacy direct writes remain allowed.
4. Under an approved rollout, fence all writes, reconcile/backfill occupancy, verify one-to-one row coverage, cut over every writer and install the matching deny-direct-write policy before reopening writes. A scan during unrestricted concurrent legacy writes is insufficient.
5. Rollback must retain the write fence if it cannot preserve the invariant. Re-enabling old arbitrary-ID writes revokes the uniqueness guarantee and requires an explicit rollback decision.

## Acceptance matrix for an implementation change

- Two concurrent canonical, two legacy-compatible, and mixed writers: exactly one success; loser receives a stable duplicate-cell conflict.
- Existing legacy row; conflicting aliases; soft-deleted row; invalid/expired set; inactive period; mismatched program: reject or handle only as specified.
- Create vs delete/recreate, move vs create, two competing moves, stale row versions: no double occupancy, orphaned claim or deletion of another writer's row.
- Membership/assignment/mode revocation during retries: no stale-authority commit. Other workspace IDs and spoofed roles fail closed.
- Same idempotency key/payload replay and different payload/key reuse; server-confirm mismatch; offline/reconnect: no false success or duplicate logical mutation.
- Rules deny direct legacy and occupancy writes after cutover; Admin-writer compliance independently tested; duplicate backfill blocks reopening.

## Decision

Do not claim global uniqueness or patch only the browser preflight. Implement the reviewed trusted operation, write fence, compatibility adapter and Rules together in a future change. This task completes the requested review and records a reproducible counterexample. Production migration, deployment and IAM remain HOLD.
