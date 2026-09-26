import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTH_OVERRIDE_ENV_SURFACES } from "./windowsGcloudProcessAdapter.mjs";

const ACCOUNT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIG_NAME = /^[A-Za-z0-9_-]+$/;

function fingerprint(value) {
  return createHash("sha256").update(`g2b-local-pinned-identity-v1\n${value}`, "utf8").digest("hex");
}

function configuredRoot(environment) {
  if (typeof environment.CLOUDSDK_CONFIG === "string" && environment.CLOUDSDK_CONFIG.trim()) return environment.CLOUDSDK_CONFIG.trim();
  if (typeof environment.APPDATA === "string" && environment.APPDATA.trim()) return join(environment.APPDATA, "gcloud");
  return null;
}

function selectedConfiguration(root) {
  const activePath = join(root, "active_config");
  if (!existsSync(activePath)) return "default";
  const candidate = readFileSync(activePath, "utf8").trim();
  return CONFIG_NAME.test(candidate) ? candidate : null;
}

function configuredAccount(path) {
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let inCore = false;
  for (const line of lines) {
    if (/^\s*\[core\]\s*$/i.test(line)) { inCore = true; continue; }
    if (/^\s*\[[^\]]+\]\s*$/.test(line)) { inCore = false; continue; }
    if (inCore) {
      const match = line.match(/^\s*account\s*=\s*([^\s#;]+)\s*$/i);
      if (match) return match[1];
    }
  }
  return null;
}

function privateContext(principal) {
  const member = `${principal.endsWith(".gserviceaccount.com") ? "serviceAccount" : "user"}:${principal}`;
  const context = { identityFingerprint: fingerprint(principal), principalKind: member.split(":", 1)[0] };
  Object.defineProperties(context, {
    exactPrincipal: { value: principal, enumerable: false, writable: false, configurable: false },
    exactIamMember: { value: member, enumerable: false, writable: false, configurable: false },
  });
  return Object.freeze(context);
}

/** Reads one locally configured Cloud SDK account; it never enumerates, spawns, or contacts a provider. */
export function resolveG2BLocalPinnedIdentity({ environment = process.env } = {}) {
  const overridesPresent = AUTH_OVERRIDE_ENV_SURFACES.some((key) => typeof environment[key] === "string" && environment[key].trim() !== "");
  if (overridesPresent) return Object.freeze({ ok: false, code: "LOCAL_IDENTITY_AUTH_OVERRIDE_PRESENT" });
  const root = configuredRoot(environment);
  if (!root) return Object.freeze({ ok: false, code: "LOCAL_IDENTITY_CONFIG_ROOT_UNAVAILABLE" });
  let configuration;
  let account;
  try {
    configuration = selectedConfiguration(root);
    account = configuration ? configuredAccount(join(root, "configurations", `config_${configuration}`)) : null;
  } catch {
    return Object.freeze({ ok: false, code: "LOCAL_IDENTITY_CONFIG_UNREADABLE" });
  }
  if (!ACCOUNT.test(account || "")) return Object.freeze({ ok: false, code: "LOCAL_IDENTITY_CONFIGURED_ACCOUNT_UNAVAILABLE" });
  return Object.freeze({ ok: true, state: "LOCAL_PINNED_IDENTITY_RESOLVED", context: privateContext(account) });
}

export const G2B_LOCAL_PINNED_IDENTITY_RESOLVER_CONTRACT = Object.freeze({
  localConfigReadsMax: 2,
  accountEnumerationReachable: false,
  processSpawnReachable: false,
  networkAccessReachable: false,
  authOverridesBlocked: true,
  exactPrincipalPersisted: false,
  exactIamMemberPersisted: false,
  crossAccountFallbackReachable: false,
});
