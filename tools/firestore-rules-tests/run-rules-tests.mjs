import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "demo-myweb-rules";
const FIRESTORE_PORT = 8083;
const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(TOOL_DIR, "..", "..");
const CONFIG_PATH = resolve(ROOT_DIR, "firebase.rules-test.json");
const RULES_PATH = resolve(ROOT_DIR, "firestore.rules");
const DEBUG_LOG_PATH = resolve(ROOT_DIR, "firestore-debug.log");
const TEST_ENTRY = resolve(TOOL_DIR, "tests", "run-all.mjs");
const FIREBASE_CLI = resolve(
  TOOL_DIR,
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);

function fail(message) {
  process.stderr.write(`[rules-test] ${message}\n`);
  process.exitCode = 1;
}

function assertSafeConfiguration() {
  if (!PROJECT_ID.startsWith("demo-")) {
    throw new Error("unsafe-project-id");
  }
  if (!existsSync(CONFIG_PATH) || !existsSync(RULES_PATH) || !existsSync(TEST_ENTRY)) {
    throw new Error("rules-test-file-missing");
  }
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (config?.firestore?.rules !== "firestore.rules") {
    throw new Error("unexpected-rules-path");
  }
  if (config?.emulators?.firestore?.host !== "127.0.0.1") {
    throw new Error("emulator-host-must-be-loopback");
  }
  if (config?.emulators?.firestore?.port !== FIRESTORE_PORT) {
    throw new Error("emulator-port-mismatch");
  }
  const forbiddenEnvironment = [
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GCLOUD_PROJECT",
    "GOOGLE_CLOUD_PROJECT",
    "FIREBASE_CONFIG",
  ].filter((name) => process.env[name]);
  if (forbiddenEnvironment.length > 0) {
    throw new Error(`forbidden-cloud-environment:${forbiddenEnvironment.join(",")}`);
  }
}

function javaAvailable() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8", shell: false });
  return !result.error && result.status === 0;
}

try {
  assertSafeConfiguration();
  if (process.argv.includes("--preflight")) {
    process.stdout.write(JSON.stringify({
      projectId: PROJECT_ID,
      firestoreHost: "127.0.0.1",
      firestorePort: FIRESTORE_PORT,
      rulesPath: "firestore.rules",
      javaAvailable: javaAvailable(),
      firebaseBinaryPresent: existsSync(FIREBASE_CLI),
    }, null, 2) + "\n");
  } else {
    if (!javaAvailable()) throw new Error("java-toolchain-required");
    if (!existsSync(FIREBASE_CLI)) throw new Error("local-firebase-tools-required");
    rmSync(DEBUG_LOG_PATH, { force: true });

    const testCommand = `"${process.execPath}" "${TEST_ENTRY}"`;
    const child = spawn(process.execPath, [
      FIREBASE_CLI,
      "emulators:exec",
      "--only", "firestore",
      "--project", PROJECT_ID,
      "--config", CONFIG_PATH,
      testCommand,
    ], {
      cwd: ROOT_DIR,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        FIRESTORE_EMULATOR_HOST: `127.0.0.1:${FIRESTORE_PORT}`,
        PM_RULES_TEST_PROJECT_ID: PROJECT_ID,
        CI: "true",
        FIREBASE_SKIP_UPDATE_CHECK: "true",
      },
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });

    const timeout = setTimeout(() => child.kill(), 180_000);
    child.on("error", (error) => {
      clearTimeout(timeout);
      fail(error?.message || "emulator-spawn-failed");
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal) fail(`emulator-terminated:${signal}`);
      else if (code === 0 && existsSync(DEBUG_LOG_PATH)) {
        const debugLog = readFileSync(DEBUG_LOG_PATH, "utf8");
        if (/maximum of 1000 expressions|Type error\. Received: \[string\] Expected: \[bool\]|Null value error|Property .* is undefined|Function not found error/.test(debugLog)) {
          fail("rules-evaluation-diagnostics-detected");
        } else {
          process.exitCode = 0;
        }
      } else {
        process.exitCode = Number.isInteger(code) ? code : 1;
      }
    });
  }
} catch (error) {
  fail(error?.message || "rules-test-preflight-failed");
}
