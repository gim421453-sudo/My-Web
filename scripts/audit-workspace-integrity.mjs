import { GoogleAuth } from "google-auth-library";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "my-management-app-8a933";
const DATABASE_ID = "(default)";
const DEFAULT_SERVICE_ACCOUNT = "my-management-app-8a933-firebase-adminsdk-fbsvc-4a3447a87a.json";
const OUTPUT_DIR = "output";
const INCLUDE_SENSITIVE = process.argv.includes("--include-sensitive");
const NO_OUTPUT = process.argv.includes("--no-output");
const MAX_DOCS_PER_COLLECTION = Number(process.env.PM_AUDIT_MAX_DOCS || 5000);

const WORKSPACE_ROLES = ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"];
const OWNER_FIELDS = ["ownerUid", "ownerId", "createdBy", "createdByUid"];
const STATUS_FIELDS = ["status", "active", "disabled", "deleted", "deletedAt", "archived", "archivedAt", "removed", "removedAt"];
const TIMESTAMP_FIELD_PATTERN = /(created|updated|deleted|archived|removed|joined|used|last|restored|approved|rejected|disabled).*(at|time|date)$/i;
const DELETION_FIELD_PATTERN = /(delete|deleted|archive|archived|remove|removed|inactive|disabled|suspend|suspended|status)/i;

const MAJOR_SUBCOLLECTIONS = [
  "members",
  "inviteCodes",
  "invites",
  "invitations",
  "students",
  "friends",
  "people",
  "attendance",
  "assignments",
  "exams",
  "lessons",
  "materials",
  "notices",
  "systemNotices",
  "schoolNotices",
  "homeLetters",
  "academicSchedules",
  "meals",
  "mealApplications",
  "timetable",
  "timetableSets",
  "periodTimes",
  "subjects",
  "teachers",
  "portfolios",
  "penalties",
  "friendAwards",
  "projects",
  "budget",
  "requests",
  "systemReports",
  "workspaceUpdates",
  "afterschoolPrograms",
  "afterschoolAttendance",
  "afterschoolSchedules",
  "specialLecturePrograms",
  "specialLectureAttendance",
  "specialLectureSchedules",
  "clubs",
  "clubPrograms",
  "clubAttendance",
  "clubSchedules",
];

function increment(map, key) {
  map[key || "(empty)"] = (map[key || "(empty)"] || 0) + 1;
}

function typeOfValue(value) {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "object";
  return typeof value;
}

function rawAndType(value) {
  return {
    value,
    type: typeOfValue(value),
  };
}

function normalizeBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function maskUid(uid) {
  if (!uid || typeof uid !== "string") return "";
  if (INCLUDE_SENSITIVE) return uid;
  if (uid.length <= 8) return `${uid.slice(0, 2)}****`;
  return `${uid.slice(0, 4)}****${uid.slice(-4)}`;
}

function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  if (INCLUDE_SENSITIVE) return email;
  const [name, domain = ""] = email.split("@");
  if (!domain) return `${name.slice(0, 4)}****`;
  return `${name.slice(0, 4)}****@${domain}`;
}

function maskKnownIds(value, knownUids) {
  if (!value || INCLUDE_SENSITIVE) return value || "";
  let masked = String(value);
  for (const uid of knownUids) {
    if (uid) masked = masked.split(uid).join(maskUid(uid));
  }
  masked = masked.replace(/[A-Z0-9._%+-]{2,}@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (match) => maskEmail(match));
  return masked;
}

function presentUid(uid) {
  return INCLUDE_SENSITIVE ? { uid } : { uidMasked: maskUid(uid) };
}

function presentUserEmail(email) {
  return INCLUDE_SENSITIVE ? { email } : { emailMasked: maskEmail(email) };
}

function isProbablyDeleted(data) {
  const disabled = normalizeBoolean(data.disabled);
  const status = String(data.status || "").toLowerCase();
  return data.deleted === true
    || data.archived === true
    || data.removed === true
    || disabled === true
    || ["deleted", "archived", "removed", "disabled", "suspended", "inactive"].includes(status)
    || Boolean(data.deletedAt || data.archivedAt || data.removedAt);
}

function isWorkspaceValid(data) {
  return !isProbablyDeleted(data) && data.active !== false;
}

function isTimestampLike(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function compareTimestampDesc(a, b) {
  return String(b.timestamp || "").localeCompare(String(a.timestamp || ""));
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

function encodeDocPath(docPath) {
  return docPath.split("/").map(encodeURIComponent).join("/");
}

async function createGoogleClient(credentialInfo) {
  const options = { scopes: ["https://www.googleapis.com/auth/cloud-platform"] };
  if (credentialInfo.keyFilename) options.keyFilename = credentialInfo.keyFilename;
  const auth = new GoogleAuth(options);
  return auth.getClient();
}

async function listFirestoreCollection(client, collectionPath) {
  const docs = [];
  let pageToken = "";
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents/${encodeDocPath(collectionPath)}`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    try {
      const res = await client.request({ url: url.toString(), method: "GET" });
      docs.push(...(res.data.documents || []).map(documentFromRest));
      pageToken = res.data.nextPageToken || "";
    } catch (error) {
      if (error?.response?.status === 404) return docs;
      throw error;
    }
  } while (pageToken && docs.length < MAX_DOCS_PER_COLLECTION);
  return docs;
}

async function listCollectionIds(client, docPath) {
  const ids = [];
  let pageToken = "";
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents/${encodeDocPath(docPath)}:listCollectionIds`;
    try {
      const res = await client.request({
        url,
        method: "POST",
        data: {
          pageSize: 1000,
          pageToken: pageToken || undefined,
        },
      });
      ids.push(...(res.data.collectionIds || []));
      pageToken = res.data.nextPageToken || "";
    } catch (error) {
      if (error?.response?.status === 404) return ids;
      throw error;
    }
  } while (pageToken);
  return ids.sort((a, b) => a.localeCompare(b));
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

function getFirstValue(data, fields) {
  for (const field of fields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") return data[field];
  }
  return null;
}

function extractDeletionFields(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([key]) => DELETION_FIELD_PATTERN.test(key)),
  );
}

