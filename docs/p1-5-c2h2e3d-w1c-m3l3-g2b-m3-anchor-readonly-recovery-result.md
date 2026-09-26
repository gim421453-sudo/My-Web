# G2B M3 Anchor Read-Only Recovery Result

RECOVERY_RESULT=MEMBER_ABSENT_CONFIRMED
CURRENT_G2B_M3_STATE=CONFIRMED_ABSENT_AFTER_INDETERMINATE_MUTATION
ANCHOR_LIFECYCLE_STATE=RECOVERY_CONFIRMED_ABSENT
CANONICAL_POLICY_PARSE_RESULT=PARSED_CANONICAL_POLICY
HMAC_MATCH_COUNT_CATEGORY=ZERO

The approved single policy read completed with a valid preserved recovery
anchor and DPAPI secret generation. No target-role policy member matched the
authorization-grade HMAC anchor. This establishes absence after the consumed
indeterminate mutation; it does not authorize another M3 mutation.

NEXT_APPROVAL_REQUIRED=yes
NEXT_APPROVAL_TYPE=M3_RETRY_DECISION_OR_REDESIGN
M4_ALLOWED=no
RETRIES_ALLOWED=no
SECOND_M3_MUTATION_ALLOWED=no
