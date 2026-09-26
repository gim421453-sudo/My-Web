import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(TOOL_DIR, "..", "..");
const CONFIG_PATH = resolve(ROOT_DIR, "firebase.trusted-backend-emulator.json");
const FIREBASE_CLI = resolve(TOOL_DIR, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const NPM_CMD = resolve(dirname(process.execPath), "npm.cmd");
const DEBUG_LOGS = [
  resolve(TOOL_DIR, "firebase-debug.log"),
  resolve(TOOL_DIR, "firestore-debug.log"),
];
const XDG_HOME = resolve(tmpdir(), "myweb-p0-4-firebase-cli");
let ownsDebugLogs = false;

function cleanupLogs() {
  if (!ownsDebugLogs) return;
  for (const log of DEBUG_LOGS) rmSync(log, { force: true });
}

function fail(message) {
  cleanupLogs();
  process.stderr.write(`[trusted-functions-regression] ${message}\n`);
  process.exitCode = 1;
}

function javaAvailable() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8", shell: false });
  return !result.error && result.status === 0;
}

try {
  if (!existsSync(CONFIG_PATH) || !existsSync(FIREBASE_CLI) || !existsSync(NPM_CMD)) {
    throw new Error("trusted-functions-regression-file-missing");
  }
  if (!javaAvailable()) throw new Error("java-toolchain-required");
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.FIREBASE_CONFIG
    || process.env.GCLOUD_PROJECT
    || process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error("cloud-credentials-or-project-forbidden");
  }
  if (DEBUG_LOGS.some(existsSync)) throw new Error("preexisting-emulator-debug-log");
  mkdirSync(XDG_HOME, { recursive: true });
  ownsDebugLogs = true;

  const integrationCommand = `"${NPM_CMD}" --prefix "${resolve(ROOT_DIR, "functions")}" run test:integration`;
  const child = spawn(process.execPath, [
    FIREBASE_CLI,
    "emulators:exec",
    "--config", CONFIG_PATH,
    "--project", "demo-myweb-trusted-backend",
    "--only", "functions,auth,firestore",
    integrationCommand,
  ], {
    cwd: TOOL_DIR,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      XDG_CONFIG_HOME: XDG_HOME,
      MYWEB_TRUSTED_BACKEND_MODE: "emulator",
      FIREBASE_SKIP_UPDATE_CHECK: "true",
      CI: "true",
    },
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  });
  const timeout = setTimeout(() => child.kill(), 300_000);
  child.on("error", (error) => {
    clearTimeout(timeout);
    fail(error?.message || "trusted-functions-emulator-spawn-failed");
  });
  child.on("exit", (code, signal) => {
    clearTimeout(timeout);
    cleanupLogs();
    if (signal) fail(`trusted-functions-emulator-terminated:${signal}`);
    else process.exitCode = Number.isInteger(code) ? code : 1;
  });
} catch (error) {
  fail(error?.message || "trusted-functions-regression-preflight-failed");
}