function extractTimestampTraces(data, pathLabel) {
  return Object.entries(data || {})
    .filter(([key, value]) => TIMESTAMP_FIELD_PATTERN.test(key) && isTimestampLike(value))
    .map(([field, value]) => ({
      path: pathLabel,
      field,
      timestamp: value,
    }));
}

function buildMembershipKey(workspaceId, uid) {
  return `${workspaceId || ""}|${uid || ""}`;
}

function mapTopLevelMembership(doc, sourceCollection) {
  return {
    sourceCollection,
    documentId: doc.id,
    workspaceId: doc.data.workspaceId || doc.data.workspace_id || doc.data.currentWorkspaceId || "",
    uid: doc.data.uid || doc.data.userId || doc.data.userUid || "",
    role: doc.data.role || doc.data.workspaceRole || doc.data.currentRole || "",
    status: doc.data.status || "",
    data: doc.data,
  };
}

function mapNestedMembership(doc, workspaceId) {
  return {
    sourceCollection: "workspaces/{workspaceId}/members",
    documentId: `${workspaceId}/members/${doc.id}`,
    workspaceId,
    uid: doc.data.uid || doc.id,
    memberDocId: doc.id,
    role: doc.data.role || "",
    status: doc.data.status || "",
    data: doc.data,
  };
}

function statusBucket(value) {
  return value || "(missing)";
}

function roleBucket(value) {
  return value || "(missing)";
}

function classifyWorkspace(summary) {
  const evidence = [];
  const warnings = [];
  const ownerHasSystemOwnerDoc = summary.owner.systemOwnersDocExists === true;
  const ownerGlobalRoleIsSystemOwner = summary.owner.usersGlobalRole === "system_owner";
  const ownerNestedSuperManager = summary.owner.nestedRole === "super_manager";
  const hasMembers = summary.nestedMembers.count > 0 || summary.legacyMemberships.workspace_membersCount > 0 || summary.legacyMemberships.workspaceMembersCount > 0;
  const hasUserRefs = summary.userReferences.currentWorkspaceIdCount > 0
    || summary.userReferences.workspaceIdCount > 0
    || summary.userReferences.workspaceIdsArrayCount > 0;
  const nameText = `${summary.name || ""} ${summary.title || ""}`.toLowerCase();

  if (summary.deletionStatus.isDeletedLike) {
    evidence.push("deleted/archived/disabled 계열 필드 또는 상태가 감지되었습니다.");
    return {
      candidate: "likely-deleted-but-document-remains",
      evidence,
      warnings,
    };
  }

  if (!summary.owner.ownerUid && !hasMembers && !hasUserRefs && summary.subcollections.presentCount === 0) {
    evidence.push("ownerUid, 멤버십, 사용자 참조, 하위 컬렉션이 모두 없습니다.");
    return {
      candidate: "orphan-workspace",
      evidence,
      warnings,
    };
  }

  if (/test|demo|sample|테스트|임시/.test(nameText)) {
    evidence.push("워크스페이스 이름 또는 제목에 테스트/임시성 키워드가 있습니다.");
    return {
      candidate: "likely-test-workspace",
      evidence,
      warnings,
    };
  }

  if (summary.owner.ownerUid && ownerHasSystemOwnerDoc && ownerGlobalRoleIsSystemOwner && ownerNestedSuperManager) {
    evidence.push("ownerUid가 systemOwners 문서와 users.globalRole=system_owner, nested role=super_manager를 모두 만족합니다.");
    return {
      candidate: "confirmed-owner-workspace",
      evidence,
      warnings,
    };
  }

  if (summary.owner.ownerUid && (ownerHasSystemOwnerDoc || ownerGlobalRoleIsSystemOwner || ownerNestedSuperManager)) {
    evidence.push("ownerUid에 오너 관련 신호가 일부 존재하지만 전부 일치하지는 않습니다.");
    if (!ownerGlobalRoleIsSystemOwner) warnings.push("ownerUid의 users.globalRole이 system_owner와 일치하지 않습니다.");
    if (!ownerNestedSuperManager) warnings.push("ownerUid의 nested member role이 super_manager가 아닙니다.");
    return {
      candidate: "manual-review-required",
      evidence,
      warnings,
    };
  }

  if (hasMembers || hasUserRefs || summary.subcollections.presentCount > 0) {
    evidence.push("멤버십, 사용자 참조 또는 하위 컬렉션 데이터가 존재합니다.");
    return {
      candidate: "likely-active-workspace",
      evidence,
      warnings,
    };
  }

  evidence.push("활성/삭제 여부를 단정할 충분한 신호가 없습니다.");
  return {
    candidate: "manual-review-required",
    evidence,
    warnings,
  };
}

