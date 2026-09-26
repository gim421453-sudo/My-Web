# P1.5-C2H2E3C1A1 gcloud impersonation warning stderr narrow fix

## Scope

This is a local implementation and regression-validation package only. It does not retry the historical production read, generate a live token, access Firestore, call IAM, persist a manifest, or change Rules/Indexes.

Historical C1A remains `P1_5_C2H2E3C1A_STATE_READ_INCONCLUSIVE`: one token-generation attempt occurred, zero Firestore document reads occurred, and no retry was authorized.

## Root cause

The C1A attempt invoked gcloud through the Windows PowerShell layer while `$ErrorActionPreference` was `Stop`. gcloud returned a successful exit code and a valid token on stdout, but also emitted its known service-account-impersonation warning on stderr. PowerShell surfaced that native stderr as an error record before the caller could consume the successful process result. The request therefore stopped before the HTTP client and no Firestore read was made.

The repository process adapter already keeps stdout and stderr separate and preserves the child exit code. The narrow fix is in `tools/authority-audit/invokeWindowsExecutable.ps1`: only the native executable invocation uses `Continue`; payload validation remains fail-closed under `Stop`, and the original exit code is returned unchanged.

## Classification contract

`tools/authority-audit/gcloudTokenOutputClassifier.mjs` classifies only the `impersonated-access-token` operation. It accepts a strict single-line synthetic/token-shaped stdout value when exit code is zero and stderr is empty or exactly the known two-line impersonation warning shape. Unknown stderr, non-zero exit, timeout, unsupported operation, empty output, malformed output, and multiline output fail closed. The warning principal is matched but never emitted by the classifier.

There is no global stderr suppression and no live token in the implementation or fixtures.

## Local validation

- Synthetic known-warning plus zero exit: pass.
- Empty stderr plus zero exit: pass.
- Unknown stderr: rejected.
- Non-zero exit with known warning: rejected.
- Non-zero real error: rejected.
- Empty, malformed, and multiline stdout: rejected.
- Timeout: rejected.
- Non-token operation: rejected.
- Windows process adapter synthetic warning fixture: pass.
- Existing adapter test's gcloud version/help preflight: blocked in this sandbox by local process launch (`EPERM`, `exitCode=null`); it was not retried as a credential or API operation.
- `git diff --check`: pass apart from pre-existing line-ending warnings in unrelated dirty files.

## Change boundary

Changed only the Windows native-process error-action boundary, the pure token-result classifier, and local tests/documentation. No caller was changed to perform a retry. C1A retry authorization remains `NOT_GRANTED`; any corrected exact-state read requires a separate approval gate and new hash locks.

## Next step

Prepare `P1.5-C2H2E3C1A2 CORRECTED EXACT-STATE SINGLE-READ RETRY APPROVAL GATE` only if a new, explicit approval is provided.
