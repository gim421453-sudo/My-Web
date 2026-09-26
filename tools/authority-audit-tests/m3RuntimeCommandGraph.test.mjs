import assert from "node:assert/strict";
import {
  DEFAULT_LIVE_EXECUTION_ENABLED,
  M3_RUNTIME_SECURITY_CONTRACT,
  buildActiveCallerCommand,
  buildM3CommandGraph,
  buildProjectPolicyReadCommand,
  buildRoleReadCommand,
  buildWriterBindingMutationCommand,
  buildPinnedG2BWriterBindingMutationCommand,
  buildPinnedG2BWriterPolicyReadCommand,
  createIdentityContext,
  buildWriterMetadataCommand,
  buildWriterPolicyReadCommand,
  parseCanonicalWriterPolicyPredicates,
  parseExactRoleMetadata,
  parseProjectPolicyPredicates,
  parseWriterMetadata,
  parseWriterPolicyPredicates,
  projectSafeMutationDiagnostic,
  runM3Dormant,
  M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT,
} from "../authority-audit/m3RuntimeCommandGraph.mjs";

assert.equal(DEFAULT_LIVE_EXECUTION_ENABLED, false);
assert.equal(M3_RUNTIME_SECURITY_CONTRACT.projectIamMutationCommandCount, 0);
assert.equal(M3_RUNTIME_SECURITY_CONTRACT.m4CommandBuilderPresent, false);
assert.equal(M3_RUNTIME_SECURITY_CONTRACT.tokenGenerationCommandReachable, false);
assert.equal(M3_RUNTIME_SECURITY_CONTRACT.firestoreCommandOrApiPathReachable, false);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessInternalGetIamPolicy, true);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessInternalSetIamPolicy, true);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessPhysicalProviderCallsMin, 2);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.priorSingleMutationCallModelAccurate, false);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.oldGcloudMutationPathReachableFromFutureM3, false);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.explicitDirectSetPhysicalProviderCallsMax, 3);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.explicitDirectSetHiddenProviderCalls, 0);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.repairRequiredBeforeProspectiveApproval, false);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.postAccountingReattestationRequired, true);
assert.equal(M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.prospectiveM3Reachable, false);

assert.deepEqual(buildRoleReadCommand("mywebStage1CollectionIdReader"), [
  "iam", "roles", "describe", "mywebStage1CollectionIdReader",
  "--project=my-management-app-8a933", "--format=json", "--verbosity=error",
]);
assert.deepEqual(buildRoleReadCommand("mywebCanonicalStateReader"), [
  "iam", "roles", "describe", "mywebCanonicalStateReader",
  "--project=my-management-app-8a933", "--format=json", "--verbosity=error",
]);
assert.throws(() => buildRoleReadCommand("projects/other/roles/not-allowed"), /unsupported-role-id/);
assert.deepEqual(buildActiveCallerCommand(), [
  "auth", "list", "--filter=status:ACTIVE", "--format=value(account)", "--verbosity=error",
]);
const testIdentity = Object.freeze({ exactPrincipal: "operator@example.com", exactIamMember: "user:operator@example.com" });
assert.deepEqual(buildWriterMetadataCommand(testIdentity), [
  "iam", "service-accounts", "describe",
  "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com",
  "--format=json", "--verbosity=error", "--configuration=NONE", "--account=operator@example.com",
]);
assert.deepEqual(buildWriterPolicyReadCommand(testIdentity), [
  "iam", "service-accounts", "get-iam-policy",
  "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com",
  "--format=json", "--verbosity=error", "--configuration=NONE", "--account=operator@example.com",
]);
assert.deepEqual(buildProjectPolicyReadCommand(testIdentity), [
  "projects", "get-iam-policy", "my-management-app-8a933",
  "--format=json", "--verbosity=error", "--configuration=NONE", "--account=operator@example.com",
]);
assert.deepEqual(buildWriterBindingMutationCommand(testIdentity), [
  "iam", "service-accounts", "add-iam-policy-binding",
  "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com",
  "--member=user:operator@example.com",
  "--role=roles/iam.serviceAccountTokenCreator",
  "--condition=None", "--quiet", "--verbosity=error", "--configuration=NONE", "--account=operator@example.com",
]);
assert.deepEqual(buildWriterBindingMutationCommand(Object.freeze({ exactPrincipal: "worker@my-management-app-8a933.iam.gserviceaccount.com", exactIamMember: "serviceAccount:worker@my-management-app-8a933.iam.gserviceaccount.com" }))[4], "--member=serviceAccount:worker@my-management-app-8a933.iam.gserviceaccount.com");
assert.throws(() => buildWriterBindingMutationCommand(null), /identity-context-required/);
const g2bPolicyRead = buildPinnedG2BWriterPolicyReadCommand(testIdentity);
assert.equal(g2bPolicyRead[3], "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com");
const g2bMutation = buildPinnedG2BWriterBindingMutationCommand(testIdentity);
assert.equal(g2bMutation[3], "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com");
const g2bIdentity = createIdentityContext("operator@example.com");
assert.equal(g2bMutation.includes(`--member=${g2bIdentity.exactIamMember}`), true);
assert.equal(g2bMutation.includes("myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com"), false);
assert.equal(g2bMutation.includes("--role=roles/iam.serviceAccountTokenCreator"), true);

