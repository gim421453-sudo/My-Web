import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const CONFIRM_TEXT = "CONFIRM_RESET";
const COLLECTIONS_TO_DELETE = ["users", "workspaces"];
const DELETE_BATCH_SIZE = 450;
const AUTH_DELETE_BATCH_SIZE = 1000;

function loadDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    const value = raw.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function loadFirebaseAdmin() {
  try {
    const admin = await import("firebase-admin");
    return admin.default || admin;
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("firebase-admin 패키지가 없습니다. 먼저 `npm install firebase-admin`을 실행하세요.");
    }
    throw error;
  }
}

function readServiceAccount() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson);

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicitPath && existsSync(explicitPath)) {
    return JSON.parse(readFileSync(explicitPath, "utf8"));
  }

  return null;
}

function initAdmin(admin) {
  if (admin.apps?.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccount = readServiceAccount();
  const options = {};
  if (projectId) options.projectId = projectId;

  if (serviceAccount) {
    return admin.initializeApp({
      ...options,
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return admin.initializeApp({
    ...options,
    credential: admin.credential.applicationDefault()
  });
}

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

async function listCollectionDocs(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    path: doc.ref.path,
    data: doc.data()
  }));
}

function printAuthPreview(users) {
  console.log("\n[Authentication 삭제 대상]");
  console.log(`총 ${users.length}개 계정`);
  if (!users.length) return;
  for (const user of users.slice(0, 50)) {
    const providers = user.providerData.map((provider) => provider.providerId).join(", ") || "password/unknown";
    console.log(`- ${user.uid} | ${user.email || "(no email)"} | ${providers}`);
  }
  if (users.length > 50) console.log(`... 외 ${users.length - 50}개`);
}

function printFirestorePreview(collectionName, docs) {
  console.log(`\n[Firestore ${collectionName} 컬렉션 삭제 대상]`);
  console.log(`총 ${docs.length}개 문서`);
  if (!docs.length) return;
  for (const doc of docs.slice(0, 50)) {
    const email = doc.data?.email ? ` | ${doc.data.email}` : "";
    const name = doc.data?.name || doc.data?.displayName || doc.data?.workspaceId || "";
    console.log(`- ${doc.path}${name ? ` | ${name}` : ""}${email}`);
  }
  if (docs.length > 50) console.log(`... 외 ${docs.length - 50}개`);
}

async function confirmReset() {
  const rl = createInterface({ input, output });
  try {
    console.log("\n주의: 이 작업은 되돌릴 수 없습니다.");
    console.log("- Firebase Authentication 전체 사용자를 삭제합니다.");
    console.log("- Firestore users 컬렉션 전체를 삭제합니다.");
    console.log("- Firestore workspaces 컬렉션 전체를 삭제합니다.");
    const answer = await rl.question(`\n진짜 삭제하려면 ${CONFIRM_TEXT} 를 정확히 입력하세요: `);
    return answer.trim() === CONFIRM_TEXT;
  } finally {
    rl.close();
  }
}

async function deleteAuthUsers(auth, users) {
  let deleted = 0;
  let failures = [];
  for (let i = 0; i < users.length; i += AUTH_DELETE_BATCH_SIZE) {
    const batch = users.slice(i, i + AUTH_DELETE_BATCH_SIZE);
    const result = await auth.deleteUsers(batch.map((user) => user.uid));
    deleted += result.successCount;
    failures.push(...result.errors.map((error) => ({
      uid: batch[error.index]?.uid,
      error: error.error?.message || String(error.error)
    })));
  }
  return { deleted, failures };
}

async function deleteCollectionDocs(db, collectionName) {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).limit(DELETE_BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
  return deleted;
}

async function main() {
  loadDotEnv();
  const admin = await loadFirebaseAdmin();
  initAdmin(admin);

  const auth = admin.auth();
  const db = admin.firestore();

  const authUsers = await listAllAuthUsers(auth);
  const firestoreTargets = {};
  for (const collectionName of COLLECTIONS_TO_DELETE) {
    firestoreTargets[collectionName] = await listCollectionDocs(db, collectionName);
  }

  console.log("\nFirebase 테스트 데이터 초기화 미리보기");
  console.log(`Project ID: ${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "(Application Default)"}`);
  printAuthPreview(authUsers);
  for (const collectionName of COLLECTIONS_TO_DELETE) {
    printFirestorePreview(collectionName, firestoreTargets[collectionName]);
  }

  const confirmed = await confirmReset();
  if (!confirmed) {
    console.log("\n입력이 일치하지 않아 삭제를 취소했습니다.");
    process.exitCode = 1;
    return;
  }

  console.log("\n삭제를 시작합니다...");
  const authResult = await deleteAuthUsers(auth, authUsers);
  console.log(`Authentication 삭제 완료: ${authResult.deleted}/${authUsers.length}`);
  if (authResult.failures.length) {
    console.log("Authentication 삭제 실패:");
    authResult.failures.forEach((failure) => console.log(`- ${failure.uid}: ${failure.error}`));
  }

  for (const collectionName of COLLECTIONS_TO_DELETE) {
    const deleted = await deleteCollectionDocs(db, collectionName);
    console.log(`Firestore ${collectionName} 삭제 완료: ${deleted}`);
  }

  console.log("\nFirebase 테스트 데이터 초기화가 완료되었습니다.");
}

main().catch((error) => {
  console.error("\nFirebase 테스트 데이터 초기화 실패");
  console.error(error?.message || error);
  process.exitCode = 1;
});
