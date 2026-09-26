import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "../authority-audit/windowsGcloudProcessAdapter.mjs";

function assertCaptured(result) {
  assert.equal(typeof result.stdout, "string");
  assert.equal(typeof result.stderr, "string");
  assert.equal(typeof result.timedOut, "boolean");
}

const gcloud = resolveLocalGcloudExecutable();
assert.ok(gcloud, "local gcloud.cmd must resolve");
assert.ok(existsSync(gcloud), "resolved gcloud.cmd must exist");

const version = runWindowsProcess({
  executable: gcloud,
  args: ["--version"],
  timeoutMs: 10_000,
});
assertCaptured(version);
assert.equal(version.exitCode, 0, "gcloud --version must succeed");
assert.equal(version.timedOut, false);
assert.equal(version.stdout.includes("Google Cloud SDK"), true);

const help = runWindowsProcess({
  executable: gcloud,
  args: ["help"],
  timeoutMs: 10_000,
});
assertCaptured(help);
assert.equal(help.exitCode, 0, "gcloud help must succeed");
assert.equal(help.timedOut, false);

const specialArgument = "marker@value:with=equals";
const specialArgumentResult = runWindowsProcess({
  executable: process.execPath,
  args: [
    "-e",
    "if (process.argv[1] !== 'marker@value:with=equals') process.exit(9); process.stdout.write('argument-ok');",
    specialArgument,
  ],
  timeoutMs: 10_000,
});
assertCaptured(specialArgumentResult);
assert.equal(specialArgumentResult.exitCode, 0, "special argument must be forwarded unchanged");
assert.equal(specialArgumentResult.stdout, "argument-ok");

const nonZero = runWindowsProcess({
  executable: process.execPath,
  args: ["-e", "process.stderr.write('synthetic-error'); process.exit(7);"],
  timeoutMs: 10_000,
});
assertCaptured(nonZero);
assert.equal(nonZero.exitCode, 7, "non-zero exit must be retained");
assert.equal(nonZero.stderr, "synthetic-error");

const benignWarning = runWindowsProcess({
  executable: process.execPath,
  args: ["-e", "process.stdout.write('synthetic-valid-access-token-123456'); process.stderr.write('WARNING: This command is using service account impersonation.\\nAll API calls will be executed as [redacted-audit-principal].\\n');"],
  timeoutMs: 10_000,
});
assertCaptured(benignWarning);
assert.equal(benignWarning.exitCode, 0, "benign warning fixture must preserve zero exit");
assert.equal(benignWarning.stdout, "synthetic-valid-access-token-123456");
assert.match(benignWarning.stderr, /service account impersonation/);

const timeout = runWindowsProcess({
  executable: process.execPath,
  args: ["-e", "setTimeout(() => {}, 3000);"],
  timeoutMs: 50,
});
assertCaptured(timeout);
assert.equal(timeout.timedOut, true, "timeout must be retained");
assert.equal(timeout.exitCode, null);

console.log("windows gcloud process adapter local validation passed");
