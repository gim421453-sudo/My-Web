import { GoogleAuth } from "google-auth-library";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "my-management-app-8a933";
const DATABASE_ID = "(default)";
const DEFAULT_SERVICE_ACCOUNT = "my-management-app-8a933-firebase-adminsdk-fbsvc-4a3447a87a.json";
const OUTPUT_DIR = "output";
const INCLUDE_SENSITIVE = process.argv.includes("--include-sensitive");
const NO_OUTPUT = process.argv.includes("--no-output");

function normalizeLegacyDisabled(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function typeOfFirestoreValue(value) {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "object";
  return typeof value;
}

function valueBucket(value) {
  const type = typeOfFirestoreValue(value);
  if (type === "missing") return "missing";
  if (type === "null") return "null";
  if (type === "array") return "array";
  if (type === "object") return "object";
  return `${type}:${String(value)}`;
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function maskUid(uid) {
  if (!uid || typeof uid !== "string") return "";
  if (uid.length <= 8) return `${uid.slice(0, 2)}****`;
  return `${uid.slice(0, 4)}****${uid.slice(-4)}`;
}

function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const [name, domain = ""] = email.split("@");
  if (!domain) return `${name.slice(0, 4)}****`;
  return `${name.slice(0, 4)}****@${domain}`;
}

function safeUser(data) {
  const base = {
    uidMasked: maskUid(data.uid || data.id || ""),
    emailMasked: maskEmail(data.email || ""),
    displayName: data.displayName || data.name || "",
    status: data.status,
    active: data.active,
    disabled: data.disabled,
    disabledType: typeOfFirestoreValue(data.disabled),
    globalRole: data.globalRole,
    role: data.role,
    currentRole: data.currentRole,
    workspaceRole: data.workspaceRole,
    currentWorkspaceId: data.currentWorkspaceId,
    workspaceId: data.workspaceId,
    workspace_id: data.workspace_id,
    workspaceIds: data.workspaceIds,
  };
  if (INCLUDE_SENSITIVE) {
    base.uid = data.uid || data.id || "";
    base.email = data.email || "";
  }
  return base;
}

function safeMembership(entry) {
  const base = {
    collection: entry.collection,
    docId: entry.docId,
    workspaceId: entry.workspaceId,
    uidMasked: maskUid(entry.uid),
    dataUidMasked: maskUid(entry.dataUid),
    role: entry.role,
    status: entry.status,
    classification: entry.classification,
  };
  if (INCLUDE_SENSITIVE) {
    base.uid = entry.uid;
    base.dataUid = entry.dataUid;
  }
  return base;
}

function isAllowedStatus(status) {
  return ["pending", "active", "rejected", "disabled"].includes(status);
}

function isAllowedWorkspaceRole(role) {
  return ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"].includes(role);
}

function isWorkspaceValid(data) {
  const disabled = normalizeLegacyDisabled(data.disabled);
  return data.deleted !== true
    && data.archived !== true
    && data.active !== false
    && disabled !== true
    && !["deleted", "archived", "disabled", "suspended"].includes(String(data.status || ""));
}

function resolveCredentialMode() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && existsSync(envPath)) {
    return { mode: "GOOGLE_APPLICATION_CREDENTIALS", keyFilename: envPath };
  }
  if (existsSync(DEFAULT_SERVICE_ACCOUNT)) {
    return { mode: "local service account file", keyFilename: DEFAULT_SERVICE_ACCOUNT };
  }
  return { mode: "application default credentials", keyFilename: undefined };
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return "[bytes]";
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue.fields || {});
  }
  return undefined;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function docIdFromName(name) {
  return String(name || "").split("/").pop();
}

function documentFromRest(raw) {
  return {
    id: docIdFromName(raw.name),
    name: raw.name,
    data: decodeFirestoreFields(raw.fields || {}),
  };
}

async function createGoogleClient(credentialInfo) {
  const options = { scopes: ["https://www.googleapis.com/auth/cloud-platform"] };
  if (credentialInfo.keyFilename) options.keyFilename = credentialInfo.keyFilename;
  const auth = new GoogleAuth(options);
  return auth.getClient();
}

