import { existsSync, readFileSync } from "node:fs";

function loadDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function loadFirebaseAdmin() {
  const admin = await import("firebase-admin");
  return admin.default || admin;
}

function readServiceAccount() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson);
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicitPath && existsSync(explicitPath)) return JSON.parse(readFileSync(explicitPath, "utf8"));
  return null;
}

function initAdmin(admin) {
  if (admin.apps?.length) return admin.app();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccount = readServiceAccount();
  const options = {};
  if (projectId) options.projectId = projectId;
  if (serviceAccount) return admin.initializeApp({ ...options, credential: admin.credential.cert(serviceAccount) });
  return admin.initializeApp({ ...options, credential: admin.credential.applicationDefault() });
}

loadDotEnv();
const admin = await loadFirebaseAdmin();
initAdmin(admin);
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const schemaCollections = [
  "users",
  "workspaces",
  "workspaceMembers",
  "adminApplications",
  "chatThreads",
  "chatMessages",
  "logs",
  "driveConnections",
  "recordingJobs"
];

await db.collection("systemConfig").doc("bootstrap").set({
  ownerCreated: false,
  autoOwnerCreationLocked: true,
  initializedAt: now,
  updatedAt: now
}, { merge: true });

await Promise.all(schemaCollections.map((collection) => (
  db.collection(collection).doc("_schema").set({
    collection,
    reserved: true,
    createdBy: "initialize-firebase-schema",
    updatedAt: now
  }, { merge: true })
)));

await db.collection("logs").doc(`schema_init_${Date.now()}`).set({
  level: "info",
  source: "firebase",
  action: "initialize_schema",
  message: "Firestore schema markers initialized",
  workspaceId: "_system",
  uid: "_system",
  createdAt: now
});

console.log(`Initialized Firestore schema markers: ${schemaCollections.join(", ")}`);
