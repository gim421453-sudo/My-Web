# P1.5-C2H2C2A Access-Token Generation Failure Diagnostic Approval

## Verdict

`P1_5_C2H2C2A_NEEDS_NARROW_FIX`

The C2H2C2 Firestore boundary remains intact: token generation failed before
any Firestore request. Local reproduction identifies a Windows child-process
construction defect that can independently explain the failure. This package
does not retry token generation or perform any live read.

## Baseline and immutable safety state

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
CALLER_FINGERPRINT_STATUS = VERIFIED
AUDIT_SA_TARGET_STATUS = LOCAL_CONTRACT_MATCH
SELECTED_WORKSPACE = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1

TOKEN_GENERATION_RETRY_APPROVAL = NOT_GRANTED
LIVE_DIAGNOSTIC_READ_APPROVAL = NOT_GRANTED
IAM_MUTATION_APPROVAL = NOT_GRANTED
API_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_LIST_COLLECTION_IDS_APPROVAL_FOR_RETRY = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

The existing C2H2C2 result is preserved as evidence: one logical token attempt
failed, no token was retained or printed, and no Firestore call was made. The
approved audit service-account target is unchanged.

## C2H2C2 execution reconstruction

The one attempt used the isolated Node 22 runtime and the installed Windows
`gcloud.cmd` launcher. Its child-process shape was:

```text
spawnSync(cmd.exe, ["/d", "/s", "/c", tokenCommand], {
  encoding: "utf8",
  windowsHide: true,
  maxBuffer: 1048576
})
```

`tokenCommand` started with a quoted absolute path to `gcloud.cmd`, followed by
`auth print-access-token`, the approved audit-service-account impersonation
flag, and the datastore OAuth scope. Success required all of the following:

```text
exit status = 0
spawn error = none
trimmed stdout = non-empty
```

Only after that check would the program have constructed the single approved
Firestore `ListCollectionIds` request. It did not reach that branch.

The C2H2C2 program deliberately did not retain raw stderr, raw stdout, an
access token, authorization header, or a process exit record. Therefore:

```text
TOKEN_PROCESS_EXIT_CODE = UNAVAILABLE
TOKEN_PROCESS_TIMEOUT = UNRESOLVED
TOKEN_STDERR_AVAILABLE = no
ERROR_DETAIL_RECOVERABILITY = NOT_AVAILABLE
```

## Local command-contract checks

The checks below used only `gcloud --version` and `gcloud ... --help`; no
credential was requested and no Google Cloud API was contacted.

| Check | Result | Meaning |
| --- | --- | --- |
| Isolated runtime | Node `v22.23.2` | Matches the C2H2C2 runtime. |
| Native PowerShell `cmd.exe /c` call to `gcloud.cmd --version` | exit `0` | The local SDK launcher is usable from its native Windows shell. |
| Node direct `spawnSync(gcloud.cmd, ...)` | `EINVAL` | Direct `.cmd` spawning is not a viable replacement. |
| Node `spawnSync(cmd.exe, ["/d", "/s", "/c", quoted-gcloud-command])` | exit `1`, stderr present | Node's Windows argument serialization leaves the quoted launcher unresolvable by `cmd.exe`. |
| `gcloud auth print-access-token --help` | exit `0` | The subcommand is installed. |
| `--impersonate-service-account` help contract | supported | The requested impersonation flag is valid. |
| `--scopes=... --help` parser check | exit `0`, no unrecognized-argument result | The requested scope flag/value is accepted by the local CLI parser. |
| IAM service-account metadata and policy help commands | supported | The proposed live diagnostic operations have local CLI command support. |
| Service Usage list help command | supported | The proposed enablement-status read has local CLI command support. |

The two different execution results isolate the defect to the Node-to-`cmd.exe`
invocation boundary, not the SDK installation or the `print-access-token`
subcommand syntax. The safe reproductions did not issue a token request.

```text
LOCAL_TOKEN_EXECUTION_DEFECT = CONFIRMED
TOKEN_COMMAND_CONTRACT_MATCH = no
```

### Minimal correction, not executed

The token runner must stop passing an already quoted `.cmd` launcher through
Node's `cmd.exe /c` argument serializer. Use a Windows-specific process adapter
that invokes the launcher through a native PowerShell call operator, or invoke
an executable entry point that does not require batch-file shell quoting. Keep
the existing fail-closed success predicate and capture only safe process
metadata. Do not apply this correction or retry it without a new approval.

## Failure classification

