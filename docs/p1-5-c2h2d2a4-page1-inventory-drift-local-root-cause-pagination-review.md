# P1.5-C2H2D2A4 Page-1 Inventory Drift Local Root-Cause Review

## Verdict

`P1_5_C2H2D2A4_LOCAL_FINGERPRINT_DEFECT_FOUND`

The A3 abort correctly followed its approved hard gate. Local reconstruction
now shows that the observed mismatch is fully explained by different sorting
contracts, not by established production collection membership change.

## Verified local fingerprint analysis

```text
ORIGINAL_PAGE1_HASH = 571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c
A3_REPLAY_PAGE1_HASH = 6ffbc127fa36fdb1541a6bbbdf4c08da86fa2b5669451b59a0fc1ff8014d02c7

ORIGINAL_PAGE1_IDS_AVAILABLE = yes
ORIGINAL_ID_SOURCE = docs/p1-5-c2h2d2a-workspace2-single-run-collection-id-live-inspection.md
A3_REPLAY_PAGE1_IDS_AVAILABLE = no
EXACT_PAGE1_SET_DELTA = UNAVAILABLE
```

The original 25 IDs are approved metadata retained in the D2A result document.
The A3 replay IDs were deliberately held only in process memory, so no local
set delta can be reconstructed and no new production request is justified.

Using the retained original 25 IDs as one local fixture produced:

```text
POWERSHELL_LF_CANONICAL_HASH = 571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c
NODE_LF_CANONICAL_HASH = 6ffbc127fa36fdb1541a6bbbdf4c08da86fa2b5669451b59a0fc1ff8014d02c7
```

The Node result equals the A3 replay hash exactly. This is strong local
evidence that A3 observed the same collection-ID membership as the retained
original fixture but ordered it differently. It does not establish a cloud
mutation; the exact A3 set is still not retained for a literal set diff.

## Contract comparison

| Field | Original D2A/A1 contract | A3 contract | Result |
| --- | --- | --- | --- |
| Input source | Retained first-page 25 IDs | In-memory replay page-1 IDs | Different observation source, but no membership change is established. |
| Normalization | Exact ID strings | Exact ID strings | Identical. |
| Sort | PowerShell `Sort-Object` culture-sensitive ordering | Node `Array.sort()` default UTF-16 code-unit ordering | Different. |
| Separator | LF only | LF only | Identical. |
| Trailing separator | none | none | Identical. |
| Encoding | UTF-8 | UTF-8 | Identical. |
| Hash | SHA-256 | SHA-256 | Identical. |

```text
HASH_ALGORITHM_IDENTICAL = yes
NORMALIZATION_IDENTICAL = yes
SORTING_IDENTICAL = no
SEPARATOR_IDENTICAL = yes
ENCODING_IDENTICAL = yes
HASH_CONTRACT_IDENTICAL = no

PAGE1_MISMATCH_ROOT_CAUSE = LOCAL_FINGERPRINT_CONTRACT_MISMATCH
ACTUAL_PRODUCTION_COLLECTION_MEMBERSHIP_CHANGE = NOT_ESTABLISHED
```

The original canonical input was a deterministic PowerShell sort, LF newline
join without a trailing separator, UTF-8 bytes, then SHA-256. A3 used the same
input normalization, LF, no trailing separator, UTF-8, and SHA-256, but Node's
default sort. The two sort comparators are not interchangeable.

## Pagination-policy decision

The supplied REST-contract evidence does not guarantee stable first-page
membership or page boundaries across independent sessions. Therefore an older
page-1 fingerprint is useful historical evidence but is not a safe
authorization or pagination hard gate.

```text
PAGE1_SET_MISMATCH_OBSERVED = yes
STATE_DRIFT_SEMANTICS = LOCAL_HASH_CONTRACT_DEFECT
CROSS_SESSION_PAGE1_FINGERPRINT_GATE_VALID = no
OLD_PAGE1_SHA_ROLE = INVALID_DUE_LOCAL_DEFECT
FRESH_SESSION_CONTINUATION_CHAIN_VALID = yes
EXPLICIT_READTIME_VALUE = NOT_NEEDED
```

No explicit read-time is recommended now: using a fresh page-1 continuation
immediately for page 2 is the minimum-complexity bounded chain, while an added
read-time contract would need separate validation and must not require another
call solely to acquire one.

## Source-discovery value and next action

```text
WORKSPACE_2_INSPECTION_VALUE = HIGH
FINAL_FRESH_SESSION_DISCOVERY_VALUE = HIGH
STOP_DISCOVERY_VALUE = LOW
RECOMMENDED_NEXT_ACTION = LOCAL_FINGERPRINT_NARROW_FIX
ADDITIONAL_PRODUCTION_ACCESS_REQUIRED = no
EXECUTION_AUTHORIZED = no
```

The sole next action is **P1.5-C2H2D2A4F Page-1 Fingerprint Local Narrow Fix**:
define one language-neutral canonical ordering comparator, add a local
cross-runtime fixture test, and revise the page-1 check from a cross-session
hard gate to a historical observation. It must not make a production request.

After that local fix is separately verified, a later fresh-session page-1 to
page-2 approval may use one credential, at most two metadata calls, the
in-memory continuation from that same page-1 response, zero document payload,
zero retry, and no page 3. All identity, target, bounded-call, and no-write
hard gates remain mandatory.

## A4 safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
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
