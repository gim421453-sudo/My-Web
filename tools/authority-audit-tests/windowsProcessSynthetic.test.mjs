import assert from "node:assert/strict";
import { runWindowsProcess } from "../authority-audit/windowsGcloudProcessAdapter.mjs";

const result = runWindowsProcess({
  executable: process.execPath,
  args: [
    "-e",
    "process.stdout.write('synthetic-valid-access-token-123456'); process.stderr.write('WARNING: This command is using service account impersonation.\\nAll API calls will be executed as [redacted-audit-principal].\\n');",
  ],
  timeoutMs: 10_000,
});

assert.equal(result.exitCode, 0);
assert.equal(result.timedOut, false);
assert.equal(result.stdout, "synthetic-valid-access-token-123456");
assert.match(result.stderr, /service account impersonation/);

console.log("synthetic Windows process stderr separation validation passed");
