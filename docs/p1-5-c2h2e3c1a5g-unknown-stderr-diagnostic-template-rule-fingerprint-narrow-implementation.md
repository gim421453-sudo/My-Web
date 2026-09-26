# P1.5-C2H2E3C1A5G Unknown Stderr Diagnostic Enrichment

## Verdict

`P1_5_C2H2E3C1A5G_SAFE_STDERR_DIAGNOSTIC_ENRICHMENT_PASS`

This batch was local implementation and synthetic validation only. No real
caller discovery, gcloud command, access token, impersonation, Firestore,
IAM, or production data access occurred.

## Baseline and Historical Contract

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- C1A5 historical verdict: `P1_5_C2H2E3C1A5_TOKEN_PIPELINE_REJECTED`
- C1A5 historical budget: `EXHAUSTED`
- C1A5F verdict: `P1_5_C2H2E3C1A5F_CURRENT_DIAGNOSTICS_INSUFFICIENT`
- Historical root cause confirmed: `no`
- C1A4G runtime lock before this batch: unchanged

## Diagnostic/Acceptance Separation

Added a pure diagnostic analyzer at
`tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs`. The existing
whole-buffer classifier remains the security decision. Diagnostic results
cannot override acceptance, and rule IDs, template IDs, or fingerprints cannot
accept a token.

- Diagnostic result can override acceptance: `no`
- Diagnostic rule match can accept token: `no`
- Diagnostic template match can accept token: `no`
- Diagnostic fingerprint can accept token: `no`
- Token acceptance behavior changed: `no`
- Stderr allowlist changed: `no`
- UNKNOWN stderr remains rejected: `yes`

The classifier's existing operation, timeout, exit-code, token-format,
whole-buffer stderr, and provider behavior are preserved.

## Added Safe Diagnostic Schema

Each stderr line now carries the existing fields plus:

```text
matchedRuleIds: string[]
normalizedTemplateId: string
normalizedFingerprint: sha256:<64 lowercase hex>
```

The public diagnostic result never contains raw or normalized free-form line
text. Stable rule IDs include impersonation notice, impersonation continuation,
credential/configuration notice, warning/error prefix, and terminal blank line.
Known local template IDs are limited to the two existing impersonation-warning
line forms. Unknown lines use `UNKNOWN_TEMPLATE`.

Normalization is deterministic and minimal. It redacts the audit service
account, generic emails, paths, URLs, known project identifiers, large numeric
identifiers, timestamps, UUID-like values, and long hex identifiers before
whitespace normalization and UTF-8 SHA-256. The raw normalized string is never
returned. Fingerprints are diagnostic comparison values only and do not imply
benignness.

## Local SDK Evidence

The installed local Cloud SDK source was inspected without executing gcloud.

- Local SDK source available: `yes`
- SDK version metadata: `580.0.0`
- Broad textual impersonation-related matches: `149` files
- Focused access-token surface candidates: `3` local modules
- Runtime catalog dynamically parses SDK source: `no`

The repository uses a small static diagnostic catalog. Local SDK source is
evidence only and is not a security authority or acceptance allowlist.

Focused local source evidence was recorded by file hash only:

```text
lib/surface/auth/print_access_token.py
sha256:1b670df8c6b98d1de7f4d391e37a3dac7f1daf27161684b4095e6e7a7249adf9

lib/googlecloudsdk/api_lib/iamcredentials/util.py
sha256:c25834c8dd2ee5d1b23513d251480e2005a03b48958b730dfb7f0a87233e6140

lib/googlecloudsdk/command_lib/auth/flags.py
sha256:f05faf16038ff4f3efb1e7e4ee9169538d17a96a6b52993630cf6dc66fbfdf49
```

No raw SDK warning template text is included.

## Synthetic Validation

Passed cases:

- known benign impersonation line: rule/template IDs and fingerprint emitted
- unknown warning: `UNKNOWN_TEMPLATE`, fingerprint emitted, classifier rejects
- unknown error: error prefix diagnostic, classifier rejects
- impersonation plus unknown: known IDs on the first line, unknown template and
  fingerprint on the second, classifier rejects and HTTP remains zero
- repeated same unknown sanitized line: same fingerprint
- different synthetic emails: same normalized fingerprint
- different synthetic paths: same normalized fingerprint
- distinct unknown messages: distinct fingerprints
- normalization over-collapse: `no`
- raw stderr sentinel absent from serialized diagnostics
- fake token/caller/Authorization privacy sentinels absent
- previously accepted and rejected classifier fixtures: unchanged
- caller/provider, exact executor, and Windows synthetic regressions: passed

## Runtime and Test Locks

C1A4G is invalidated by this runtime diagnostic change. These are provisional
hashes only and are not live-approved locks.

```text
runtime tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs
sha256:660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656

runtime tools/authority-audit/gcloudTokenOutputClassifier.mjs
sha256:9fd7f7f2e2ae7ae99d9ead451ce259854f8060443d58a865eb452c50dcab4aba

runtime tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
sha256:4b24f8a10df98db85958f9e134e907ccea14b9758c1b288b98c2f7a026903a80

runtime tools/authority-audit/exactClassStateRead.mjs
sha256:7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776

runtime tools/authority-audit/windowsGcloudProcessAdapter.mjs
sha256:512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f

runtime tools/authority-audit/invokeWindowsExecutable.ps1
sha256:2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
```

Changed test files:

```text
tools/authority-audit-tests/gcloudStderrDiagnosticAnalyzer.test.mjs
sha256:dbf1c53e919f8af26c6ac1249711d753f3a72d6bf514b04c2b481f408b6caf04

tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs
sha256:43616113d4a1a7408c991550f585de9baf98e2dc45093b316624d6050d6de3d1
```

The caller, exact executor, Windows adapter, and PowerShell runner were not
modified. The runtime lock is therefore `INVALIDATED_BY_C1A5G` only because
the classifier and diagnostic graph changed; no future live attempt is
authorized by this document.

## Safety Counters

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_GCLOUD_AUTH_CALLS = 0
LIVE_IMPERSONATION_CALLS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next Gate

`P1.5-C2H2E3C1A5G-R — DIAGNOSTIC-ENRICHED FINAL EXECUTION RELOCK + C1A6 LIVE APPROVAL GATE`

C1A6 live approval remains `NOT_GRANTED`. Any future live attempt must stop on
UNKNOWN stderr even if diagnostic IDs identify a known local template; offline
review must precede any acceptance change.
