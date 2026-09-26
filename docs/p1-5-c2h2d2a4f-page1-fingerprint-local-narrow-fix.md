# P1.5-C2H2D2A4F Page-1 Fingerprint Local Narrow Fix

## Verdict

`P1_5_C2H2D2A4F_FINGERPRINT_LOCAL_NARROW_FIX_PASS`

This local-only fix establishes one versioned, locale-independent collection
ID set fingerprint implementation. It performed no production, credential,
Firestore, IAM, or API operation.

## Canonical V1 Contract

```text
FINGERPRINT_VERSION = MYWEB_COLLECTION_ID_SET_V1
CANONICAL_SORT = UTF8_BYTE_LEXICOGRAPHIC
CANONICAL_ENCODING = VERSIONED_LENGTH_PREFIXED_UTF8
CANONICAL_HASH = SHA-256
NO_TRIM = yes
NO_CASE_FOLD = yes
NO_UNICODE_NORMALIZATION = yes
DUPLICATE_POLICY = REJECT
```

`computeCollectionIdSetFingerprintV1` accepts an array of exact non-empty
JavaScript strings. It rejects non-arrays, non-string IDs, empty IDs, exact
duplicates, and unrepresentable UTF-8 input with structured local error codes.
The empty set is intentionally valid and deterministic.

The exact V1 payload is:

1. UTF-8 bytes of `MYWEB_COLLECTION_ID_SET_V1`, followed by one NUL domain
   marker byte.
2. For each ID sorted with `Buffer.compare` on its UTF-8 bytes: a four-byte
   unsigned big-endian byte length, followed by the exact UTF-8 ID bytes.
3. SHA-256 of the complete byte stream, returned with the version and count.

No newline delimiter, locale, shell culture, case transform, trim, path
interpretation, or Unicode normalization participates in V1.

## Historical Regression Evidence

```text
LEGACY_POWERSHELL_SHA256 = 571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c
LEGACY_NODE_SHA256 = 6ffbc127fa36fdb1541a6bbbdf4c08da86fa2b5669451b59a0fc1ff8014d02c7
CANONICAL_V1_PAGE1_COLLECTION_SET_SHA256 = 71ed87d59b7b9f5183e49daecf0cb9bad18be8d138025dd036fbcb4a896ce80b

LOCAL_FINGERPRINT_DEFECT = CONFIRMED
ACTUAL_PRODUCTION_COLLECTION_MEMBERSHIP_CHANGE = NOT_ESTABLISHED
```

The legacy PowerShell value used culture-sensitive `Sort-Object`; the legacy
Node value used default string sorting. Both are retained only as
`LEGACY_OBSERVATION_FINGERPRINT` evidence and must not be used as a future
execution hard gate.

```text
CROSS_SESSION_PAGE1_COLLECTION_SET_SHA_HARD_GATE = RETIRED
LEGACY_HASH_ROLE = HISTORICAL_OBSERVATION_ONLY
```

The A3 historical label remains
`PAGE1_SET_MISMATCH_ABORT_UNDER_OLD_CONTRACT`. It was correct under that old
contract and does not establish a production collection mutation.

## Changed Files and Call Sites

| File | Purpose |
| --- | --- |
| `tools/authority-audit/collectionIdSetFingerprint.mjs` | Single V1 canonical implementation. |
| `tools/authority-audit-tests/workspace2Page1CollectionIds.fixture.mjs` | Approved historical 25-ID local regression fixture. |
| `tools/authority-audit-tests/collectionIdSetFingerprint.test.mjs` | V1 contract and legacy-defect regression tests. |
| `docs/p1-5-c2h2d2a3-workspace2-final-bounded-page2-live-discovery.md` | Historical A3 interpretation addendum; original verdict retained. |

`FINGERPRINT_CALL_SITES` currently contains the V1 helper test only. The prior
D2A/A3 calculations were bounded ephemeral sessions, not persisted production
discovery scripts. Any future source-discovery script must import this helper;
it must not implement an independent sorter or hash payload.

## Focused Local Validation

`node tools/authority-audit-tests/collectionIdSetFingerprint.test.mjs` passed.
The test covers the approved 25-ID known vector, input-order independence,
repeated determinism, UTF-8 byte order versus default string sorting,
Korean/non-ASCII input, byte-distinct Unicode forms, malformed inputs and
duplicates, empty-set behavior, content differences, and legacy Node evidence.

## Corrected Future Policy

```text
FRESH_SESSION_CONTINUATION_CHAIN = READY_FOR_APPROVAL_DESIGN
PRODUCTION_ACCESS_REQUIRED = no
```

Only a later approval design may authorize a fresh session: verify the
identity/security gates, obtain one short-lived credential, request fresh page
1 once, optionally record a V1 observation fingerprint, keep that response's
continuation in memory, request page 2 once if present, then stop. Historical
cross-session hash equality must not decide whether page 2 is allowed.

All existing safety gates remain: exact project/database/workspace/audit
identity, adapter hash and caller verification, one credential, bounded call
count, no retry, no document payload, no page 3, no workspace 3, no Stage-2,
and no canonical write.

## A4F Safety Accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_READS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
