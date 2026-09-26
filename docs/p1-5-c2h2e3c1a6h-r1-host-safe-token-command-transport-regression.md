# P1.5-C2H2E3C1A6H-R1 Host-Safe Token Command Transport Regression

## Verdict

`P1_5_C2H2E3C1A6H_R1_HOST_SAFE_TRANSPORT_REGRESSION_PASS`

The previous response used the C1A6H strategy label and did not contain
preserved R1-specific host transport evidence. The missing R1 checks were
executed now using a test-only synthetic Node process through the existing
Windows PowerShell adapter. No gcloud process was spawned.

## Baseline

- Previous response stage label:
  `P1_5_C2H2E3C1A6H_STRATEGY_A_NARROWER_SECURITY_IMPLEMENTATION_PASS`
- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- R1 runtime code files changed during this continuation: `0`

## R1 Evidence

- Real gcloud process spawn count: `0`
- Verbosity flag present: `yes`
- Verbosity flag value: `error`
- Verbosity flag count: `1`
- Verbosity argument transported exactly: `yes`
- Argument boundary preservation: `PASS`
- Windows host transport validated: `yes`
- Exit-code preservation: `PASS` for `0`, `1`, and `7`
- Stdout/stderr separation: `PASS`
- LF transport: `PASS`
- CRLF transport: `PASS`
- Token plus terminal CRLF accepted: `yes`
- Security accepted stderr variants: `EMPTY_ONLY`
- Old benign warning accepted: `no`
- UNKNOWN stderr accepted: `no`
- Newly accepted UNKNOWN stderr cases: `0`
- Current security surface narrower: `yes`
- Diagnostic analyzer can override security: `no`

The synthetic argument probe verified the complete five-argument token
contract, including exactly one `--verbosity=error` argument, across the
Node-to-PowerShell host transport. The synthetic process never contacted a
network or authentication service.

## Synthetic Failure Matrix

Passed locally:

- nonzero exit
- timeout regression from existing synthetic coverage
- empty stdout
- malformed token
- token plus extra nonblank stdout
- old nonempty warning stderr
- UNKNOWN warning stderr
- ERROR-like stderr

All remained rejected, and no HTTP path was invoked.

## Security and Privacy

- Token privacy: `PASS`
- Stderr privacy: `PASS`
- Token file write/persistence/logging: `0/0/0`
- Authorization logging: `0`
- Access-token calls: `0`
- Firestore calls: `0`
- IAM mutations: `0`
- Commit/staging/push/deploy: `0`

Only synthetic sentinels were used. No real token, raw stderr, raw stdout,
caller identity, Authorization value, or credential was stored or returned.

## Focused Tests

Six focused tests passed:

1. `c1a6H-R1HostSafeTransport.test.mjs`
2. `gcloudTokenOutputClassifier.test.mjs`
3. `gcloudStderrDiagnosticAnalyzer.test.mjs`
4. `c1a3ExactClassStateReadCaller.test.mjs`
5. `exactClassStateRead.test.mjs`
6. `windowsProcessSynthetic.test.mjs`

The new host test is test-only and is not a production runtime dependency.

## Provisional Runtime Hashes

These are provisional C1A7 preparation hashes, not final live locks:

```text
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
9b586a7c22661c728f6f3c0b2963430f73de5e90f2cac07c6452947f11851f18

tools/authority-audit/gcloudTokenOutputClassifier.mjs
26bc0a51fef813096b65f5f7c2d65832154b128583dd5be1d9aa3f7ceaad4613

tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs
660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656

tools/authority-audit/windowsGcloudProcessAdapter.mjs
512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f

tools/authority-audit/invokeWindowsExecutable.ps1
2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5

tools/authority-audit/exactClassStateRead.mjs
7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776
```

## Next Gate

- C1A7 live approval: `NOT_GRANTED`
- Recommended next action:
  `P1.5-C2H2E3C1A6H-R2 STRATEGY-A FINAL RUNTIME RELOCK + C1A7 LIVE APPROVAL GATE`

Do not generate a token or run gcloud until the next relock and explicit live
approval are complete.