const graph = buildM3CommandGraph();
assert.equal(graph.nodes.length, 9);
assert.deepEqual(graph.nodes.map((node) => node.id), [
  "ROLE_STAGE1", "ROLE_CANONICAL", "OP_A", "OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST",
]);
assert.equal(graph.nodes.find((node) => node.id === "OP_E").maxCalls, 1);
assert.equal(graph.nodes.find((node) => node.id === "OP_E").retryMax, 0);
assert.equal(graph.nodes.some((node) => node.argvTemplate.some((arg) => String(arg).includes("print-access-token"))), false);
assert.equal(graph.nodes.some((node) => node.argvTemplate.some((arg) => String(arg).includes("mywebClassMigrationCreateOnly"))), false);

const safeFailure = projectSafeMutationDiagnostic({
  exitCode: 7,
  timedOut: false,
  stdout: "ignored-sensitive-looking-output",
  stderr: "ERROR: permission denied\nsecret@example.com token=not-persisted",
}, "CONFIRMED_FAILURE");
assert.deepEqual(safeFailure, {
  processStarted: true,
  processStartState: "STARTED",
  exitCode: 7,
  timedOut: false,
  signalCategory: "NONE",
  spawnErrorCategory: "NONE",
  safeFailureStage: "PROCESS_EXIT",
  failureClass: "UNKNOWN_NONZERO",
  safeErrorIdentifier: "ERROR_PREFIX_V1+GCLOUD_AUTHORIZATION_ERROR_V1",
  safeErrorClass: "GCLOUD_AUTHORIZATION_ERROR",
  stderrLineCount: 2,
  stderrByteCount: Buffer.byteLength("ERROR: permission denied\nsecret@example.com token=not-persisted", "utf8"),
  mutationOutcome: "INDETERMINATE",
});
assert.equal(JSON.stringify(safeFailure).includes("permission denied"), false);
assert.equal(JSON.stringify(safeFailure).includes("secret@example.com"), false);
assert.equal(JSON.stringify(safeFailure).includes("not-persisted"), false);

const unknownFailure = projectSafeMutationDiagnostic({
  exitCode: 9,
  timedOut: false,
  stdout: "",
  stderr: "unexpected multiline\nprivate key marker",
}, "CONFIRMED_FAILURE");
assert.equal(unknownFailure.failureClass, "UNKNOWN_NONZERO");
assert.equal(unknownFailure.safeErrorIdentifier, "NO_KNOWN_STDERR_RULE");
assert.equal(unknownFailure.safeErrorClass, "NO_SAFE_ERROR_CLASS");
assert.equal(unknownFailure.stderrLineCount, 2);

const timedOut = projectSafeMutationDiagnostic({
  exitCode: null,
  timedOut: true,
  stdout: "",
  stderr: "",
}, "INDETERMINATE");
assert.equal(timedOut.failureClass, "TIMEOUT");
assert.equal(timedOut.mutationOutcome, "INDETERMINATE");
assert.equal(timedOut.processStartState, "STARTED");
assert.equal(timedOut.safeFailureStage, "PROCESS_RUNNING");

const spawnFailure = projectSafeMutationDiagnostic({
  exitCode: null,
  timedOut: false,
  stdout: "",
  stderr: "",
  spawnError: { code: "ENOENT" },
}, "INDETERMINATE");
assert.equal(spawnFailure.processStarted, false);
assert.equal(spawnFailure.processStartState, "NOT_STARTED");
assert.equal(spawnFailure.spawnErrorCategory, "SPAWN_ERROR");
assert.equal(spawnFailure.safeFailureStage, "BEFORE_PROCESS_START");
assert.equal(spawnFailure.failureClass, "UNRESOLVED");

