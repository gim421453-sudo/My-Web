# Replacement Writer Identity Redesign

The historical generation-2 candidate account ID
`myweb-class-migration-writer-g2` is 31 characters long. The approved create
session confirmed the provider rejects account IDs outside the 6–30 character
range. That candidate remains historical-only and must not be retried.

The new local candidate is `myweb-class-mig-writer-g2` (25 characters), with
semantic generation `REPLACEMENT_WRITER_GENERATION_2B`. Its availability is
not asserted. It has no IAM role binding, no M3/M4 authority, no Firestore
authority, and no token authority. The next remote action must be a separate
one-read `READ_ONLY_REPLACEMENT_WRITER_2B_PREFLIGHT`; no create is authorized.
