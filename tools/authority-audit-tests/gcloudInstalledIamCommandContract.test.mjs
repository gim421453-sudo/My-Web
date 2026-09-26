import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "../authority-audit/windowsGcloudProcessAdapter.mjs";

const gcloud = resolveLocalGcloudExecutable();
assert.ok(gcloud && existsSync(gcloud), "local Cloud SDK must be present");

// Help is a local parser query. It does not create a credential, call an API,
// or execute the mutation command.
const help = runWindowsProcess({
  executable: gcloud,
  args: ["iam", "service-accounts", "add-iam-policy-binding", "--help"],
  // A cold local Cloud SDK startup can exceed ten seconds on Windows;
  // this remains a bounded local help query and never invokes an API.
  timeoutMs: 30_000,
});
assert.equal(help.exitCode, 0, "installed command help must parse locally");
assert.equal(help.timedOut, false);
assert.match(help.stdout, /SERVICE_ACCOUNT/);
assert.match(help.stdout, /--member/);
assert.match(help.stdout, /--role/);
assert.match(help.stdout, /--condition/);

const sdkRoot = dirname(dirname(gcloud));
const yamlPath = join(sdkRoot, "lib", "surface", "iam", "service_accounts", "add_iam_policy_binding.yaml");
const translatorPath = join(sdkRoot, "lib", "googlecloudsdk", "command_lib", "util", "apis", "yaml_command_translator.py");
const yaml = readFileSync(yamlPath, "utf8");
const translator = readFileSync(translatorPath, "utf8");
assert.match(yaml, /collection:\s+iam\.projects\.serviceAccounts/);
assert.match(yaml, /get_iam_policy_version_path/);
assert.match(translator, /Two API methods are called to get and set the policy/);
assert.match(translator, /policy = self\._GetIamPolicy\(args\)/);
assert.match(translator, /self\._CommonRun\(resource_method_arg, args\)/);

console.log("installed gcloud IAM command contract passed; local help/source only; remote operations=0");
