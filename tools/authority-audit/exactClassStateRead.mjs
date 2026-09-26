import https from "node:https";

const PROJECT_ID = "my-management-app-8a933";
const DATABASE_ID = "(default)";
const WORKSPACE_ID = "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1";
const CLASS_ID = "class_2026_g2_c5";
const PLAN_ID = "2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1";
const SOURCE_FINGERPRINT = "sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da";
const FIELD_MASK = Object.freeze([
  "schemaVersion", "version", "workspaceId", "classId", "status", "source",
  "createdAt", "updatedAt", "createdBy", "displayName", "schoolYear", "grade",
]);
const MAX_RESPONSE_BYTES = 64 * 1024;
const HTTP_TIMEOUT_MS = 10_000;
const REQUIRED_FIELDS = new Set([
  "schemaVersion", "version", "workspaceId", "classId", "status", "source",
  "createdAt", "updatedAt", "createdBy", "displayName",
]);
const ALLOWED_STATUSES = new Set(["active", "inactive"]);
const ALLOWED_SOURCES = new Set(["manual_admin", "migration", "system_bootstrap", "external_import"]);

export const EXACT_CLASS_READ_CONTRACT = Object.freeze({
  projectId: PROJECT_ID,
  databaseId: DATABASE_ID,
  workspaceId: WORKSPACE_ID,
  classId: CLASS_ID,
  planId: PLAN_ID,
  sourceFingerprint: SOURCE_FINGERPRINT,
  fieldMask: FIELD_MASK,
  expected: Object.freeze({
    classId: CLASS_ID,
    displayName: "2학년 5반",
    status: "active",
    schoolYear: "2026",
    grade: "2",
  }),
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function encodePathSegment(value) {
  return encodeURIComponent(value).replaceAll("(", "%28").replaceAll(")", "%29");
}

function sameArray(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateExactClassReadContract(input = EXACT_CLASS_READ_CONTRACT) {
  if (!input || typeof input !== "object") throw fail("CONTRACT_MISMATCH");
  for (const key of ["projectId", "databaseId", "workspaceId", "classId", "planId", "sourceFingerprint"]) {
    if (input[key] !== EXACT_CLASS_READ_CONTRACT[key]) throw fail("CONTRACT_MISMATCH");
  }
  if (!sameArray(input.fieldMask, FIELD_MASK)) throw fail("FIELD_MASK_MISMATCH");
  if (!input.expected || JSON.stringify(input.expected) !== JSON.stringify(EXACT_CLASS_READ_CONTRACT.expected)) {
    throw fail("CONTRACT_MISMATCH");
  }
  return EXACT_CLASS_READ_CONTRACT;
}

export function buildExactClassResource(input = EXACT_CLASS_READ_CONTRACT) {
  const contract = validateExactClassReadContract(input);
  return `projects/${encodePathSegment(contract.projectId)}/databases/${encodePathSegment(contract.databaseId)}/documents/workspaces/${encodePathSegment(contract.workspaceId)}/classRegistry/${encodePathSegment(contract.classId)}`;
}

export function buildExactClassGetDocumentUrl(input = EXACT_CLASS_READ_CONTRACT, baseUrl = "https://firestore.googleapis.com/v1") {
  const contract = validateExactClassReadContract(input);
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${buildExactClassResource(contract)}`);
  for (const fieldPath of FIELD_MASK) url.searchParams.append("mask.fieldPaths", fieldPath);
  return url.toString();
}

function parseTypedValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };
  const keys = Object.keys(value);
  if (keys.length !== 1) return { ok: false };
  const [key] = keys;
  if (key === "stringValue" || key === "timestampValue") {
    return typeof value[key] === "string" && value[key].length > 0 ? { ok: true, value: value[key] } : { ok: false };
  }
  if (key === "integerValue") {
    if (!/^\d+$/.test(String(value[key]))) return { ok: false };
    const number = Number(value[key]);
    return Number.isSafeInteger(number) ? { ok: true, value: number } : { ok: false };
  }
  return { ok: false };
}

function parseMaskedFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  const keys = Object.keys(fields);
  if (keys.some((key) => !FIELD_MASK.includes(key))) return null;
  for (const key of REQUIRED_FIELDS) if (!Object.hasOwn(fields, key)) return null;
  const parsed = {};
  for (const key of keys) {
    const result = parseTypedValue(fields[key]);
    if (!result.ok) return null;
    parsed[key] = result.value;
  }
  return parsed;
}

function isValidDocumentId(value) {
  if (typeof value !== "string" || !value || value !== value.trim() || value === "." || value === ".." || value.includes("/")) return false;
  return new TextEncoder().encode(value).length <= 1500;
}

function parseCanonicalClass(fields, contract) {
  const parsed = parseMaskedFields(fields);
  if (!parsed || parsed.schemaVersion !== 1 || !Number.isSafeInteger(parsed.version) || parsed.version < 1
    || parsed.workspaceId !== contract.workspaceId || parsed.classId !== contract.classId
    || !ALLOWED_STATUSES.has(parsed.status) || !ALLOWED_SOURCES.has(parsed.source)
    || !isValidDocumentId(parsed.createdBy)
    || typeof parsed.createdAt !== "string" || typeof parsed.updatedAt !== "string"
    || typeof parsed.displayName !== "string" || parsed.displayName.length === 0 || parsed.displayName.length > 200
    || (parsed.schoolYear !== undefined && (typeof parsed.schoolYear !== "string" || parsed.schoolYear.length === 0 || parsed.schoolYear.length > 40))
    || (parsed.grade !== undefined && (typeof parsed.grade !== "string" || parsed.grade.length === 0 || parsed.grade.length > 80))) {
    return null;
  }
  return parsed;
}

function parseBody(body) {
  if (typeof body === "object" && body !== null) return body;
  if (typeof body !== "string" || body.length > MAX_RESPONSE_BYTES) return null;
  try { return JSON.parse(body); } catch { return null; }
}

function boundedResult(overrides, counters) {
  return Object.freeze({
    targetState: "STATE_READ_INCONCLUSIVE",
    httpStatus: null,
    resourceMatch: false,
    casState: "UNRESOLVED",
    schemaVersion: null,
    semanticComparison: null,
    conflicts: Object.freeze([]),
    tokenPipelineDiagnostic: null,
    counters: Object.freeze({ ...counters }),
    ...overrides,
  });
}

function classifyResponse(response, contract, counters) {
  if (!response || response.redirected === true || (response.statusCode >= 300 && response.statusCode < 400)) {
    return boundedResult({ targetState: "STATE_READ_UNEXPECTED_RESPONSE_ABORT", reason: "redirect" }, counters);
  }
  const status = response.statusCode;
  if (status === 404) {
    const body = parseBody(response.body);
    if (body?.error?.status !== "NOT_FOUND") return boundedResult({ targetState: "STATE_READ_UNEXPECTED_RESPONSE_ABORT", httpStatus: status }, counters);
    return boundedResult({ targetState: "ABSENT", httpStatus: status, casState: "MISSING", createStatePrerequisiteConfirmed: true }, counters);
  }
  if (status === 401) return boundedResult({ targetState: "STATE_READ_AUTHENTICATION_FAILED", httpStatus: status }, counters);
  if (status === 403) return boundedResult({ targetState: "STATE_READ_PERMISSION_DENIED", httpStatus: status }, counters);
  if (status === 429 || status >= 500) return boundedResult({ targetState: "STATE_READ_INCONCLUSIVE", httpStatus: status }, counters);
  if (status !== 200) return boundedResult({ targetState: "STATE_READ_UNEXPECTED_RESPONSE_ABORT", httpStatus: status }, counters);

  const body = parseBody(response.body);
  const resource = buildExactClassResource(contract);
  if (body?.name !== resource) return boundedResult({ targetState: "STATE_READ_UNEXPECTED_RESPONSE_ABORT", httpStatus: status }, counters);
  const parsed = parseCanonicalClass(body.fields, contract);
  if (!parsed) return boundedResult({ targetState: "PRESENT_SCHEMA_OR_STATE_REVIEW_REQUIRED", httpStatus: status, resourceMatch: true }, counters);
  const conflicts = ["classId", "displayName", "status", "schoolYear", "grade"].filter((key) => parsed[key] !== contract.expected[key]);
  return boundedResult({
    targetState: conflicts.length === 0 ? "PRESENT_EQUIVALENT" : "PRESENT_CONFLICT",
    httpStatus: status,
    resourceMatch: true,
    casState: "VALID",
    schemaVersion: parsed.schemaVersion,
    semanticComparison: conflicts.length === 0 ? "equivalent" : "conflict",
    conflicts: Object.freeze(conflicts),
  }, counters);
}

function transportErrorResult(error, counters) {
  const code = error?.code;
  return boundedResult({
    reason: code === "ETIMEDOUT" || code === "TIMEOUT" ? "timeout" : "network-error",
  }, counters);
}

export function httpsGetBounded(url, authorization, {
  timeoutMs = HTTP_TIMEOUT_MS,
  maxResponseBytes = MAX_RESPONSE_BYTES,
} = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return reject(fail("HTTPS_REQUIRED"));
    const request = https.request(parsed, {
      method: "GET",
      headers: { Authorization: authorization },
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        resolve({ statusCode: response.statusCode, redirected: true, body: "" });
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxResponseBytes) {
          request.destroy(fail("RESPONSE_TOO_LARGE"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(fail("ETIMEDOUT")));
    request.on("error", reject);
    request.end();
  });
}

export async function runExactClassStateReadOnce({
  contract = EXACT_CLASS_READ_CONTRACT,
  tokenProvider,
  httpGet = httpsGetBounded,
} = {}) {
  const counters = { tokenCalls: 0, httpCalls: 0, retries: 0, writes: 0 };
  let token = null;
  let tokenPipelineDiagnostic = null;
  try {
    validateExactClassReadContract(contract);
    if (typeof tokenProvider !== "function" || typeof httpGet !== "function") throw fail("DEPENDENCY_REQUIRED");
    counters.tokenCalls += 1;
    const provided = await tokenProvider();
    if (typeof provided === "string") token = provided;
    else if (provided?.ok === true && typeof provided.token === "string") {
      token = provided.token;
      tokenPipelineDiagnostic = provided.tokenPipelineDiagnostic || null;
    } else if (provided?.tokenPipelineDiagnostic) {
      tokenPipelineDiagnostic = provided.tokenPipelineDiagnostic;
    }
    if (!token || /\s/.test(token)) return boundedResult({ reason: "token-provider-rejected", tokenPipelineDiagnostic }, counters);
    const url = buildExactClassGetDocumentUrl(contract);
    counters.httpCalls += 1;
    const response = await httpGet(url, `Bearer ${token}`, { timeoutMs: HTTP_TIMEOUT_MS, maxResponseBytes: MAX_RESPONSE_BYTES });
    return Object.freeze({ ...classifyResponse(response, contract, counters), tokenPipelineDiagnostic });
  } catch (error) {
    if (error?.code === "CONTRACT_MISMATCH" || error?.code === "FIELD_MASK_MISMATCH" || error?.code === "DEPENDENCY_REQUIRED") {
      return boundedResult({ reason: error.code }, counters);
    }
    return transportErrorResult(error, counters);
  } finally {
    token = null;
  }
}

export const EXACT_CLASS_READ_LIMITS = Object.freeze({
  accessTokenMax: 1,
  getDocumentMax: 1,
  retryMax: 0,
  queryMax: 0,
  batchGetMax: 0,
  listDocumentsMax: 0,
  listCollectionIdsMax: 0,
  otherDocumentReadMax: 0,
  firestoreWriteMax: 0,
  maxResponseBytes: MAX_RESPONSE_BYTES,
  httpTimeoutMs: HTTP_TIMEOUT_MS,
});
