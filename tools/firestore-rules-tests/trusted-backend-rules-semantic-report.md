# Trusted Backend Rules Candidate Semantics

These files are isolated Emulator fixtures. They are not referenced by
`firebase.json`, do not replace `firestore.rules`, and are not deployable before
the trusted endpoint and client cutover sequence is complete.

## Direct-read classification

| Client read | Classification | Candidate result |
| --- | --- | --- |
| Own `users/{uid}` | KEEP_DIRECT_READ | TRANSITION and STRICT allow `get`. |
| Own canonical membership | KEEP_DIRECT_READ | Both allow `get`. |
| Active canonical workspace | KEEP_DIRECT_READ | Both allow canonical members and active system owners. |
| Canonical members management list | KEEP_DIRECT_READ | Both allow active system owners and canonical manager roles. |
| Own canonical admin application | KEEP_DIRECT_READ | Both require schema v1 and matching `applicantUid`. |
| Admin application management list | KEEP_DIRECT_READ | Both require an active canonical system owner. |
| Own `systemOwners/{uid}` | KEEP_DIRECT_READ | Both allow own `get`; list is denied. |
| Legacy membership diagnostics | REMOVE_LEGACY_DEPENDENCY | TRANSITION allows minimum scoped reads; STRICT denies. |
| Active legacy invite lookup by code | MOVE_TO_BACKEND | TRANSITION allows `invites` get only; targeted email must match a verified Auth email. STRICT denies. |
| Canonical invitation/index/redemption | MOVE_TO_BACKEND | Both deny direct client access. |
| Security audit/idempotency records | MOVE_TO_BACKEND | Both deny direct client access. |
| Owner workspace discovery query by `ownerUid` | MOVE_TO_BACKEND | Candidate workspace reads use canonical authority only. |

## TRANSITION vs STRICT

| Path | TRANSITION read | TRANSITION write | STRICT read | STRICT write | Cutover prerequisite |
| --- | --- | --- | --- | --- | --- |
| `workspace_members` | Own, canonical manager, canonical owner | Deny | Deny | Deny | Remove legacy diagnostics dependency. |
| `workspaceMembers` | Own, canonical manager, canonical owner | Deny | Deny | Deny | Remove camel-case fallback. |
| `invites` | Active-code `get`; targeted email requires verified Auth email match | Deny | Deny | Deny | Route validation/redemption through trusted endpoint. |
| `invitations` | Deny | Deny | Deny | Deny | No client read call site was found. |
| `workspaces/*/inviteCodes` | Deny | Deny | Deny | Deny | No client read call site was found. |

All canonical authority writes are backend-only in both candidates. Both remove
the `users.role` owner fallback, legacy membership AuthZ fallback, broad owner
catch-all, and broad unmatched access.

## RULE_CUTOVER_BLOCKERS

- `services/systemAdminService.js` still performs direct client approval,
  membership, user authority, workspace lifecycle, and admin-application writes.
- `services/invitationService.js` still writes `invites`, `invitations`, and
  nested `inviteCodes` sequentially and submits legacy join-request writes.
- `app.js` still contains direct legacy membership/user role synchronization.
- `src/workspace/workspaceRepository.ts` still reads legacy membership mirrors.
- `src/auth/authRepository.ts` still uses an `ownerUid` workspace discovery query.
- No production trusted endpoint exports or client adapters exist yet.
- The authority-only fixtures intentionally do not carry forward unrelated
  operational collection policy. Integration with the full application Rules is
  a separate reviewed step.

## Security-auditor result

```json
{
  "score": 3,
  "summary": "The isolated authority candidates fail closed and block direct authority mutation. They are not full application Rules and must not be deployed before integration and client cutover.",
  "findings": [
    {
      "check": "Business Logic vs. Rules",
      "severity": "major",
      "issue": "The fixtures intentionally deny unrelated operational collections and existing direct authority writes, so deploying either file as the complete Rules would break the current client.",
      "recommendation": "Integrate the reviewed authority matches into the full Rules only after trusted endpoints and client adapters are verified."
    },
    {
      "check": "PII exposure",
      "severity": "moderate",
      "issue": "TRANSITION retains full-document legacy invite lookup because Firestore cannot return selected fields. A holder of an untargeted active code can read that legacy document.",
      "recommendation": "Move code validation to trustedRedeemInvitation and remove the legacy read before STRICT."
    },
    {
      "check": "Update Bypass and Authority Source",
      "severity": "minor",
      "issue": "No client create/update/delete path exists for canonical authority. User self-update is identity-bound, field-diff allowlisted, type-bounded, and currentWorkspaceId requires canonical active membership.",
      "recommendation": "Retain the attack matrix when integrating these matches into the full Rules."
    }
  ]
}
```

## Proposed cutover sequence

1. Prepare backend production runtime and least-privilege IAM.
2. Dark-deploy trusted endpoints and verify authentication/authorization gates.
3. Implement and test client adapters without removing rollback paths.
4. Deploy the client using trusted operations for authority mutations.
5. Verify direct authority writes have reached zero.
6. Integrate and Emulator-test the TRANSITION authority policy with full app Rules.
7. Deploy TRANSITION only after compatibility blockers are closed.
8. Run migration inventory, dry-run, backup, approval, and canonical migration.
9. Remove legacy reads from clients and verify canonical parity.
10. Integrate, test, and deploy STRICT as a separate change.