| Potential cause | Classification | Local evidence |
| --- | --- | --- |
| Caller fingerprint mismatch | LOCALLY_RULED_OUT | The approved fingerprint matched before C2H2C2. |
| Wrong audit-SA target | LOCALLY_RULED_OUT | The target matches the prior B5 and C2H2C1 local contract. |
| Token command syntax or quoting defect | LOCALLY_SUPPORTED | The same Node/`cmd.exe` pattern fails for harmless `gcloud --version`; CLI flags parse successfully outside that boundary. |
| Token output parse defect | UNRESOLVED | No token command stdout existed to test parsing; the command failed first. |
| Child-process execution defect | LOCALLY_SUPPORTED | Direct `.cmd` spawn returns `EINVAL`; quoted `.cmd` through Node-to-`cmd.exe` exits `1`. |
| Resource-scoped Token Creator binding missing or drifted | REQUIRES_LIVE_VERIFICATION | B5 confirmed the binding then, but this package cannot observe current IAM state. |
| Caller lacks effective `iam.serviceAccounts.getAccessToken` | REQUIRES_LIVE_VERIFICATION | A binding is evidence of intended policy, not a current effective-permission proof. |
| Audit SA disabled or missing | REQUIRES_LIVE_VERIFICATION | B5 recorded enabled/existing state only at that time. |
| IAM Credentials service unavailable | REQUIRES_LIVE_VERIFICATION | No Service Usage read was performed here. |
| Auth session or client credential problem | UNRESOLVED | The local active-user fingerprint was verified earlier, but discarded stderr prevents a narrower conclusion. |
| IAM propagation or eventual consistency | UNRESOLVED | B5 was recent, so it is plausible but not proven; waiting is not a retry strategy. |
| Network or transient Google API failure | UNRESOLVED | C2H2C2 stored no safe error metadata. |
| Quota or Service Usage failure | REQUIRES_LIVE_VERIFICATION | No current Service Usage or safe failure code exists. |
| Other | UNRESOLVED | No retained process diagnostics allow a defensible narrower class. |

```text
RESOURCE_TOKEN_CREATOR_BINDING_STATUS = EXISTING_B5_EVIDENCE_ONLY
IAM_GET_ACCESS_TOKEN_EFFECTIVE_PERMISSION_STATUS = REQUIRES_LIVE_VERIFICATION
IAM_CREDENTIALS_SERVICE_STATUS = REQUIRES_LIVE_VERIFICATION
TOKEN_RETRY_RECOMMENDED_NOW = no
LIVE_DIAGNOSTIC_REQUIRED = yes
PROPOSED_MAX_LIVE_DIAGNOSTIC_READS = 4
```

## Future read-only diagnostic approval package

Do not execute any of these operations in C2H2C2A. They are the smallest
separate live package that distinguishes state drift from the confirmed local
runner defect without creating a credential or touching Firestore.

| Maximum | Read-only operation | Purpose and expected safe fields | Why existing evidence is insufficient |
| --- | --- | --- | --- |
| 1 | Exact audit-SA metadata read | Existence and enabled/disabled state only. | B5 state may have changed. |
| 1 | Exact audit-SA resource IAM-policy read | Whether the approved resource-scoped Token Creator binding remains and whether it is conditional. | B5 post-state is historical evidence only. |
| 1 | Exact audit-SA resource `testIamPermissions` for `iam.serviceAccounts.getAccessToken` | Caller effective-permission result only. | A policy binding cannot prove current effective evaluation. |
| 1 | IAM Credentials API enablement-status read | Enabled/disabled status only. | No current Service Usage evidence exists. |

No project-wide IAM policy read is included because the resource policy and
effective-permission check answer the authority question more narrowly.

### Exact approval text for a future package

> Approve at most four read-only Google Cloud control-plane checks: (1) audit
> service-account metadata, (2) that exact service-account resource IAM policy,
> (3) `testIamPermissions` for only
> `iam.serviceAccounts.getAccessToken` on that resource, and (4) IAM Credentials
> API enablement status. This package performs no access-token generation, no
> impersonation, no signing, no Firestore request, no IAM/API mutation, and no
> deploy. It records only safe booleans, exit categories, and binding/service
> status; it does not retain credential-bearing output.

```text
FUTURE_PACKAGE_ACCESS_TOKEN_CALLS = 0
FUTURE_PACKAGE_ACCESS_TOKENS_GENERATED = 0
FUTURE_PACKAGE_IMPERSONATION_EXECUTIONS = 0
FUTURE_PACKAGE_FIRESTORE_API_CALLS = 0
FUTURE_PACKAGE_LIST_COLLECTION_IDS_CALLS = 0
FUTURE_PACKAGE_IAM_MUTATIONS = 0
FUTURE_PACKAGE_API_MUTATIONS = 0
```

## C2H2C2A safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
SERVICE_USAGE_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The document intentionally excludes raw active-user email, access or refresh
tokens, authorization headers, private keys, service-account JSON, JWTs, and
signatures.
