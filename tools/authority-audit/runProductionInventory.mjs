import { hash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleAuth, Impersonated } from "google-auth-library";
import {
  AUTHORITY_SCOPES,
  DEFAULT_LIMITS,
  renderSanitizedReport,
  runAuthorityInventory,
} from "./authorityInventory.mjs";
import { createFirestoreReadOnlyAuthorityStore } from "./firestoreReadOnlyStore.mjs";

const REPORT_PATH = resolve("docs", "trusted-backend-authority-inventory-report.md");
const READ_PERMISSIONS = ["datastore.entities.get", "datastore.entities.list"];
const WRITE_PERMISSIONS = [
  "datastore.entities.create", "datastore.entities.update", "datastore.entities.delete",
];

function safeFailure(code) {
  process.stdout.write(JSON.stringify({
    mode: "PRODUCTION_READ_ONLY_AUDIT",
    result: "BLOCKED",
    blocker: code,
    productionFirestoreReads: 0,
    productionFirestoreWrites: 0,
  }, null, 2) + "\n");
  process.exitCode = 1;
}

function staticPreflight() {
  const projectId = String(process.env.MYWEB_AUDIT_PROJECT_ID || "").trim();
  if (!projectId) throw new Error("PROJECT_CONFIRMATION_BLOCKED");
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("SERVICE_ACCOUNT_KEY_FORBIDDEN");
  if (process.env.MYWEB_AUDIT_CREDENTIAL_MODE !== "impersonated") {
    throw new Error("READ_ONLY_IAM_BLOCKED");
  }
  const targetPrincipal = String(process.env.MYWEB_AUDIT_IMPERSONATE_SERVICE_ACCOUNT || "").trim();
  if (!targetPrincipal) throw new Error("READ_ONLY_IAM_BLOCKED");
  return {
    projectId,
    projectFingerprint: hash("sha256", projectId, "hex").slice(0, 8),
    targetPrincipal,
  };
}

async function impersonatedClient(targetPrincipal) {
  const sourceClient = await new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  }).getClient();
  return new Impersonated({
    sourceClient,
    targetPrincipal,
    targetScopes: ["https://www.googleapis.com/auth/cloud-platform"],
    lifetime: 900,
  });
}

async function testEffectivePermissions(client, projectId) {
  const response = await client.request({
    url: `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:testIamPermissions`,
    method: "POST",
    data: { permissions: [...READ_PERMISSIONS, ...WRITE_PERMISSIONS] },
  });
  const granted = new Set(Array.isArray(response.data?.permissions) ? response.data.permissions : []);
  if (!READ_PERMISSIONS.every((permission) => granted.has(permission))) {
    throw new Error("READ_ONLY_IAM_BLOCKED");
  }
  if (WRITE_PERMISSIONS.some((permission) => granted.has(permission))) {
    throw new Error("READ_ONLY_IAM_BLOCKED");
  }
}

function adminCredential(client) {
  return {
    async getAccessToken() {
      const token = await client.getAccessToken();
      if (!token?.token) throw new Error("IMPERSONATED_TOKEN_UNAVAILABLE");
      return { access_token: token.token, expires_in: 600 };
    },
  };
}

async function main() {
  const context = staticPreflight();
  if (process.argv.includes("--preflight")) {
    process.stdout.write(JSON.stringify({
      mode: "PRODUCTION_READ_ONLY_AUDIT",
      writeEnabled: false,
      projectConfirmed: true,
      readIdentityConfigured: true,
      projectFingerprint: context.projectFingerprint,
      allowedScopes: AUTHORITY_SCOPES.length,
      ...DEFAULT_LIMITS,
      networkRequestPerformed: false,
    }, null, 2) + "\n");
    return;
  }

  const client = await impersonatedClient(context.targetPrincipal);
  await testEffectivePermissions(client, context.projectId);
  process.stdout.write(JSON.stringify({
    mode: "PRODUCTION_READ_ONLY_AUDIT",
    writeEnabled: false,
    projectConfirmed: true,
    readIdentityConfirmed: true,
    projectFingerprint: context.projectFingerprint,
    allowedScopes: AUTHORITY_SCOPES.length,
    ...DEFAULT_LIMITS,
  }, null, 2) + "\n");

  const app = initializeApp({
    projectId: context.projectId,
    credential: adminCredential(client),
  }, `authority-audit-${Date.now()}`);
  const store = createFirestoreReadOnlyAuthorityStore(getFirestore(app));
  const summary = await runAuthorityInventory(store);
  const report = renderSanitizedReport(summary, {
    projectFingerprint: context.projectFingerprint,
    credentialMode: "short-lived impersonated identity",
  });
  await writeFile(REPORT_PATH, report, "utf8");
  process.stdout.write(JSON.stringify({
    result: summary.status,
    blocker: summary.blocker,
    productionFirestoreReads: summary.totalReads,
    productionFirestoreWrites: 0,
    report: "docs/trusted-backend-authority-inventory-report.md",
  }, null, 2) + "\n");
  if (summary.status !== "COMPLETE") process.exitCode = 1;
}

const SAFE_BLOCKERS = new Set([
  "PROJECT_CONFIRMATION_BLOCKED",
  "SERVICE_ACCOUNT_KEY_FORBIDDEN",
  "READ_ONLY_IAM_BLOCKED",
  "IMPERSONATED_TOKEN_UNAVAILABLE",
  "INVENTORY_INCOMPLETE_CAP_REACHED",
  "CANONICAL_MEMBERSHIP_SCOPE_VIOLATION",
]);

main().catch((error) => {
  const code = SAFE_BLOCKERS.has(error?.message) ? error.message : "OTHER";
  safeFailure(code);
});