function safeAccount(uid, context) {
  const authUser = context.authByUid.get(uid);
  const userDoc = context.userByUid.get(uid);
  const ownerWorkspaceRoles = context.ownerWorkspaceIds
    .map((workspaceId) => {
      const nested = context.nestedByKey.get(buildMembershipKey(workspaceId, uid));
      return nested ? `${workspaceId}:${nested.role || "(missing)"}` : `${workspaceId}:-`;
    });
  const systemOwnerDocExists = context.systemOwnerIds.has(uid);
  const disabledValue = userDoc?.disabled;
  const disabledNormalized = normalizeBoolean(disabledValue);
  const candidateReasons = [];
  const mismatches = [];

  if (systemOwnerDocExists) candidateReasons.push("systemOwners 문서 존재");
  if (userDoc?.globalRole === "system_owner") candidateReasons.push("users.globalRole=system_owner");
  if (userDoc?.role === "system_owner") candidateReasons.push("users.role=system_owner");
  if (context.workspaceOwnerIds.has(uid)) candidateReasons.push("workspace.ownerUid");
  if (ownerWorkspaceRoles.some((role) => role.endsWith(":super_manager"))) candidateReasons.push("오너 후보 workspace nested super_manager");

  if (systemOwnerDocExists && userDoc?.globalRole !== "system_owner") {
    mismatches.push("systemOwners 문서 존재 + users.globalRole != system_owner");
  }
  if (userDoc?.globalRole === "system_owner" && !systemOwnerDocExists) {
    mismatches.push("globalRole == system_owner + systemOwners 문서 없음");
  }
  if (userDoc?.role === "system_owner" && userDoc?.globalRole !== "system_owner") {
    mismatches.push("role == system_owner + globalRole != system_owner");
  }
  if (candidateReasons.length && userDoc?.status !== "active") {
    mismatches.push("system_owner 후보지만 status != active");
  }
  if (candidateReasons.length && disabledNormalized === true) {
    mismatches.push("system_owner 후보지만 disabled true 또는 \"true\"");
  }

  return {
    ...presentUid(uid),
    ...presentUserEmail(authUser?.email || userDoc?.email || ""),
    displayName: userDoc?.displayName || userDoc?.name || "",
    authUserExists: Boolean(authUser),
    usersDocExists: Boolean(userDoc),
    usersGlobalRole: userDoc?.globalRole,
    usersRole: userDoc?.role,
    usersCurrentRole: userDoc?.currentRole,
    usersStatus: userDoc?.status,
    usersActive: rawAndType(userDoc?.active),
    usersDisabled: rawAndType(disabledValue),
    systemOwnersDocExists: systemOwnerDocExists,
    ownerWorkspaceNestedRole: ownerWorkspaceRoles.join(", ") || "-",
    ownerCandidate: candidateReasons.length > 0,
    ownerCandidateReasons: candidateReasons,
    mismatchDescription: mismatches.join("; ") || "-",
  };
}

function safeMembershipDetail(entry, context) {
  const key = buildMembershipKey(entry.workspaceId, entry.uid);
  const nested = context.nestedByKey.get(key);
  const sameSnake = context.snakeByKey.get(key) || [];
  const sameCamel = context.camelByKey.get(key) || [];
  const counterpartCollections = [];
  if (entry.sourceCollection !== "workspace_members" && sameSnake.length) counterpartCollections.push("workspace_members");
  if (entry.sourceCollection !== "workspaceMembers" && sameCamel.length) counterpartCollections.push("workspaceMembers");
  if (entry.sourceCollection !== "workspaces/{workspaceId}/members" && nested) counterpartCollections.push("nested members");

  const workspaceDoc = context.workspaceById.get(entry.workspaceId);
  const workspaceExists = Boolean(workspaceDoc);
  const deletedWorkspaceReference = workspaceExists ? isProbablyDeleted(workspaceDoc.data) : false;
  const userDocExists = context.userByUid.has(entry.uid);
  const authUserExists = context.authByUid.has(entry.uid);
  const roleValues = [entry.role, nested?.role, ...sameSnake.map((item) => item.role), ...sameCamel.map((item) => item.role)]
    .filter((value) => value !== undefined && value !== null && value !== "");
  const statusValues = [entry.status, nested?.status, ...sameSnake.map((item) => item.status), ...sameCamel.map((item) => item.status)]
    .filter((value) => value !== undefined && value !== null && value !== "");
  const roleMismatch = new Set(roleValues).size > 1;
  const statusMismatch = new Set(statusValues).size > 1;

  const recommendedAction = recommendMembershipAction({
    workspaceExists,
    deletedWorkspaceReference,
    userDocExists,
    authUserExists,
    nestedExists: Boolean(nested),
    counterpartLegacyExists: counterpartCollections.some((name) => name === "workspace_members" || name === "workspaceMembers"),
    roleMismatch,
    statusMismatch,
  });

  return {
    sourceCollection: entry.sourceCollection,
    documentId: maskKnownIds(entry.documentId, context.knownUids),
    ...presentUid(entry.uid),
    workspaceId: entry.workspaceId || "",
    role: entry.role || "",
    status: entry.status || "",
    workspaceDocumentExists: workspaceExists,
    userDocumentExists: userDocExists,
    authUserExists,
    nestedMemberExists: Boolean(nested),
    counterpartLegacyCollections: counterpartCollections,
    roleMismatch,
    statusMismatch,
    deletedWorkspaceReference,
    cleanupCandidate: ["cleanup-candidate", "orphan-deleted-workspace", "duplicate-legacy-record"].includes(recommendedAction),
    automaticRecoveryForbidden: true,
    recommendedAction,
  };
}

