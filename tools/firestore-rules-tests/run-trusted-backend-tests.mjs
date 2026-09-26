import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FIRESTORE_PORT = 8085;
const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(TOOL_DIR, "..", "..");
const CONFIG_PATH = resolve(TOOL_DIR, "firebase.trusted-backend-candidates.json");
const FIREBASE_CLI = resolve(TOOL_DIR, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const PROFILE_RUNNER = resolve(TOOL_DIR, "tests", "run-trusted-backend-profiles.mjs");
const DEBUG_LOG_PATH = resolve(TOOL_DIR, "firestore-debug.log");
let ownsDebugLog = false;

function fail(message) {
  process.stderr.write(`[trusted-rules-test] ${message}\n`);
  process.exitCode = 1;
}

function assertSafeConfiguration() {
  if (!existsSync(CONFIG_PATH) || !existsSync(FIREBASE_CLI) || !existsSync(PROFILE_RUNNER)) {
    throw new Error("trusted-rules-test-file-missing");
  }
  if (existsSync(DEBUG_LOG_PATH)) throw new Error("preexisting-firestore-debug-log");
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (config?.emulators?.firestore?.host !== "127.0.0.1"
    || config?.emulators?.firestore?.port !== FIRESTORE_PORT) {
    throw new Error("trusted-rules-emulator-must-be-dedicated-loopback");
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.FIREBASE_CONFIG
    || process.env.GCLOUD_PROJECT
    || process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error("cloud-credentials-or-project-forbidden");
  }
}

function cleanupDebugLog() {
  if (ownsDebugLog && existsSync(DEBUG_LOG_PATH)) rmSync(DEBUG_LOG_PATH, { force: true });
}

function javaAvailable() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8", shell: false });
  return !result.error && result.status === 0;
}

try {
  assertSafeConfiguration();
  if (process.argv.includes("--preflight")) {
    process.stdout.write(JSON.stringify({
      projectId: "demo-myweb-trusted-rules",
      firestoreHost: "127.0.0.1",
      firestorePort: FIRESTORE_PORT,
      profiles: ["transition", "strict", "live", "local"],
      javaAvailable: javaAvailable(),
    }, null, 2) + "\n");
  } else {
    if (!javaAvailable()) throw new Error("java-toolchain-required");
    ownsDebugLog = true;
    const child = spawn(process.execPath, [FIREBASE_CLI,
      "emulators:exec",
      "--only", "firestore",
      "--project", "demo-myweb-trusted-rules",
      "--config", CONFIG_PATH,
      `\"${process.execPath}\" \"${PROFILE_RUNNER}\"`,
    ], {
      cwd: TOOL_DIR,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        FIRESTORE_EMULATOR_HOST: `127.0.0.1:${FIRESTORE_PORT}`,
        FIREBASE_SKIP_UPDATE_CHECK: "true",
        CI: "true",
        PM_TRUSTED_RULES_EMULATOR: "1",
      },
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });
    const timeout = setTimeout(() => child.kill(), 300_000);
    child.on("error", (error) => {
      clearTimeout(timeout);
      cleanupDebugLog();
      fail(error?.message || "trusted-rules-emulator-spawn-failed");
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      cleanupDebugLog();
      if (signal) fail(`trusted-rules-emulator-terminated:${signal}`);
      else process.exitCode = Number.isInteger(code) ? code : 1;
    });
  }
} catch (error) {
  cleanupDebugLog();
  fail(error?.message || "trusted-rules-test-preflight-failed");
}
