# Recovery-Anchor Implementation Gate

G2B exists and is enabled, but it has no IAM authority. The next local-only
prerequisite is to move the future recovery anchor from `DESIGN_ONLY` to
`IMPLEMENTED_AND_VERIFIED` with a protected-secret provider and verification
tests. Until then, preparing or executing G2B M3 is blocked.

```text
CURRENT_ANCHOR_STATE=DESIGN_ONLY
REQUIRED_NEXT_STATE=IMPLEMENTED_AND_VERIFIED
TARGET_GENERATION=REPLACEMENT_WRITER_GENERATION_2B
G2B_IAM_AUTHORITY_GRANTED=no
G2B_M3_AUTHORITY=NOT_GRANTED
REMOTE_OPERATIONS_AUTHORIZED=0
M3_AUTHORITY_PREPARATION_ALLOWED=no
```