async function listFirestoreCollection(client, collectionPath) {
  const encodedPath = collectionPath.split("/").map(encodeURIComponent).join("/");
  let pageToken = "";
  const docs = [];
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents/${encodedPath}`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await client.request({ url: url.toString(), method: "GET" });
    docs.push(...(res.data.documents || []).map(documentFromRest));
    pageToken = res.data.nextPageToken || "";
  } while (pageToken);
  return docs;
}

async function listAllAuthUsers(client) {
  const users = [];
  let nextPageToken = "";
  do {
    const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet`);
    url.searchParams.set("pageSize", "1000");
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);
    const res = await client.request({ url: url.toString(), method: "GET" });
    users.push(...(res.data.users || []).map((user) => ({
      uid: user.localId,
      email: user.email || "",
      disabled: user.disabled === true,
      emailVerified: user.emailVerified === true,
      providerIds: (user.providerUserInfo || []).map((provider) => provider.providerId),
    })));
    nextPageToken = res.data.nextPageToken || "";
  } while (nextPageToken);
  return users;
}

function describeWorkspaceRef(value, validWorkspaceIds) {
  if (value === undefined) return "missing";
  if (value === null || value === "") return "null";
  if (typeof value !== "string") return `invalid-type:${typeOfFirestoreValue(value)}`;
  return validWorkspaceIds.has(value) ? "valid" : "orphan-or-deleted";
}

function workspaceIdsSummary(value, validWorkspaceIds) {
  if (value === undefined) return { bucket: "missing", invalidIds: [] };
  if (value === null) return { bucket: "null", invalidIds: [] };
  if (!Array.isArray(value)) return { bucket: `invalid-type:${typeOfFirestoreValue(value)}`, invalidIds: [] };
  if (value.length === 0) return { bucket: "empty-array", invalidIds: [] };
  const invalidIds = value.filter((workspaceId) => typeof workspaceId !== "string" || !validWorkspaceIds.has(workspaceId));
  return {
    bucket: invalidIds.length ? "array-with-orphan-or-deleted" : "array-valid-only",
    invalidIds,
  };
}

function conflictEntries(users) {
  const entries = {
    statusActiveAndActiveFalse: [],
    statusActiveAndDisabledTrue: [],
    statusDisabledAndActiveTrue: [],
    statusDisabledAndDisabledFalse: [],
    statusMissingWithLegacyOnly: [],
    allStatusFieldsMissing: [],
  };

  for (const user of users) {
    const data = user.data;
    const disabledNorm = normalizeLegacyDisabled(data.disabled);
    const hasStatus = Object.prototype.hasOwnProperty.call(data, "status");
    const hasActive = Object.prototype.hasOwnProperty.call(data, "active");
    const hasDisabled = Object.prototype.hasOwnProperty.call(data, "disabled");
    const safe = safeUser({ id: user.id, ...data });

    if (data.status === "active" && data.active === false) entries.statusActiveAndActiveFalse.push(safe);
    if (data.status === "active" && disabledNorm === true) entries.statusActiveAndDisabledTrue.push(safe);
    if (data.status === "disabled" && data.active === true) entries.statusDisabledAndActiveTrue.push(safe);
    if (data.status === "disabled" && disabledNorm === false) entries.statusDisabledAndDisabledFalse.push(safe);
    if (!hasStatus && (hasActive || hasDisabled)) entries.statusMissingWithLegacyOnly.push(safe);
    if (!hasStatus && !hasActive && !hasDisabled) entries.allStatusFieldsMissing.push(safe);
  }

  return entries;
}

