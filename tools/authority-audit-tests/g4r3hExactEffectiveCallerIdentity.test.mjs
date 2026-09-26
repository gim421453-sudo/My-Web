import assert from "node:assert/strict";
import {
  AUTH_OVERRIDE_ENV_SURFACES,
  createSanitizedChildEnvironment,
} from "../authority-audit/windowsGcloudProcessAdapter.mjs";
import {
  M3_ALLOWED_PRINCIPAL_KIND,
  buildM3CommandGraph,
  buildPinnedProjectPolicyReadCommand,
  buildPinnedWriterBindingMutationCommand,
  buildPinnedWriterMetadataCommand,
  buildPinnedWriterPolicyReadCommand,
  createIdentityContext,
  evaluateExactPrestate,
} from "../authority-audit/m3RuntimeCommandGraph.mjs";

const principal = "synthetic.operator@example.invalid";
const identity = createIdentityContext(principal, {
  environment: {
    PATH: "synthetic-path",
    CLOUDSDK_CONFIG: "synthetic-config-root",
    CLOUDSDK_AUTH_ACCESS_TOKEN: "secret-token-must-not-escape",
    CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE: "secret-file-must-not-escape",
    CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT: "secret-impersonation-must-not-escape",
  },
});

assert.deepEqual(M3_ALLOWED_PRINCIPAL_KIND, ["user", "serviceAccount"]);
assert.ok(identity);
assert.equal(identity.principalKind, "user");
assert.equal(identity.exactIamMember, `user:${principal}`);
assert.equal(Object.isFrozen(identity), true);
assert.equal(JSON.stringify(identity), "{}");
assert.throws(() => { identity.exactIamMember = "user:other@example.invalid"; }, TypeError);
assert.equal(createIdentityContext("bad value", { environment: {} }), null);
assert.equal(createIdentityContext("synthetic.worker@project.iam.gserviceaccount.com", { environment: {} }).principalKind, "serviceAccount");

for (const args of [
  buildPinnedWriterMetadataCommand(identity),
  buildPinnedWriterPolicyReadCommand(identity),
  buildPinnedProjectPolicyReadCommand(identity),
  buildPinnedWriterBindingMutationCommand(identity),
]) {
  assert.equal(args.includes("--configuration=NONE"), true);
  assert.equal(args.some((arg) => arg === `--account=${principal}`), true);
}
assert.equal(buildPinnedWriterBindingMutationCommand(identity).some((arg) => arg.includes(identity.exactIamMember)), true);
assert.throws(() => buildPinnedWriterPolicyReadCommand(null), /identity-context-required/);
assert.throws(() => buildPinnedWriterBindingMutationCommand({}), /identity-context-required/);

const sanitized = createSanitizedChildEnvironment({
  environment: {
    PATH: "safe",
    CLOUDSDK_CONFIG: "parent-root",
    ...Object.fromEntries(AUTH_OVERRIDE_ENV_SURFACES.map((key) => [key, "synthetic-secret"])),
  },
  configRoot: "session-root",
});
for (const key of AUTH_OVERRIDE_ENV_SURFACES) assert.equal(Object.hasOwn(sanitized, key), false);
assert.equal(sanitized.CLOUDSDK_CONFIG, "session-root");

const parent = { CLOUDSDK_CONFIG: "first-root" };
const session = createIdentityContext(principal, { environment: parent });
parent.CLOUDSDK_CONFIG = "changed-root";
assert.equal(session.pinnedConfigRoot, "first-root");
assert.equal(session.childEnvironment.CLOUDSDK_CONFIG, "first-root");

const absentPolicy = { etag: "synthetic", bindings: [] };
const presentPolicy = { etag: "synthetic", bindings: [{ role: "roles/iam.serviceAccountTokenCreator", members: [identity.exactIamMember] }] };
assert.equal(evaluateExactPrestate(absentPolicy, identity), "TARGET_MEMBER_ABSENT");
assert.equal(evaluateExactPrestate(presentPolicy, identity), "TARGET_MEMBER_PRESENT");
assert.equal(evaluateExactPrestate({ bindings: [{ role: "roles/iam.serviceAccountTokenCreator", members: [identity.exactIamMember, identity.exactIamMember] }] }, identity), "AMBIGUOUS");
assert.equal(evaluateExactPrestate({ bindings: [{ role: "roles/iam.serviceAccountTokenCreator" }] }, identity), "READ_FAILURE");
assert.equal(evaluateExactPrestate(absentPolicy, createIdentityContext("synthetic.other@example.invalid", { environment: {} })), "TARGET_MEMBER_ABSENT");

const graph = buildM3CommandGraph();
for (const node of graph.nodes.filter(({ id }) => ["OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"].includes(id))) {
  assert.equal(node.argvTemplate.includes("--configuration=NONE"), true);
  assert.equal(node.argvTemplate.includes("--account=<SESSION_EXACT_PRINCIPAL>"), true);
}
assert.equal(graph.nodes.find(({ id }) => id === "OP_A").argvTemplate.some((arg) => arg.startsWith("--account=")), false);
assert.equal(graph.nodes.find(({ id }) => id === "OP_E").argvTemplate.some((arg) => arg.includes("--impersonate-service-account")), false);
assert.equal(graph.nodes.find(({ id }) => id === "OP_E").maxCalls, 1);
assert.equal(graph.nodes.find(({ id }) => id === "OP_E").retryMax, 0);

console.log("G4R3H exact effective caller identity local tests passed; live access=0");
