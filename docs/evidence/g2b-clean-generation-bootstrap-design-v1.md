# G2B Clean Generation Bootstrap Design

**Design decision: `CLEAN_BOOTSTRAP_DESIGN = READY`**  
**Execution status: DESIGN ONLY; no generation, anchor, manifest, attestation, source lock, packet, or remote operation was created.**

## Problem and Historical Boundary

The manual lineage review established that generation `214348c8-3be0-44f8-a010-adbe1ac68090` is terminal at `RECOVERY_CONFIRMED_ABSENT`, generation `8b30e1da-8d4d-4ded-ad94-cf62aabcc981` is a historical CAS generation, their lineage is unproven, and no unique canonical generation can be resolved. Keep both records, evidence chains, packets, source locks, attestations, results, and journals immutable and historical. Neither generation is a parent, successor, recovery parent, or source of inherited trust for a new generation.

Bind the review only as `BOOTSTRAP_CONTEXT_EVIDENCE`, using its JSON SHA-256 `8ed36e28f8c8ede6db7daaef738d01183c0e14445625896a172c49844d86b31a` and Markdown SHA-256 `918f00eb3b0dc9ad41b5005826ee0e79ed01481a8c0ef98b966a8f849c2371d0`. Record the historical IDs and `historicalLineageStatus: UNRESOLVED` as context, not graph edges.

## Reuse Versus Trust

| Item | Physical/input reuse | Trust/result reuse |
|---|---|---|
| Existing CurrentUser DPAPI protected secret blob | Conditional: same Windows user/profile, read-only unprotect succeeds, protected blob unchanged, integrity succeeds; never regenerate or persist plaintext | None; unprotect/integrity must be freshly verified in this bootstrap |
| Existing HMAC anchor secret material | Conditional reuse of the protected secret asset only | None; recompute a new generation-bound anchor from current canonical inputs; do not copy old anchor/integrity digests or state |
| Pinned identity configuration | May be input | None; canonicalize account/member and verify current identity independently |
| Target resource and role definitions | May be input from current source | None; validate exact current canonical values and source fingerprint |
| Historical identity/source/anchor fingerprints, ETags, CAS results, approvals, mutation/recovery results, attestations | Reference for audit only | Never inherit or use to authorize current work |

Raw secret, plaintext DPAPI output, credentials, tokens, raw IAM policy, and raw principal values must not enter records, logs, or evidence. Persist only approved opaque fingerprints and safe outcome metadata.

## State and Record Model

Use a new versioned clean-bootstrap ledger and do not overload the current recovery-anchor schema. The current anchor schema accepts `ANCHOR_PERSISTED` through terminal recovery states; the current transition table has `ANCHOR_PERSISTED -> ANCHOR_VERIFIED`, but no `BOOTSTRAP_FAILED`. The current store also rewrites the same record on transition and counts `ANCHOR_VERIFIED` as active, so its global single-active guard blocks a new candidate while the historical 8b record remains active. These are compatibility constraints, not reasons to edit or retire historical records. The implementation must use a separate clean-generation namespace/registry and immutable events, with an explicit single-candidate lock.

The existing anchor record schema accepts `ANCHOR_PERSISTED`, `ANCHOR_VERIFIED`, `MUTATION_STARTED`, `MUTATION_CONFIRMED`, `MUTATION_INDETERMINATE`, `RECOVERY_CONFIRMED_PRESENT`, `RECOVERY_CONFIRMED_ABSENT`, and `RECOVERY_AMBIGUOUS`. Its transitions include `ANCHOR_PERSISTED -> ANCHOR_VERIFIED -> MUTATION_STARTED`, then `MUTATION_STARTED -> MUTATION_CONFIRMED | MUTATION_INDETERMINATE`, and either mutation outcome can transition to one of the three recovery outcomes. The active-state counter includes `ANCHOR_CREATED`, `ANCHOR_PERSISTED`, `ANCHOR_VERIFIED`, `MUTATION_STARTED`, and `MUTATION_INDETERMINATE`; `ANCHOR_CREATED` is not an accepted persisted anchor-record state in the current schema. These observations are existing implementation behavior, not proposed terminal bootstrap states.

