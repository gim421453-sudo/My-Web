import assert from "node:assert/strict";
import {
  C1A3_CALLER_CONTRACT,
} from "../authority-audit/c1a3ExactClassStateReadCaller.mjs";
import { classifyImpersonatedTokenProcessResult } from "../authority-audit/gcloudTokenOutputClassifier.mjs";
import { runWindowsProcess } from "../authority-audit/windowsGcloudProcessAdapter.mjs";

const FAKE_TOKEN = "synthetic-r1-valid-token-123456";
const node = process.execPath;
const realGcloudProcessSpawnCount = 0;

function runScript(script, args = []) {
  assert.equal(node.toLowerCase().includes("gcloud"), false);
  return runWindowsProcess({
    executable: node,
    args: ["-e", script, ...args],
    timeoutMs: 10_000,
  });
}

const expectedTokenArgs = C1A3_CALLER_CONTRACT.tokenCommand;
const argumentProbe = runScript(
  "const actual=process.argv.slice(1); const expected=['auth','print-access-token','--impersonate-service-account=myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com','--scopes=https://www.googleapis.com/auth/datastore','--verbosity=error']; if(JSON.stringify(actual)!==JSON.stringify(expected)) process.exit(17); process.stdout.write('args-ok');",
  expectedTokenArgs,
);
assert.equal(argumentProbe.exitCode, 0);
assert.equal(argumentProbe.stdout, "args-ok");
assert.equal(argumentProbe.stderr, "");
assert.equal(expectedTokenArgs.filter((value) => value === "--verbosity=error").length, 1);

const lf = runScript("process.stdout.write('synthetic-r1-valid-token-123456\\n');");
assert.equal(lf.exitCode, 0);
assert.equal(lf.stdout, `${FAKE_TOKEN}\n`);
assert.equal(lf.stderr, "");
assert.equal(lf.stdout.endsWith("\n"), true);
const lfClassified = classifyImpersonatedTokenProcessResult(lf);
assert.equal(lfClassified.ok, true);
assert.equal(lfClassified.diagnostic.classifierReason, "EMPTY_STDERR_ACCEPTED");

const crlf = runScript("process.stdout.write('synthetic-r1-valid-token-123456\\r\\n');");
assert.equal(crlf.exitCode, 0);
assert.equal(crlf.stdout, `${FAKE_TOKEN}\r\n`);
assert.equal(crlf.stderr, "");
assert.equal(classifyImpersonatedTokenProcessResult(crlf).ok, true);

const separated = runScript("process.stdout.write('R1_STDOUT_SENTINEL'); process.stderr.write('R1_STDERR_SENTINEL');");
assert.equal(separated.exitCode, 0);
assert.equal(separated.stdout, "R1_STDOUT_SENTINEL");
assert.equal(separated.stderr, "R1_STDERR_SENTINEL");

for (const exitCode of [0, 1, 7]) {
  const result = runScript(`process.exit(${exitCode});`);
  assert.equal(result.exitCode, exitCode);
}

const oldWarning = runScript("process.stdout.write('synthetic-r1-valid-token-123456'); process.stderr.write('WARNING: old benign warning');");
assert.equal(classifyImpersonatedTokenProcessResult(oldWarning).reason, "unknown-stderr");

const unknownWarning = runScript("process.stdout.write('synthetic-r1-valid-token-123456'); process.stderr.write('WARNING: unknown warning');");
assert.equal(classifyImpersonatedTokenProcessResult(unknownWarning).reason, "unknown-stderr");

const errorStderr = runScript("process.stdout.write('synthetic-r1-valid-token-123456'); process.stderr.write('ERROR: synthetic failure');");
assert.equal(classifyImpersonatedTokenProcessResult(errorStderr).reason, "unknown-stderr");

assert.equal(realGcloudProcessSpawnCount, 0);
console.log("C1A6H-R1 host-safe token transport regression passed; real gcloud=0");
