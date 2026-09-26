# Frozen Writer Quarantine and Generation-2 Rotation Design

## Frozen target

`myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com`
is `FROZEN_INDETERMINATE_M3_TARGET`. It is not reusable for M3, M4,
impersonation, Firestore migration, class writes, token generation, or trusted
production mutations. Only separately approved containment or read-only
forensics may name it.

Existing evidence does **not** prove the old writer's current enabled state,
M4 binding, custom data-role binding, Firestore authority, or other project
roles. The M3 prestate only showed that its custom data-role predicate was not
present at that time; it is not a current-state proof.

## Containment

The locally installed IAM v1 client exposes
`iam.projects.serviceAccounts.disable`, `enable`, and `get`. Its generated
documentation states that disabling rejects existing access tokens and blocks
new tokens; an ordinarily disabled account can be re-enabled. Disable is thus
the preferred reversible containment action over deletion, without guessing the
lost Token Creator member.

The future containment approval is deliberately separate:

```text
TYPE=OLD_WRITER_CONTAINMENT
PRESTATE_REMOTE_READS_MAX=1
MUTATION_ATTEMPTS_MAX=1
POSTSTATE_REMOTE_READS_MAX=1
PROJECT_IAM_READS_MAX=0
RETRIES=0
ROLLBACKS=0
M3_MUTATIONS=0
M4_MUTATIONS=0
FIRESTORE_ALLOWED=no
ACCESS_TOKEN_ALLOWED=no
CLOUD_LOGGING_ALLOWED=no
SERVICE_ACCOUNT_KEY_ALLOWED=no
```

No disable was executed here.

## Replacement writer

Candidate only, with no availability assertion:

`myweb-class-migration-writer-g2@my-management-app-8a933.iam.gserviceaccount.com`

This is `REPLACEMENT_WRITER_GENERATION_2`. It begins with no M3 binding, no M4
binding, no Firestore calls, no token calls, and no service-account keys. The
existing M2 custom-role definition remains conceptually unchanged:
`mywebClassMigrationCreateOnly` with `datastore.databases.get` and
`datastore.entities.create`. Rotation changes the target identity, not that
role's permission definition.

Historical M3/R1/R2/R3 evidence remains bound to the frozen writer. Future
generation artifacts must bind the replacement writer through the centralized
quarantine guard rather than a global replacement.

## Future recovery anchor

The design uses a domain-separated HMAC-SHA256 of the canonical IAM member,
target resource, role, session generation, and operation ordinal. The HMAC key
must come from a Windows DPAPI-protected local secret provider; no key, raw
member, token, or display fingerprint is persisted in evidence. DPAPI is
available on this Windows host, but the secret provider itself is intentionally
not implemented by this local design batch.

State progression is:

`ANCHOR_NOT_CREATED -> ANCHOR_CREATED -> ANCHOR_VERIFIED -> MUTATION_STARTED`

The mutation transition is unreachable before `ANCHOR_VERIFIED`. Future
indeterminate recovery compares policy members in memory against the persisted
anchor and emits only bounded outcomes. It does not need a new OP-A when the
protected anchor is available.

The frozen session cannot be retrofitted with an anchor.

## Dependency impact

Old-writer bindings are present in the current M3 runtime, M3 graph, approval
packets, recovery artifacts, runtime tests, and historical evidence. They stay
historical. New generation work must create a separate target lock, runtime and
capability attestation, final M3 composite, M3 approval, and distinct M4 target
packet before any replacement writer is used.

```text
REMOTE_OPERATIONS=0
IAM_READS=0
IAM_MUTATIONS=0
SERVICE_ACCOUNT_CREATE=0
SERVICE_ACCOUNT_DISABLE=0
SERVICE_ACCOUNT_DELETE=0
M3_MUTATIONS=0
M4_MUTATIONS=0
FIRESTORE=0
TOKEN=0
LOGGING=0
```