The anchor record's initial persisted state is `ANCHOR_PERSISTED`, never `ANCHOR_VERIFIED`. The clean-bootstrap orchestration phase is separate from anchor lifecycle state:

```text
INTENT_CREATED -> CANDIDATE_CREATED -> ANCHOR_VERIFYING -> ANCHOR_VERIFIED
               -> MANIFEST_ACTIVATED -> ATTESTATION_ELIGIBLE
Any pre-activation failure -> ABORTED (ledger event; anchor state is not rewritten)
Post-activation validation failure -> CANONICAL_INELIGIBLE (append-only event; no historical fallback)
```

`ANCHOR_VERIFIED` is emitted only after the existing actual checks succeed: CurrentUser DPAPI unprotect; HMAC/integrity; exact generation; identity; host context; and current canonical source binding. The immutable verification event records generation, previous/new anchor state, safe fingerprints, booleans/outcome, timestamp, verifier/schema version, and its digest. The event contains no raw secret/member/policy. A verification failure never creates an attestation or eligible manifest entry.

The create-only generation record contains `schemaVersion`, `generationId`, `createdAt`, `bootstrapType: CLEAN_BOOTSTRAP`, `historicalLineageStatus: UNRESOLVED`, `bootstrapReason: CLEAN_BOOTSTRAP_AFTER_UNRESOLVED_HISTORICAL_LINEAGE`, `historicalReviewEvidenceDigest`, current identity/host/source/anchor-material-reference fingerprints, initial state `ANCHOR_PERSISTED`, and `creationDigest`. Use strict schema validation and reject unknown/secret-bearing fields.

## Canonical Manifest and Resolver

A canonical manifest is required because existing artifacts contain multiple generations and no authoritative current pointer. It is not sufficient by itself. Proposed versioned manifest fields: `schemaVersion`, monotonic `manifestVersion`, `canonicalGenerationId`, lifecycle state, `anchorVerificationEvidenceDigest`, `identityFingerprint`, `hostContextFingerprint`, `sourceFingerprint`, `activatedAt`, `previousManifestDigest` (or explicit genesis marker), and `manifestDigest` over canonical content.

Activation uses a local exclusive lock and compare-and-swap against the exact previous manifest digest. Persist a validated temp file, flush it, round-trip parse it, then atomically publish the next manifest version without editing prior immutable events. Lock collision, stale lock, unknown write result, digest mismatch, or two active eligible candidates fails closed; do not auto-delete a stale lock. Recovery inspects the exact expected/current digest and resumes the same bootstrap operation only when all immutable inputs match. Otherwise require manual review.

Resolver accepts exactly one candidate only when all conditions hold: manifest digest/schema/chain valid; manifest generation exists; its latest immutable anchor verification event is digest-valid and `ANCHOR_VERIFIED`; lifecycle is nonterminal; current identity/host/source bindings match; a fresh host attestation is bound to that generation, verification digest, and current bindings; and no second active eligible generation or unresolved manifest exists. A manifest pointer cannot promote a generation without referenced evidence. Historical generations are never auto-selected as fallback.

No existing schema defines canonical-manifest semantics. The manifest and resolver above are a proposed new contract and require implementation plus negative tests before use.

## Attestation and CAS/Mutation Reset

Create a new host attestation only after the clean generation has an immutable `ANCHOR_VERIFIED` event and canonical manifest activation. Bind it to the new generation ID, verification-event digest, current source/identity/anchor/host fingerprints, signer key identifier fingerprint, and freshness timestamp. Never copy or refresh an old generation's attestation. Terminal/historical generations are ineligible.

`READ_ELIGIBLE` requires resolver PASS and a fresh attestation. `MUTATION_ELIGIBLE` is a separate, stricter result and remains false until a separate execution packet is explicitly approved and its own prestate/CAS/ETag/returned policy version/exact delta gates pass. Read eligibility never implies mutation eligibility.