function collectMembershipIssues(entries, validWorkspaceIds) {
  const byKey = new Map();
  const orphanMemberships = [];
  const uidMismatches = [];
  const workspaceIdMismatches = [];

  for (const entry of entries) {
    const validWorkspace = entry.workspaceId && validWorkspaceIds.has(entry.workspaceId);
    if (!validWorkspace) {
      entry.classification = "orphan membership / manual review / cleanup candidate";
      orphanMemberships.push(safeMembership(entry));
    }
    if (entry.collection === "nested" && entry.dataUid && entry.dataUid !== entry.uid) {
      uidMismatches.push(safeMembership(entry));
    }
    if (entry.parentWorkspaceId && entry.dataWorkspaceId && entry.parentWorkspaceId !== entry.dataWorkspaceId) {
      workspaceIdMismatches.push(safeMembership(entry));
    }

    const key = `${entry.workspaceId || ""}|${entry.uid || ""}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(entry);
  }

  const duplicateCombos = [];
  const roleMismatches = [];
  const statusMismatches = [];
  const legacyOnly = [];
  const nestedOnly = [];

  for (const [key, group] of byKey.entries()) {
    const collections = new Set(group.map((item) => item.collection));
    const roles = new Set(group.map((item) => item.role || ""));
    const statuses = new Set(group.map((item) => item.status || ""));
    if (group.length > 1) duplicateCombos.push({ key, entries: group.map(safeMembership) });
    if (roles.size > 1) roleMismatches.push({ key, entries: group.map(safeMembership) });
    if (statuses.size > 1) statusMismatches.push({ key, entries: group.map(safeMembership) });
    if (!collections.has("nested")) legacyOnly.push({ key, entries: group.map(safeMembership) });
    if (collections.size === 1 && collections.has("nested")) nestedOnly.push({ key, entries: group.map(safeMembership) });
  }

  return {
    duplicateCombos,
    roleMismatches,
    statusMismatches,
    uidMismatches,
    workspaceIdMismatches,
    orphanMemberships,
    legacyOnly,
    nestedOnly,
  };
}

function markdownList(items, render, max = 50) {
  if (!items.length) return "- 없음";
  const lines = items.slice(0, max).map(render);
  if (items.length > max) lines.push(`- ... ${items.length - max}개 추가`);
  return lines.join("\n");
}

function buildMarkdown(report) {
  const risks = [];
  if (report.users.disabledStringFalse.length || report.users.disabledStringTrue.length) {
    risks.push("disabled 문자열 타입이 존재합니다. Boolean(\"false\") 같은 변환을 쓰면 위험합니다.");
  }
  if (Object.values(report.users.conflicts).some((list) => Array.isArray(list) && list.length)) {
    risks.push("status/active/disabled 충돌 가능성이 있습니다.");
  }
  if (report.workspaceRefs.currentWorkspaceIdNullActive.length) {
    risks.push("currentWorkspaceId가 null인 active 사용자가 있습니다. 로그인 실패가 아니라 워크스페이스 선택/연결 화면으로 보내야 합니다.");
  }
  if (report.memberships.issues.orphanMemberships.length) {
    risks.push("삭제되었거나 존재하지 않는 워크스페이스를 참조하는 orphan membership이 있습니다. 자동 복구 대상이 아닙니다.");
  }

  return `# Auth Data Audit

생성일: ${new Date().toISOString()}

## 안전 모드

- 모드: READ-ONLY AUDIT
- Firestore 데이터 변경: 없음
- Firebase Auth 사용자 변경: 없음
- Markdown 민감정보: ${INCLUDE_SENSITIVE ? "원문 포함 옵션 사용" : "마스킹"}
- JSON 민감정보: ${INCLUDE_SENSITIVE ? "원문 포함 옵션 사용" : "마스킹"}

## 프로젝트

- projectId: ${report.projectId}
- credentials: ${report.credentialsMode}
- valid workspace count: ${report.workspaces.validCount}
- owner workspace candidate: ${report.workspaces.ownerWorkspaceIdCandidate || "확정 불가"}

## users 통계

- Firestore users 문서 수: ${report.users.total}
- Firebase Auth 사용자 수: ${report.authUsers.total}
- status counts: ${JSON.stringify(report.users.statusCounts)}
- active counts: ${JSON.stringify(report.users.activeCounts)}
- disabled counts: ${JSON.stringify(report.users.disabledCounts)}
- globalRole counts: ${JSON.stringify(report.users.globalRoleCounts)}
- role counts: ${JSON.stringify(report.users.roleCounts)}
- currentRole counts: ${JSON.stringify(report.users.currentRoleCounts)}
- workspaceRole counts: ${JSON.stringify(report.users.workspaceRoleCounts)}

## disabled 문자열 타입

### disabled == "false"
${markdownList(report.users.disabledStringFalse, (item) => `- ${item.uidMasked} / ${item.emailMasked} / ${item.displayName || "-"}`)}

### disabled == "true"
${markdownList(report.users.disabledStringTrue, (item) => `- ${item.uidMasked} / ${item.emailMasked} / ${item.displayName || "-"}`)}

## 상태 충돌

- status == active && active == false: ${report.users.conflicts.statusActiveAndActiveFalse.length}
- status == active && disabled true/"true": ${report.users.conflicts.statusActiveAndDisabledTrue.length}
- status == disabled && active == true: ${report.users.conflicts.statusDisabledAndActiveTrue.length}
- status == disabled && disabled false/"false": ${report.users.conflicts.statusDisabledAndDisabledFalse.length}
- status 없음 + active/disabled만 존재: ${report.users.conflicts.statusMissingWithLegacyOnly.length}
- status/active/disabled 모두 없음: ${report.users.conflicts.allStatusFieldsMissing.length}

## currentWorkspaceId == null인 active 사용자

${markdownList(report.workspaceRefs.currentWorkspaceIdNullActive, (item) => `- ${item.uidMasked} / ${item.emailMasked} / ${item.displayName || "-"}`)}

## 삭제 또는 존재하지 않는 워크스페이스 참조

- currentWorkspaceId invalid: ${report.workspaceRefs.currentWorkspaceIdInvalid.length}
- workspaceId invalid: ${report.workspaceRefs.workspaceIdInvalid.length}
- workspace_id invalid: ${report.workspaceRefs.workspace_idInvalid.length}
- workspaceIds invalid: ${report.workspaceRefs.workspaceIdsInvalid.length}

## 멤버십 감사

- workspace_members 문서 수: ${report.memberships.counts.workspace_members}
- workspaceMembers 문서 수: ${report.memberships.counts.workspaceMembers}
- nested members 문서 수: ${report.memberships.counts.nested}
- duplicate combo: ${report.memberships.issues.duplicateCombos.length}
- role mismatch: ${report.memberships.issues.roleMismatches.length}
- status mismatch: ${report.memberships.issues.statusMismatches.length}
- uid mismatch: ${report.memberships.issues.uidMismatches.length}
- workspaceId mismatch: ${report.memberships.issues.workspaceIdMismatches.length}
- orphan membership: ${report.memberships.issues.orphanMemberships.length}
- legacy only: ${report.memberships.issues.legacyOnly.length}
- nested only: ${report.memberships.issues.nestedOnly.length}

## 위험 요약

${risks.length ? risks.map((risk) => `- ${risk}`).join("\n") : "- 큰 충돌 신호 없음"}

## 권장 조치

- 삭제된 워크스페이스 참조는 복구하지 말고 orphan/manual review/cleanup candidate로 분류합니다.
- disabled 문자열은 실제 수정 전 정규화 결정표를 확정합니다.
- 최종 권한 기준은 workspaces/{workspaceId}/members/{uid}로 통일합니다.
- currentWorkspaceId == null active 사용자는 로그인 유지 후 워크스페이스 선택 또는 연결 요청 화면으로 보냅니다.
- 실제 정리/마이그레이션은 별도 dry-run 스크립트와 백업 후 승인 절차로만 진행합니다.
`;
}

async function main() {
  const credentialInfo = resolveCredentialMode();
  const client = await createGoogleClient(credentialInfo);

  console.log("Firebase projectId:", PROJECT_ID);
  console.log("Credentials mode:", credentialInfo.mode);
  console.log("READ-ONLY AUDIT - Firestore/Auth data will not be modified.");

  const [userDocs, workspaces, legacySnake, legacyCamel, systemOwnerDocs, authUsers] = await Promise.all([
    listFirestoreCollection(client, "users"),
    listFirestoreCollection(client, "workspaces"),
    listFirestoreCollection(client, "workspace_members"),
    listFirestoreCollection(client, "workspaceMembers"),
    listFirestoreCollection(client, "systemOwners"),
    listAllAuthUsers(client),
  ]);

  const validWorkspaces = workspaces
    .map((workspace) => ({ id: workspace.id, data: workspace.data, valid: isWorkspaceValid(workspace.data) }))
    .filter((workspace) => workspace.valid);
  const validWorkspaceIds = new Set(validWorkspaces.map((workspace) => workspace.id));

  const nestedMemberships = [];
  for (const workspace of workspaces) {
    const members = await listFirestoreCollection(client, `workspaces/${workspace.id}/members`);
    for (const member of members) {
      const data = member.data;
      nestedMemberships.push({
        collection: "nested",
        docId: `${workspace.id}/members/${member.id}`,
        parentWorkspaceId: workspace.id,
        workspaceId: workspace.id,
        dataWorkspaceId: data.workspaceId,
        uid: member.id,
        dataUid: data.uid,
        role: data.role,
        status: data.status,
      });
    }
  }

  const legacyEntries = [
    ...legacySnake.map((docItem) => ({
      collection: "workspace_members",
      docId: docItem.id,
      workspaceId: docItem.data.workspaceId,
      uid: docItem.data.uid,
      dataUid: docItem.data.uid,
      role: docItem.data.role,
      status: docItem.data.status,
    })),
    ...legacyCamel.map((docItem) => ({
      collection: "workspaceMembers",
      docId: docItem.id,
      workspaceId: docItem.data.workspaceId,
      uid: docItem.data.uid,
      dataUid: docItem.data.uid,
      role: docItem.data.role,
      status: docItem.data.status,
    })),
  ];
  const allMemberships = [...legacyEntries, ...nestedMemberships];

  const users = userDocs.map((user) => ({ id: user.id, data: { id: user.id, ...user.data } }));
  const statusCounts = {};
  const activeCounts = {};
  const disabledCounts = {};
  const globalRoleCounts = {};
  const roleCounts = {};
  const currentRoleCounts = {};
  const workspaceRoleCounts = {};
  const invalidStatusUsers = [];
  const disabledStringFalse = [];
  const disabledStringTrue = [];
  const disabledOtherType = [];
  const globalRoleInvalid = [];
  const globalRoleMissing = [];
  const roleSystemOwnerGlobalMismatch = [];
  const globalSystemOwnerRoleMismatch = [];

  const workspaceRefs = {
    currentWorkspaceIdNullActive: [],
    currentWorkspaceIdInvalid: [],
    workspaceIdInvalid: [],
    workspace_idInvalid: [],
    workspaceIdsMissing: [],
    workspaceIdsNull: [],
    workspaceIdsEmptyArray: [],
    workspaceIdsArray: [],
    workspaceIdsValidOnly: [],
    workspaceIdsInvalid: [],
    workspaceIdsWrongType: [],
  };

  for (const user of users) {
    const data = user.data;
    const safe = safeUser(data);
    increment(statusCounts, valueBucket(data.status));
    increment(activeCounts, valueBucket(data.active));
    increment(disabledCounts, valueBucket(data.disabled));
    increment(globalRoleCounts, valueBucket(data.globalRole));
    increment(roleCounts, valueBucket(data.role));
    increment(currentRoleCounts, valueBucket(data.currentRole));
    increment(workspaceRoleCounts, valueBucket(data.workspaceRole));

    if (!isAllowedStatus(data.status)) invalidStatusUsers.push(safe);
    if (data.disabled === "false") disabledStringFalse.push(safe);
    if (data.disabled === "true") disabledStringTrue.push(safe);
    if (data.disabled !== undefined && normalizeLegacyDisabled(data.disabled) === null) disabledOtherType.push(safe);

    if (data.globalRole === undefined) globalRoleMissing.push(safe);
    if (data.globalRole !== undefined && !["system_owner", "user"].includes(data.globalRole)) globalRoleInvalid.push(safe);
    if (data.role === "system_owner" && data.globalRole !== "system_owner") roleSystemOwnerGlobalMismatch.push(safe);
    if (data.globalRole === "system_owner" && data.role !== "system_owner") globalSystemOwnerRoleMismatch.push(safe);

    if (data.status === "active" && data.currentWorkspaceId == null) {
      workspaceRefs.currentWorkspaceIdNullActive.push(safe);
    }
    if (describeWorkspaceRef(data.currentWorkspaceId, validWorkspaceIds) === "orphan-or-deleted") {
      workspaceRefs.currentWorkspaceIdInvalid.push(safe);
    }
    if (describeWorkspaceRef(data.workspaceId, validWorkspaceIds) === "orphan-or-deleted") {
      workspaceRefs.workspaceIdInvalid.push(safe);
    }
    if (describeWorkspaceRef(data.workspace_id, validWorkspaceIds) === "orphan-or-deleted") {
      workspaceRefs.workspace_idInvalid.push(safe);
    }

    const wsSummary = workspaceIdsSummary(data.workspaceIds, validWorkspaceIds);
    if (wsSummary.bucket === "missing") workspaceRefs.workspaceIdsMissing.push(safe);
    if (wsSummary.bucket === "null") workspaceRefs.workspaceIdsNull.push(safe);
    if (wsSummary.bucket === "empty-array") workspaceRefs.workspaceIdsEmptyArray.push(safe);
    if (wsSummary.bucket === "array-valid-only") {
      workspaceRefs.workspaceIdsArray.push(safe);
      workspaceRefs.workspaceIdsValidOnly.push(safe);
    }
    if (wsSummary.bucket === "array-with-orphan-or-deleted") {
      workspaceRefs.workspaceIdsArray.push(safe);
      workspaceRefs.workspaceIdsInvalid.push({ ...safe, invalidWorkspaceIds: wsSummary.invalidIds });
    }
    if (wsSummary.bucket.startsWith("invalid-type")) workspaceRefs.workspaceIdsWrongType.push(safe);
  }

  const systemOwnerIds = new Set(systemOwnerDocs.map((docItem) => docItem.id));
  const userById = new Map(users.map((user) => [user.id, user.data]));
  const systemOwnerDocGlobalMismatch = systemOwnerDocs
    .filter((docItem) => userById.get(docItem.id)?.globalRole !== "system_owner")
    .map((docItem) => safeUser({ id: docItem.id, ...(userById.get(docItem.id) || { uid: docItem.id }) }));
  const globalSystemOwnerMissingSystemOwnerDoc = users
    .filter((user) => user.data.globalRole === "system_owner" && !systemOwnerIds.has(user.id))
    .map((user) => safeUser(user.data));

  const report = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    credentialsMode: credentialInfo.mode,
    mode: "READ-ONLY AUDIT",
    includeSensitive: INCLUDE_SENSITIVE,
    assumptions: {
      deletedWorkspacesAreNotRestored: true,
      validWorkspaceSource: "existing active workspaces collection documents",
      finalMembershipAuthorityCandidate: "workspaces/{workspaceId}/members/{uid}",
    },
    workspaces: {
      total: workspaces.length,
      validCount: validWorkspaces.length,
      validWorkspaceIds: INCLUDE_SENSITIVE ? [...validWorkspaceIds] : [...validWorkspaceIds].map(maskUid),
      ownerWorkspaceIdCandidate: validWorkspaces.length === 1 ? validWorkspaces[0].id : null,
      invalidOrInactive: workspaces
        .filter((workspace) => !validWorkspaceIds.has(workspace.id))
        .map((workspace) => ({ id: workspace.id, status: workspace.data.status, active: workspace.data.active, disabled: workspace.data.disabled })),
    },
    authUsers: {
      total: authUsers.length,
      disabledCount: authUsers.filter((user) => user.disabled).length,
      emailVerifiedCount: authUsers.filter((user) => user.emailVerified).length,
      authWithoutUserDoc: authUsers
        .filter((user) => !userById.has(user.uid))
        .map((user) => INCLUDE_SENSITIVE ? user : { uidMasked: maskUid(user.uid), emailMasked: maskEmail(user.email), disabled: user.disabled }),
    },
    users: {
      total: users.length,
      statusCounts,
      activeCounts,
      disabledCounts,
      invalidStatusUsers,
      disabledStringFalse,
      disabledStringTrue,
      disabledOtherType,
      conflicts: conflictEntries(users),
      globalRoleCounts,
      globalRoleMissing,
      globalRoleInvalid,
      roleCounts,
      currentRoleCounts,
      workspaceRoleCounts,
      roleSystemOwnerGlobalMismatch,
      globalSystemOwnerRoleMismatch,
      systemOwnerDocGlobalMismatch,
      globalSystemOwnerMissingSystemOwnerDoc,
    },
    workspaceRefs,
    memberships: {
      counts: {
        workspace_members: legacySnake.length,
        workspaceMembers: legacyCamel.length,
        nested: nestedMemberships.length,
      },
      validNestedOwnerWorkspaceMemberships: nestedMemberships
        .filter((entry) => validWorkspaceIds.has(entry.workspaceId) && entry.status === "active" && isAllowedWorkspaceRole(entry.role))
        .map(safeMembership),
      issues: collectMembershipIssues(allMemberships, validWorkspaceIds),
    },
    outputGitignore: {
      outputDirectoryIgnored: false,
      note: ".gitignore currently ignores output/pdf/ but not the entire output/ directory.",
    },
  };

  if (!NO_OUTPUT) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(path.join(OUTPUT_DIR, "auth-data-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(path.join(OUTPUT_DIR, "auth-data-audit.md"), buildMarkdown(report), "utf8");
  }

  console.log(JSON.stringify({
    users: report.users.total,
    authUsers: report.authUsers.total,
    validWorkspaces: report.workspaces.validCount,
    currentWorkspaceIdNullActive: report.workspaceRefs.currentWorkspaceIdNullActive.length,
    orphanMemberships: report.memberships.issues.orphanMemberships.length,
    disabledStringFalse: report.users.disabledStringFalse.length,
    disabledStringTrue: report.users.disabledStringTrue.length,
    output: NO_OUTPUT ? "not written" : ["output/auth-data-audit.json", "output/auth-data-audit.md"],
  }, null, 2));
}

main().catch((error) => {
  console.error("[READ-ONLY AUDIT FAILED]", error?.response?.data || error?.message || error);
  process.exitCode = 1;
});