const signalTerminated = projectSafeMutationDiagnostic({
  exitCode: null,
  timedOut: false,
  stdout: "",
  stderr: "",
  signal: "SIGTERM",
}, "INDETERMINATE");
assert.equal(signalTerminated.processStarted, true);
assert.equal(signalTerminated.processStartState, "STARTED");
assert.equal(signalTerminated.signalCategory, "SIGNAL_OBSERVED");
assert.equal(signalTerminated.safeFailureStage, "PROCESS_RUNNING");

const unresolved = projectSafeMutationDiagnostic({
  exitCode: null,
  timedOut: false,
  stdout: "",
  stderr: "",
}, "INDETERMINATE");
assert.equal(unresolved.failureClass, "UNRESOLVED");
assert.equal(unresolved.safeErrorIdentifier, "NO_KNOWN_STDERR_RULE");
assert.equal(unresolved.safeErrorClass, "NO_SAFE_ERROR_CLASS");

const exactRole = JSON.stringify({
  name: "projects/my-management-app-8a933/roles/mywebStage1CollectionIdReader",
  includedPermissions: ["datastore.entities.list"],
  stage: "GA",
  deleted: false,
});
assert.equal(parseExactRoleMetadata(exactRole, "mywebStage1CollectionIdReader", "datastore.entities.list").state, "EXISTS_EXACT");
assert.equal(parseExactRoleMetadata(JSON.stringify({ name: "wrong" }), "mywebStage1CollectionIdReader", "datastore.entities.list").ok, false);
assert.equal(parseWriterMetadata(JSON.stringify({
  name: "projects/my-management-app-8a933/serviceAccounts/myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com",
  disabled: false,
})).state, "EXISTS_ENABLED");

const writerPolicy = {
  etag: "synthetic-etag",
  bindings: [{ role: "roles/iam.serviceAccountTokenCreator", members: ["user:operator@example.com"] }],
};
assert.equal(parseWriterPolicyPredicates(writerPolicy, "operator@example.com").m3Binding, true);
assert.equal(parseWriterPolicyPredicates({ etag: "synthetic-etag", bindings: [] }, "operator@example.com").m3Binding, false);
assert.equal(parseCanonicalWriterPolicyPredicates({ etag: "synthetic-etag" }, "operator@example.com").unexpectedTokenCreatorDelegation, false);
assert.equal(parseCanonicalWriterPolicyPredicates({ etag: "synthetic-etag", bindings: [] }, "operator@example.com").unexpectedTokenCreatorDelegation, false);
assert.equal(parseCanonicalWriterPolicyPredicates(writerPolicy, "operator@example.com").m3Binding, true);
assert.equal(parseCanonicalWriterPolicyPredicates({}, "operator@example.com").ok, false);
assert.equal(parseCanonicalWriterPolicyPredicates({ etag: "synthetic-etag", bindings: [{ role: "bad role", members: ["user:synthetic"] }] }, "operator@example.com").ok, false);
assert.equal(parseCanonicalWriterPolicyPredicates({ etag: "synthetic-etag", bindings: [{ role: "roles/iam.serviceAccountTokenCreator", members: "bad" }] }, "operator@example.com").ok, false);
const projectPolicy = {
  etag: "synthetic-etag",
  bindings: [
    { role: "projects/my-management-app-8a933/roles/mywebStage1CollectionIdReader", members: ["serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com"] },
    { role: "projects/my-management-app-8a933/roles/mywebCanonicalStateReader", members: ["serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com"] },
  ],
};
const parsedProject = parseProjectPolicyPredicates(projectPolicy, "operator@example.com");
assert.equal(parsedProject.auditStage1ReaderBinding, true);
assert.equal(parsedProject.auditCanonicalReaderBinding, true);
assert.equal(parsedProject.callerProjectWideTokenCreator, false);

let fakeCalls = 0;
const disabled = await runM3Dormant({ runProcess: () => { fakeCalls += 1; throw new Error("must-not-run"); } });
assert.equal(disabled.code, "LIVE_EXECUTION_DISABLED");
assert.equal(disabled.counters.processCalls, 0);
assert.equal(fakeCalls, 0);

let observedArgs = [];
const roleReadFailure = await runM3Dormant({
  enabled: true,
  executable: "synthetic-gcloud.cmd",
  runProcess: ({ args }) => {
    observedArgs.push(args);
    return { exitCode: 1, timedOut: false, stdout: "", stderr: "synthetic" };
  },
});
assert.equal(roleReadFailure.ok, false);
assert.equal(roleReadFailure.code, "PROCESS_FAILED");
assert.equal(observedArgs.length, 1);
assert.equal(observedArgs[0][0], "iam");

console.log("M3 runtime command graph local synthetic validation passed; real gcloud=0");
