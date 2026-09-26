import { createHash } from "node:crypto";
import {
  EXACT_CLASS_READ_CONTRACT,
  runExactClassStateReadOnce,
  validateExactClassReadContract,
} from "./exactClassStateRead.mjs";
import {
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "./windowsGcloudProcessAdapter.mjs";
import { classifyImpersonatedTokenProcessResult } from "./gcloudTokenOutputClassifier.mjs";

const AUDIT_SERVICE_ACCOUNT = "myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com";
const EXPECTED_ACTIVE_CALLER_FINGERPRINT = "5e6692dda08c";
const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function safeError(code) {
  return Object.freeze({ ok: false, code });
}

function withProviderDiagnostic(diagnostic, providerAccepted, providerReason) {
  if (!diagnostic || typeof diagnostic !== "object") return null;
  return Object.freeze({
    ...diagnostic,
    providerAccepted,
    providerReason,
  });
}

function fingerprintCaller(rawAccount) {
  if (typeof rawAccount !== "string") return null;
  const normalized = rawAccount.trim().toLowerCase();
  if (!normalized || /\s/.test(normalized) || normalized.length > 320) return null;
  return createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").slice(0, 12);
}

function parseActiveAccounts(stdout) {
  if (typeof stdout !== "string") return [];
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function computeActiveCallerFingerprint(rawAccount) {
  return fingerprintCaller(rawAccount);
}

export async function discoverActiveCaller({
  executable,
  runProcess = runWindowsProcess,
} = {}) {
  if (typeof executable !== "string" || !executable.trim()) return safeError("GCLOUD_EXECUTABLE_UNAVAILABLE");
  let result;
  try {
    result = runProcess({
      executable,
      args: ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"],
      timeoutMs: 10_000,
    });
  } catch {
    return safeError("ACTIVE_CALLER_DISCOVERY_FAILED");
  }
  if (!result || result.exitCode !== 0 || result.timedOut) return safeError("ACTIVE_CALLER_DISCOVERY_FAILED");
  const accounts = parseActiveAccounts(result.stdout);
  const fingerprints = accounts.map(fingerprintCaller);
  if (fingerprints.some((value) => value === null)) return safeError("ACTIVE_CALLER_DISCOVERY_FAILED");
  return Object.freeze({
    ok: true,
    activeCallerCount: fingerprints.length,
    activeCallerFingerprint: fingerprints.length === 1 ? fingerprints[0] : null,
  });
}

export function createImpersonatedAccessTokenProvider({
  executable,
  runProcess = runWindowsProcess,
  classify = classifyImpersonatedTokenProcessResult,
} = {}) {
  return async function provideImpersonatedAccessToken() {
    if (typeof executable !== "string" || !executable.trim()) return safeError("GCLOUD_EXECUTABLE_UNAVAILABLE");
    let processResult;
    try {
      processResult = runProcess({
        executable,
        args: [
          "auth",
          "print-access-token",
          `--impersonate-service-account=${AUDIT_SERVICE_ACCOUNT}`,
          `--scopes=${DATASTORE_SCOPE}`,
          "--verbosity=error",
        ],
        timeoutMs: 10_000,
      });
    } catch {
      return safeError("TOKEN_GENERATION_FAILED");
    }
    const classified = classify({
      operation: "impersonated-access-token",
      exitCode: processResult?.exitCode,
      stdout: processResult?.stdout,
      stderr: processResult?.stderr,
      timedOut: processResult?.timedOut,
    });
    if (!classified.ok) return Object.freeze({
      ok: false,
      code: "TOKEN_GENERATION_FAILED",
      tokenPipelineDiagnostic: withProviderDiagnostic(classified.diagnostic, "no", "CLASSIFIER_REJECTED"),
    });
    return Object.freeze({
      ok: true,
      token: classified.token,
      tokenPipelineDiagnostic: withProviderDiagnostic(classified.diagnostic, "yes", "ACCEPTED"),
    });
  };
}

export async function runC1A3CorrectedExactClassStateRead({
  contract = EXACT_CLASS_READ_CONTRACT,
  executable,
  discoverCaller = discoverActiveCaller,
  activeCallerProvider,
  runProcess = runWindowsProcess,
  tokenProvider,
  httpGet,
} = {}) {
  const counters = {
    activeCallerDiscoveryCalls: 0,
    tokenCalls: 0,
    httpCalls: 0,
    retries: 0,
    writes: 0,
  };
  try {
    validateExactClassReadContract(contract);
  } catch (error) {
    return Object.freeze({ targetState: "STATIC_IDENTITY_MISMATCH", reason: error.code || "CONTRACT_MISMATCH", counters: Object.freeze(counters) });
  }

  counters.activeCallerDiscoveryCalls = 1;
  const caller = await (typeof activeCallerProvider === "function"
    ? activeCallerProvider()
    : discoverCaller({ executable: executable || resolveLocalGcloudExecutable(), runProcess }));
  if (!caller?.ok || caller.activeCallerCount !== 1 || caller.activeCallerFingerprint !== EXPECTED_ACTIVE_CALLER_FINGERPRINT) {
    return Object.freeze({
      targetState: "CALLER_IDENTITY_MISMATCH",
      reason: caller?.code || "CALLER_IDENTITY_MISMATCH",
      counters: Object.freeze(counters),
    });
  }

  const provider = tokenProvider || createImpersonatedAccessTokenProvider({ executable: executable || resolveLocalGcloudExecutable(), runProcess });
  const result = await runExactClassStateReadOnce({ contract, tokenProvider: provider, httpGet });
  return Object.freeze({
    ...result,
    counters: Object.freeze({
      activeCallerDiscoveryCalls: counters.activeCallerDiscoveryCalls,
      tokenCalls: result.counters.tokenCalls,
      httpCalls: result.counters.httpCalls,
      retries: result.counters.retries,
      writes: result.counters.writes,
    }),
  });
}

export const C1A3_CALLER_CONTRACT = Object.freeze({
  auditServiceAccount: AUDIT_SERVICE_ACCOUNT,
  expectedActiveCallerFingerprint: `sha256/12:${EXPECTED_ACTIVE_CALLER_FINGERPRINT}`,
  activeCallerCommand: Object.freeze(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]),
  tokenCommand: Object.freeze([
    "auth",
    "print-access-token",
    `--impersonate-service-account=${AUDIT_SERVICE_ACCOUNT}`,
    `--scopes=${DATASTORE_SCOPE}`,
    "--verbosity=error",
  ]),
  accessTokenMax: 1,
  exactGetDocumentMax: 1,
  retryMax: 0,
});
