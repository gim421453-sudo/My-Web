import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROCESS_HOST_SCRIPT = fileURLToPath(
  new URL("./invokeWindowsExecutable.ps1", import.meta.url),
);

export const AUTH_OVERRIDE_ENV_SURFACES = Object.freeze([
  "CLOUDSDK_AUTH_ACCESS_TOKEN",
  "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
  "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT",
]);

function createSpawnError(error) {
  if (!error) {
    return null;
  }

  return {
    code: typeof error.code === "string" ? error.code : null,
    name: typeof error.name === "string" ? error.name : "Error",
  };
}

function normalizeExecutable(candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    return null;
  }

  return candidate.trim();
}

function resolvePowerShellExecutable(environment) {
  const systemRoot = environment.SystemRoot || environment.WINDIR;

  if (systemRoot) {
    const candidate = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "powershell.exe";
}

function localPathCandidates(environment, locateCommand) {
  const candidates = [environment.GCLOUD_PATH];
  const located = locateCommand("where.exe", ["gcloud.cmd"], {
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });

  if (located.status === 0) {
    candidates.push(...String(located.stdout || "").split(/\r?\n/));
  }

  if (environment.LOCALAPPDATA) {
    candidates.push(
      join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
    );
  }

  return candidates;
}

/**
 * Resolves only local Windows SDK locations. No command in this function calls
 * a Google Cloud API or requests a credential.
 */
export function resolveLocalGcloudExecutable({
  environment = process.env,
  locateCommand = spawnSync,
} = {}) {
  if (process.platform !== "win32") {
    return null;
  }

  for (const candidate of localPathCandidates(environment, locateCommand)) {
    const executable = normalizeExecutable(candidate);
    if (executable && basename(executable).toLowerCase() === "gcloud.cmd" && existsSync(executable)) {
      return executable;
    }
  }

  return null;
}

/**
 * Runs a local Windows executable through a fixed PowerShell -File host.
 * Child stdout and stderr stay in memory; this function never retries or
 * forwards them to the parent terminal.
 */
export function runWindowsProcess({
  executable,
  args = [],
  timeoutMs = 30_000,
  captureMode = "memory",
  environment = process.env,
  processHost = spawnSync,
} = {}) {
  if (process.platform !== "win32") {
    throw new Error("windows-process-host-required");
  }
  if (typeof executable !== "string" || executable.trim() === "") {
    throw new Error("executable-required");
  }
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== "string")) {
    throw new Error("string-argument-array-required");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("positive-timeout-required");
  }
  if (captureMode !== "memory") {
    throw new Error("memory-capture-required");
  }

  const payloadBase64 = Buffer.from(
    JSON.stringify({ executable: executable.trim(), args }),
    "utf8",
  ).toString("base64");

  const result = processHost(
    resolvePowerShellExecutable(environment),
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      PROCESS_HOST_SCRIPT,
      "-PayloadBase64",
      payloadBase64,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      shell: false,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: environment,
    },
  );

  return {
    exitCode: typeof result.status === "number" ? result.status : null,
    signal: result.signal || null,
    timedOut: result.error?.code === "ETIMEDOUT",
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    spawnError: createSpawnError(result.error),
  };
}

/** Builds one bounded child environment without proven auth override inputs. */
export function createSanitizedChildEnvironment({ environment = process.env, configRoot } = {}) {
  const source = environment && typeof environment === "object" ? environment : {};
  const child = {};
  for (const [key, value] of Object.entries(source)) {
    if (AUTH_OVERRIDE_ENV_SURFACES.includes(key)) continue;
    child[key] = value;
  }
  if (configRoot !== undefined && configRoot !== null && configRoot !== "") {
    child.CLOUDSDK_CONFIG = configRoot;
  }
  return Object.freeze(child);
}