function severityRankForMembershipAction(action) {
  const ranks = {
    "manual-review-required": 5,
    "orphan-deleted-workspace": 4,
    "cleanup-candidate": 3,
    "migrate-after-review": 2,
    "duplicate-legacy-record": 1,
    "keep-temporarily": 0,
  };
  return ranks[action] ?? 0;
}

function groupMembershipDetails(details) {
  const groups = new Map();
  for (const detail of details) {
    const uidLabel = detail.uid || detail.uidMasked || "";
    const key = `${detail.workspaceId}|${uidLabel}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(detail);
  }

  return [...groups.values()].map((items) => {
    const first = items[0];
    const recommendedAction = items
      .map((item) => item.recommendedAction)
      .sort((a, b) => severityRankForMembershipAction(b) - severityRankForMembershipAction(a))[0];
    return {
      sourceCollection: [...new Set(items.map((item) => item.sourceCollection))].join(", "),
      documentId: items.map((item) => item.documentId).join(", "),
      uid: first.uid,
      uidMasked: first.uidMasked,
      workspaceId: first.workspaceId,
      role: [...new Set(items.map((item) => item.role || ""))].filter(Boolean).join(", "),
      status: [...new Set(items.map((item) => item.status || ""))].filter(Boolean).join(", "),
      workspaceDocumentExists: items.some((item) => item.workspaceDocumentExists),
      userDocumentExists: items.some((item) => item.userDocumentExists),
      authUserExists: items.some((item) => item.authUserExists),
      nestedMemberExists: items.some((item) => item.nestedMemberExists),
      counterpartLegacyCollections: [...new Set(items.flatMap((item) => item.counterpartLegacyCollections))],
      roleMismatch: items.some((item) => item.roleMismatch),
      statusMismatch: items.some((item) => item.statusMismatch),
      deletedWorkspaceReference: items.some((item) => item.deletedWorkspaceReference),
      cleanupCandidate: items.some((item) => item.cleanupCandidate),
      automaticRecoveryForbidden: true,
      recommendedAction,
      documents: items,
    };
  });
}

function recommendMembershipAction(info) {
  if (!info.workspaceExists || info.deletedWorkspaceReference) return "orphan-deleted-workspace";
  if (info.nestedExists && info.counterpartLegacyExists && !info.roleMismatch && !info.statusMismatch) return "duplicate-legacy-record";
  if (!info.nestedExists && info.workspaceExists && info.userDocExists && info.authUserExists) return "migrate-after-review";
  if (!info.userDocExists && !info.authUserExists) return "cleanup-candidate";
  if (info.roleMismatch || info.statusMismatch) return "manual-review-required";
  return "keep-temporarily";
}

function table(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

function listLines(items, render) {
  if (!items.length) return "- 없음";
  return items.map(render).join("\n");
}

function buildMarkdown(report) {
  const workspaceRows = report.workspaces.items;
  const ownerCandidateRows = report.ownerAccounts.filter((account) => account.ownerCandidate);
  const ownerWorkspaceCandidates = workspaceRows.filter((workspace) => (
    workspace.classification.candidate === "confirmed-owner-workspace"
    || workspace.classification.evidence.some((item) => item.includes("오너"))
    || workspace.owner.systemOwnersDocExists
    || workspace.owner.usersGlobalRole === "system_owner"
    || workspace.owner.nestedRole === "super_manager"
  ));
  const secondWorkspaceScenarios = workspaceRows.map((workspace) => {
    if (workspace.classification.candidate === "likely-test-workspace") return `${workspace.workspaceId}: 테스트/임시 workspace 가능성`;
    if (workspace.classification.candidate === "likely-deleted-but-document-remains") return `${workspace.workspaceId}: 삭제 처리 후 문서만 남은 workspace 가능성`;
    if (workspace.classification.candidate === "orphan-workspace") return `${workspace.workspaceId}: 연결 대상이 없는 orphan workspace 가능성`;
    if (workspace.classification.candidate === "manual-review-required") return `${workspace.workspaceId}: 오너/멤버십 신호가 불일치하여 수동 확인 필요`;
    return `${workspace.workspaceId}: 실제 활성 workspace 또는 오너 workspace 가능성`;
  });

  return `# Workspace Integrity Audit

생성일: ${report.generatedAt}

## 감사 모드

- 모드: READ-ONLY AUDIT
- Firestore 데이터 수정: 없음
- Firebase Auth 사용자 수정/삭제: 없음
- Rules 변경/배포: 없음
- 민감정보 표시: ${report.includeSensitive ? "원문 포함 옵션 사용" : "UID/이메일/일부 문서 ID 마스킹"}
- Firestore database: ${report.databaseId}

## 1. 발견된 workspace 비교표

${table(workspaceRows, [
  { label: "workspaceId", value: (row) => row.workspaceId },
  { label: "name/title", value: (row) => row.name || row.title || "-" },
  { label: "ownerUid", value: (row) => row.owner.ownerUidMasked || row.owner.ownerUid || "-" },
  { label: "status", value: (row) => row.status.value ?? "-" },
  { label: "active", value: (row) => `${row.active.value ?? "-"} (${row.active.type})` },
  { label: "disabled", value: (row) => `${row.disabled.value ?? "-"} (${row.disabled.type})` },
  { label: "deleted", value: (row) => `${row.deleted.value ?? "-"} (${row.deleted.type})` },
  { label: "nested members", value: (row) => row.nestedMembers.count },
  { label: "legacy snake/camel", value: (row) => `${row.legacyMemberships.workspace_membersCount}/${row.legacyMemberships.workspaceMembersCount}` },
  { label: "user refs", value: (row) => `current:${row.userReferences.currentWorkspaceIdCount}, workspaceId:${row.userReferences.workspaceIdCount}, array:${row.userReferences.workspaceIdsArrayCount}` },
  { label: "classification", value: (row) => row.classification.candidate },
])}

## 2. 오너 workspace 후보와 근거

${listLines(ownerWorkspaceCandidates, (workspace) => `- ${workspace.workspaceId}: ${workspace.classification.candidate} / 근거: ${workspace.classification.evidence.join(", ") || "근거 부족"} / 경고: ${workspace.classification.warnings.join(", ") || "없음"}`)}

## 3. 두 번째 workspace 정체 후보

${listLines(secondWorkspaceScenarios, (line) => `- ${line}`)}

## 4. 실제 오너 계정 후보 비교

${table(ownerCandidateRows, [
  { label: "uid", value: (row) => row.uidMasked || row.uid || "-" },
  { label: "email", value: (row) => row.emailMasked || row.email || "-" },
  { label: "displayName", value: (row) => row.displayName || "-" },
  { label: "Auth", value: (row) => row.authUserExists },
  { label: "users", value: (row) => row.usersDocExists },
  { label: "globalRole", value: (row) => row.usersGlobalRole || "-" },
  { label: "role", value: (row) => row.usersRole || "-" },
  { label: "status", value: (row) => row.usersStatus || "-" },
  { label: "disabled", value: (row) => `${row.usersDisabled.value ?? "-"} (${row.usersDisabled.type})` },
  { label: "systemOwners", value: (row) => row.systemOwnersDocExists },
  { label: "owner ws role", value: (row) => row.ownerWorkspaceNestedRole },
  { label: "불일치", value: (row) => row.mismatchDescription },
])}

## 5. systemOwners/globalRole 불일치 상세

${listLines(report.systemOwnerMismatches, (item) => `- ${item.kind}: ${item.uidMasked || item.uid || "-"} / ${item.emailMasked || item.email || "-"} / ${item.description}`)}

## 6. orphan membership 상세

${table(report.memberships.orphanMemberships, [
  { label: "source", value: (row) => row.sourceCollection },
  { label: "documentId", value: (row) => row.documentId },
  { label: "uid", value: (row) => row.uidMasked || row.uid || "-" },
  { label: "workspaceId", value: (row) => row.workspaceId || "-" },
  { label: "role", value: (row) => row.role || "-" },
  { label: "status", value: (row) => row.status || "-" },
  { label: "workspace", value: (row) => row.workspaceDocumentExists },
  { label: "user/auth", value: (row) => `${row.userDocumentExists}/${row.authUserExists}` },
  { label: "nested", value: (row) => row.nestedMemberExists },
  { label: "권장", value: (row) => row.recommendedAction },
])}

## 7. legacy-only membership 상세

${table(report.memberships.legacyOnlyMemberships, [
  { label: "source", value: (row) => row.sourceCollection },
  { label: "documentId", value: (row) => row.documentId },
  { label: "uid", value: (row) => row.uidMasked || row.uid || "-" },
  { label: "workspaceId", value: (row) => row.workspaceId || "-" },
  { label: "role", value: (row) => row.role || "-" },
  { label: "status", value: (row) => row.status || "-" },
  { label: "counterpart", value: (row) => row.counterpartLegacyCollections.join(", ") || "-" },
  { label: "role/status mismatch", value: (row) => `${row.roleMismatch}/${row.statusMismatch}` },
  { label: "권장", value: (row) => row.recommendedAction },
])}

## 8. 수동 확인이 필요한 질문

- 두 workspace 중 사용자가 실제로 유지하려는 workspaceId는 어느 것인가요?
- 두 번째 workspace가 삭제했다고 생각한 workspace인지, 테스트/백업/개인 workspace인지 확인이 필요합니다.
- systemOwners 문서가 있는 UID를 실제 시스템 오너로 유지할지 확인이 필요합니다.
- users.globalRole과 systemOwners 문서 중 어느 값을 기준으로 먼저 맞출지 승인해야 합니다.
- legacy membership을 nested members로 마이그레이션할지, 삭제 후보로 분리할지 결정해야 합니다.

## 9. 데이터 변경 전 필수 확인사항

- Firestore 전체 백업 또는 export 확보
- 실제 오너 계정 UID와 이메일 확인
- 유지할 workspaceId 확정
- 삭제 후보 workspace가 실제 삭제 대상인지 확인
- legacy membership 처리 정책 승인
- Rules 배포 전 Emulator 테스트 통과

## 10. 다음 권장 단계

1. 이 감사 보고서의 workspaceId와 오너 후보를 사람이 확인합니다.
2. dry-run 전용 정리 계획서를 작성합니다.
3. 승인 후에만 별도 복구/정리 스크립트를 작성합니다.
4. 실제 쓰기 전 Firebase export 또는 백업을 남깁니다.
5. 마이그레이션 후 Rules 후보를 Emulator로 검증합니다.
`;
}

async function buildWorkspaceSummary(client, workspace, context) {
  const workspaceId = workspace.id;
  const data = workspace.data;
  const ownerUid = getFirstValue(data, OWNER_FIELDS);
  const nestedDocs = await listFirestoreCollection(client, `workspaces/${workspaceId}/members`);
  const nestedMembers = nestedDocs.map((doc) => mapNestedMembership(doc, workspaceId));
  const nestedRoleCounts = {};
  const nestedStatusCounts = {};
  for (const member of nestedMembers) {
    increment(nestedRoleCounts, roleBucket(member.role));
    increment(nestedStatusCounts, statusBucket(member.status));
  }

  const subcollectionIds = await listCollectionIds(client, `workspaces/${workspaceId}`);
  const subcollections = [];
  const subcollectionTraces = [];
  for (const subcollectionId of subcollectionIds) {
    const docs = await listFirestoreCollection(client, `workspaces/${workspaceId}/${subcollectionId}`);
    subcollections.push({
      name: subcollectionId,
      exists: docs.length > 0,
      documentCount: docs.length,
      truncatedAt: docs.length >= MAX_DOCS_PER_COLLECTION ? MAX_DOCS_PER_COLLECTION : null,
    });
    for (const doc of docs) {
      subcollectionTraces.push(...extractTimestampTraces(doc.data, `workspaces/${workspaceId}/${subcollectionId}/${doc.id}`));
    }
  }

  const workspaceMembersSnake = context.legacySnake.filter((entry) => entry.workspaceId === workspaceId);
  const workspaceMembersCamel = context.legacyCamel.filter((entry) => entry.workspaceId === workspaceId);
  const usersByCurrentWorkspace = context.users.filter((user) => user.data.currentWorkspaceId === workspaceId);
  const usersByWorkspaceId = context.users.filter((user) => user.data.workspaceId === workspaceId);
  const usersByWorkspaceIds = context.users.filter((user) => Array.isArray(user.data.workspaceIds) && user.data.workspaceIds.includes(workspaceId));
  const topLevelInviteDocs = [
    ...context.invites.filter((doc) => doc.data.workspaceId === workspaceId),
    ...context.invitations.filter((doc) => doc.data.workspaceId === workspaceId),
    ...context.inviteCodes.filter((doc) => doc.data.workspaceId === workspaceId),
  ];
  const nestedInviteCollections = subcollections.filter((subcollection) => ["inviteCodes", "invites", "invitations"].includes(subcollection.name));
  const ownerUser = ownerUid ? context.userByUid.get(ownerUid) : null;
  const ownerNested = ownerUid ? nestedMembers.find((member) => member.uid === ownerUid || member.memberDocId === ownerUid) : null;
  const ownerAuth = ownerUid ? context.authByUid.get(ownerUid) : null;

  const recentActivityTraces = [
    ...extractTimestampTraces(data, `workspaces/${workspaceId}`),
    ...nestedMembers.flatMap((member) => extractTimestampTraces(member.data, `workspaces/${workspaceId}/members/${member.memberDocId}`)),
    ...workspaceMembersSnake.flatMap((member) => extractTimestampTraces(member.data, `workspace_members/${member.documentId}`)),
    ...workspaceMembersCamel.flatMap((member) => extractTimestampTraces(member.data, `workspaceMembers/${member.documentId}`)),
    ...subcollectionTraces,
  ].sort(compareTimestampDesc).slice(0, 10);

  const majorSubcollections = Object.fromEntries(
    MAJOR_SUBCOLLECTIONS.map((name) => {
      const found = subcollections.find((subcollection) => subcollection.name === name);
      return [name, {
        exists: Boolean(found),
        documentCount: found?.documentCount || 0,
      }];
    }),
  );

  const deletionStatus = {
    isDeletedLike: isProbablyDeleted(data),
    deletionFields: extractDeletionFields(data),
  };

  const summary = {
    workspaceId,
    name: data.name || "",
    title: data.title || "",
    owner: {
      ...presentUid(ownerUid || ""),
      ownerUid: INCLUDE_SENSITIVE ? ownerUid : undefined,
      ownerUidMasked: INCLUDE_SENSITIVE ? undefined : maskUid(ownerUid || ""),
      usersDocumentExists: Boolean(ownerUser),
      authUserExists: Boolean(ownerAuth),
      nestedMemberExists: Boolean(ownerNested),
      nestedRole: ownerNested?.role || "",
      systemOwnersDocExists: ownerUid ? context.systemOwnerIds.has(ownerUid) : false,
      usersGlobalRole: ownerUser?.globalRole,
      usersRole: ownerUser?.role,
    },
    status: rawAndType(data.status),
    active: rawAndType(data.active),
    disabled: rawAndType(data.disabled),
    deleted: rawAndType(data.deleted),
    deletedAt: rawAndType(data.deletedAt),
    createdAt: rawAndType(data.createdAt),
    updatedAt: rawAndType(data.updatedAt),
    deletionStatus,
    nestedMembers: {
      count: nestedMembers.length,
      roleCounts: nestedRoleCounts,
      statusCounts: nestedStatusCounts,
      activeAcceptedPendingDisabledCounts: {
        active: nestedMembers.filter((member) => member.status === "active").length,
        accepted: nestedMembers.filter((member) => member.status === "accepted").length,
        pending: nestedMembers.filter((member) => member.status === "pending").length,
        disabled: nestedMembers.filter((member) => member.status === "disabled").length,
      },
      superManagerUids: nestedMembers.filter((member) => member.role === "super_manager").map((member) => maskUid(member.uid)),
    },
    legacyMemberships: {
      workspace_membersCount: workspaceMembersSnake.length,
      workspaceMembersCount: workspaceMembersCamel.length,
    },
    userReferences: {
      currentWorkspaceIdCount: usersByCurrentWorkspace.length,
      workspaceIdCount: usersByWorkspaceId.length,
      workspaceIdsArrayCount: usersByWorkspaceIds.length,
    },
    subcollections: {
      presentCount: subcollections.filter((item) => item.exists).length,
      observed: subcollections,
      major: majorSubcollections,
    },
    inviteCodes: {
      exists: topLevelInviteDocs.length > 0 || nestedInviteCollections.some((item) => item.documentCount > 0),
      topLevelCount: topLevelInviteDocs.length,
      nestedCollectionCount: nestedInviteCollections.reduce((sum, item) => sum + item.documentCount, 0),
    },
    recentActivityTraces: recentActivityTraces.map((trace) => ({
      ...trace,
      path: maskKnownIds(trace.path, context.knownUids),
    })),
    ownerMismatchSignals: {
      ownerUidNotInSystemOwners: Boolean(ownerUid) && context.systemOwnerIds.size > 0 && !context.systemOwnerIds.has(ownerUid),
      ownerUidNotNestedSuperManager: Boolean(ownerUid) && !nestedMembers.some((member) => member.uid === ownerUid && member.role === "super_manager"),
      nestedSuperManagerUidNotOwnerUid: nestedMembers.some((member) => member.role === "super_manager" && ownerUid && member.uid !== ownerUid),
    },
  };

  summary.classification = classifyWorkspace(summary);
  return { summary, nestedMembers };
}

async function main() {
  const credentialInfo = resolveCredentialMode();
  const client = await createGoogleClient(credentialInfo);

  console.log("Firebase projectId:", PROJECT_ID);
  console.log("Credentials mode:", credentialInfo.mode);
  console.log("READ-ONLY AUDIT - Firestore/Auth data will not be modified.");

  const [
    workspaces,
    userDocs,
    authUsers,
    systemOwnerDocs,
    workspaceMembersSnakeDocs,
    workspaceMembersCamelDocs,
    invites,
    invitations,
    inviteCodes,
  ] = await Promise.all([
    listFirestoreCollection(client, "workspaces"),
    listFirestoreCollection(client, "users"),
    listAllAuthUsers(client),
    listFirestoreCollection(client, "systemOwners"),
    listFirestoreCollection(client, "workspace_members"),
    listFirestoreCollection(client, "workspaceMembers"),
    listFirestoreCollection(client, "invites"),
    listFirestoreCollection(client, "invitations"),
    listFirestoreCollection(client, "inviteCodes"),
  ]);

  const users = userDocs.map((doc) => ({ id: doc.id, data: { uid: doc.id, ...doc.data } }));
  const userByUid = new Map(users.map((user) => [user.id, user.data]));
  const authByUid = new Map(authUsers.map((user) => [user.uid, user]));
  const systemOwnerIds = new Set(systemOwnerDocs.map((doc) => doc.id));
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const knownUids = new Set([
    ...users.map((user) => user.id),
    ...authUsers.map((user) => user.uid),
    ...systemOwnerDocs.map((doc) => doc.id),
  ]);

  const legacySnake = workspaceMembersSnakeDocs.map((doc) => mapTopLevelMembership(doc, "workspace_members"));
  const legacyCamel = workspaceMembersCamelDocs.map((doc) => mapTopLevelMembership(doc, "workspaceMembers"));

  const baseContext = {
    users,
    userByUid,
    authByUid,
    systemOwnerIds,
    knownUids,
    legacySnake,
    legacyCamel,
    invites,
    invitations,
    inviteCodes,
  };

  const workspaceSummaries = [];
  const allNestedMembers = [];
  for (const workspace of workspaces) {
    const { summary, nestedMembers } = await buildWorkspaceSummary(client, workspace, baseContext);
    workspaceSummaries.push(summary);
    allNestedMembers.push(...nestedMembers);
  }

  const nestedByKey = new Map(allNestedMembers.map((member) => [buildMembershipKey(member.workspaceId, member.uid), member]));
  const snakeByKey = new Map();
  const camelByKey = new Map();
  for (const member of legacySnake) {
    const key = buildMembershipKey(member.workspaceId, member.uid);
    if (!snakeByKey.has(key)) snakeByKey.set(key, []);
    snakeByKey.get(key).push(member);
  }
  for (const member of legacyCamel) {
    const key = buildMembershipKey(member.workspaceId, member.uid);
    if (!camelByKey.has(key)) camelByKey.set(key, []);
    camelByKey.get(key).push(member);
  }

  const workspaceOwnerIds = new Set(workspaceSummaries.map((workspace) => {
    const rawWorkspace = workspaceById.get(workspace.workspaceId);
    return getFirstValue(rawWorkspace?.data || {}, OWNER_FIELDS);
  }).filter(Boolean));
  const ownerWorkspaceIds = workspaceSummaries
    .filter((workspace) => workspace.owner.systemOwnersDocExists || workspace.owner.usersGlobalRole === "system_owner" || workspace.owner.nestedRole === "super_manager")
    .map((workspace) => workspace.workspaceId);
  const detailContext = {
    ...baseContext,
    workspaceById,
    nestedByKey,
    snakeByKey,
    camelByKey,
    workspaceOwnerIds,
    ownerWorkspaceIds,
  };

  const accountUids = new Set([
    ...users.map((user) => user.id),
    ...authUsers.map((user) => user.uid),
    ...systemOwnerDocs.map((doc) => doc.id),
    ...workspaceOwnerIds,
    ...allNestedMembers.map((member) => member.uid),
  ]);
  const ownerAccounts = [...accountUids].sort().map((uid) => safeAccount(uid, detailContext));

  const allLegacyEntries = [...legacySnake, ...legacyCamel];
  const orphanMemberships = allLegacyEntries
    .filter((member) => !workspaceById.has(member.workspaceId) || isProbablyDeleted(workspaceById.get(member.workspaceId)?.data || {}))
    .map((member) => safeMembershipDetail(member, detailContext));
  const legacyOnlyMembershipDocuments = allLegacyEntries
    .filter((member) => !nestedByKey.has(buildMembershipKey(member.workspaceId, member.uid)))
    .map((member) => safeMembershipDetail(member, detailContext));
  const legacyOnlyMemberships = groupMembershipDetails(legacyOnlyMembershipDocuments);

  const systemOwnerMismatches = [];
  for (const systemOwnerId of systemOwnerIds) {
    const user = userByUid.get(systemOwnerId);
    if (user?.globalRole !== "system_owner") {
      systemOwnerMismatches.push({
        kind: "systemOwners-globalRole-mismatch",
        ...presentUid(systemOwnerId),
        ...presentUserEmail(user?.email || authByUid.get(systemOwnerId)?.email || ""),
        description: "systemOwners 문서가 있지만 users.globalRole이 system_owner가 아닙니다.",
      });
    }
  }
  for (const user of users) {
    if (user.data.globalRole === "system_owner" && !systemOwnerIds.has(user.id)) {
      systemOwnerMismatches.push({
        kind: "globalRole-systemOwners-missing",
        ...presentUid(user.id),
        ...presentUserEmail(user.data.email || authByUid.get(user.id)?.email || ""),
        description: "users.globalRole은 system_owner이지만 systemOwners 문서가 없습니다.",
      });
    }
    if (user.data.role === "system_owner" && user.data.globalRole !== "system_owner") {
      systemOwnerMismatches.push({
        kind: "legacy-role-system-owner-mismatch",
        ...presentUid(user.id),
        ...presentUserEmail(user.data.email || authByUid.get(user.id)?.email || ""),
        description: "users.role은 system_owner이지만 users.globalRole은 system_owner가 아닙니다.",
      });
    }
  }
  for (const workspace of workspaceSummaries) {
    if (workspace.ownerMismatchSignals.ownerUidNotInSystemOwners) {
      systemOwnerMismatches.push({
        kind: "workspace-owner-systemOwners-mismatch",
        ...presentUid(workspace.owner.ownerUid || ""),
        description: `${workspace.workspaceId} ownerUid가 systemOwners UID 목록에 없습니다.`,
      });
    }
    if (workspace.ownerMismatchSignals.ownerUidNotNestedSuperManager) {
      systemOwnerMismatches.push({
        kind: "workspace-owner-nested-super-manager-mismatch",
        ...presentUid(workspace.owner.ownerUid || ""),
        description: `${workspace.workspaceId} ownerUid가 nested members의 super_manager와 일치하지 않습니다.`,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    credentialsMode: credentialInfo.mode,
    mode: "READ-ONLY AUDIT",
    includeSensitive: INCLUDE_SENSITIVE,
    counts: {
      workspaces: workspaces.length,
      users: users.length,
      authUsers: authUsers.length,
      systemOwners: systemOwnerDocs.length,
      workspace_members: legacySnake.length,
      workspaceMembers: legacyCamel.length,
      nestedMembers: allNestedMembers.length,
      orphanMemberships: orphanMemberships.length,
      legacyOnlyMemberships: legacyOnlyMemberships.length,
      legacyOnlyMembershipDocuments: legacyOnlyMembershipDocuments.length,
    },
    workspaces: {
      items: workspaceSummaries,
    },
    ownerAccounts,
    systemOwnerMismatches,
    memberships: {
      orphanMemberships,
      legacyOnlyMemberships,
      legacyOnlyMembershipDocuments,
    },
    notes: [
      "이 스크립트는 Firestore REST GET/POST listCollectionIds와 Identity Toolkit batchGet만 사용합니다.",
      "Firestore 쓰기 API, Auth 수정 API, Rules 배포 API를 사용하지 않습니다.",
      "output/ 결과 파일은 감사 산출물이며 Git 커밋 대상이 아닙니다.",
    ],
  };

  if (!NO_OUTPUT) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(path.join(OUTPUT_DIR, "workspace-integrity-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(path.join(OUTPUT_DIR, "workspace-integrity-audit.md"), buildMarkdown(report), "utf8");
  }

  console.log(JSON.stringify({
    workspaces: report.counts.workspaces,
    ownerWorkspaceCandidates: ownerWorkspaceIds.length,
    ownerAccountCandidates: ownerAccounts.filter((account) => account.ownerCandidate).length,
    systemOwnerMismatches: systemOwnerMismatches.length,
    orphanMemberships: orphanMemberships.length,
    legacyOnlyMemberships: legacyOnlyMemberships.length,
    output: NO_OUTPUT ? "not written" : ["output/workspace-integrity-audit.json", "output/workspace-integrity-audit.md"],
  }, null, 2));
}

main().catch((error) => {
  console.error("[READ-ONLY WORKSPACE AUDIT FAILED]", error?.response?.data || error?.message || error);
  process.exitCode = 1;
});