Reset all CAS state. The only allowed future read chain is: new clean generation -> verified anchor event -> activated manifest -> fresh attestation -> fresh read-only approval -> credential refresh (only if separately authorized) -> fresh IAM policy read -> fresh ETag and returned policy version -> fresh relevant-binding digest -> new CAS classification. Historical `MEMBER_ABSENT_CONFIRMED` is not current absence. Existing mutation indeterminate state remains historical risk context, not new-generation state. Do not reuse old read or mutation approvals, ETags, policy versions, binding digests, or results.

## Idempotency, Crash Recovery, and Abort

Use a caller-approved bootstrap intent ID and a distinct operation ID, each bound to immutable canonical inputs. Enforce one in-flight candidate using an exclusive create-only lock. Candidate creation, verification events, and audit events are create-only. Duplicate exact intent may resume the same operation; changed inputs, a second candidate, or a conflicting active manifest blocks. Never silently generate another ID after an ambiguous write.

| Crash window | Restart behavior |
|---|---|
| Before intent record | No state exists; start only under a new explicit local approval |
| Intent exists, candidate absent | Resume same intent and operation after validating exact intent digest |
| Candidate exists, before verification | Revalidate exact candidate; resume the same generation; do not create another |
| Verification in progress | Treat outcome as unknown; repeat only local validation under same candidate and append a distinct attempt result; no attestation |
| Verified event exists, manifest absent | Revalidate bindings and CAS expected prior manifest, then resume activation for that same candidate |
| Manifest publication outcome unknown | Read local manifest only; exact new digest means committed, exact prior digest allows same-operation CAS retry, anything else blocks |
| Manifest active, attestation absent | Recheck manifest, verification event, identity/source/host bindings; create attestation only if all are still valid |

Use temp-write, fsync, JSON round-trip, atomic create-only publication for immutable records. Canonical manifest updates use lock + version/digest CAS and atomic replace; historical manifest versions remain immutable. On abort, append `ABORTED` to the orchestration ledger and leave the anchor record as-is. If repository integration cannot represent safe abort without editing an existing anchor, do not mutate it; quarantine the candidate in the new ledger and block further bootstrap pending manual recovery. After activation, failure appends `CANONICAL_INELIGIBLE`; never roll back to either historical generation or delete evidence. No existing anchor state named `BOOTSTRAP_FAILED` exists, so do not invent one in the legacy anchor enum.

## Audit, Approval, and Test Plan

Audit events bind reason, review digest, historical IDs, unresolved ambiguity, new ID, input fingerprints, anchor verification digest, manifest activation digest, and outcome. No event grants IAM authority by itself.

Future approval boundaries: (1) one explicit **local clean-generation bootstrap** approval covering local asset revalidation, new candidate/event creation, manifest activation, attestation eligibility evaluation, and preparation of a read-only packet; (2) a fresh **remote CAS read** approval; (3) a separate **remote IAM mutation** approval only if current fresh CAS proves a mutation is necessary. Existing approvals are historical and non-reusable. Local approval is required because the operation creates local authority state even though it makes no remote call.

In-memory/temp-only E2E simulation must cover ambiguous history -> clean candidate -> verification -> manifest activation -> attestation eligibility -> read-packet eligibility. Negative cases: active generation already exists; two candidates; verification failure; identity/source mismatch; manifest digest mismatch; unresolved canonical choice; historical approval reuse; historical CAS reuse; selecting either historical generation; interrupted manifest publication; stale lock; duplicate intent. All negative paths remain ineligible and have zero remote calls. The associated simulation for this design passed (details in companion JSON); it used synthetic values only and wrote no repository authority artifacts.

Likely implementation scope, only after a separate explicit local implementation approval: new clean-bootstrap ledger/store and orchestration module; canonical manifest/CAS store; strict resolver; dedicated in-memory/temp integration fixtures and attack-matrix tests; schema/operations documentation. Existing historical evidence, production code exports, IAM/Firestore data, and the two historical generation records are out of scope.

## Scope Result

Design: **READY**. Code modifications: 0. New generation/anchor/manifest/attestation/source lock/approval packet: 0. Remote calls and all writes: 0. Staging/commit/push/deploy: 0. Next stage: `EXPLICIT_LOCAL_CLEAN_GENERATION_BOOTSTRAP_IMPLEMENTATION_APPROVAL`.
