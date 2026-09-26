import { createHash } from "node:crypto";

export const M3L3_B1_SCHEMA = "myweb.m3l3.b1.g4r3r2-budget-graph-reconciliation.v1";
export const M3L3_B1_LIVE_GATE_ERROR_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_B1_GRAPH_BUDGET_ALREADY_MATCHES_LIVE_GATE_ERROR";

const HASHES = Object.freeze({
  stoppedEvidence: "adb7b77820533417390661e87d9a69ceec055f7da703bf04a5175fed8cc79ce4",
  stoppedResult: "55da01905a8c281ba388664016e1d6656d4ae39d3df36b4df13902253b271ded",
  g4r3r2Composite: "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195",
  g4r3r2Result: "f0421acdaf1f9649b7314613a381c8c82072f84d70365c2e8c51b66876d16ac7",
  g4r3r1: "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9",
  g4r3hR2: "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc",
  graph: "db970e486979b1a82b4245141236d534e2b754bd345c2dc0c913e02232d5a424",
});

const NODE_RULES = Object.freeze({
  ROLE_STAGE1: ["STAGE1_ROLE_READ", "surface.iam.roles.describe", "REMOTE", "READ", "IAM_CUSTOM_ROLE_METADATA", "PROJECT_CUSTOM_ROLE", ["remoteIamPrestateReadsMax"]],
  ROLE_CANONICAL: ["CANONICAL_ROLE_READ", "surface.iam.roles.describe", "REMOTE", "READ", "IAM_CUSTOM_ROLE_METADATA", "PROJECT_CUSTOM_ROLE", ["remoteIamPrestateReadsMax"]],
  OP_A: ["ACTIVE_CALLER_DISCOVERY", "surface.auth.list", "LOCAL", "READ", "LOCAL_GCLOUD_AUTH_STATE", "TRANSIENT_SESSION", ["localIdentityDiscoveryMax"]],
  OP_B: ["WRITER_SERVICE_ACCOUNT_METADATA_READ", "surface.iam.service_accounts.describe", "REMOTE", "READ", "SERVICE_ACCOUNT_METADATA", "EXACT_WRITER_SERVICE_ACCOUNT", ["remoteIamPrestateReadsMax"]],
  OP_C_PRE: ["WRITER_SERVICE_ACCOUNT_IAM_POLICY_PRECHECK", "surface.iam.service_accounts.get_iam_policy", "REMOTE", "READ", "SERVICE_ACCOUNT_IAM_POLICY", "EXACT_WRITER_SERVICE_ACCOUNT", ["remoteIamPrestateReadsMax"]],
  OP_D_PRE: ["PROJECT_IAM_POLICY_PRECHECK", "surface.projects.get_iam_policy", "REMOTE", "READ", "PROJECT_IAM_POLICY", "EXACT_PROJECT", ["remoteIamPrestateReadsMax", "projectIamReadsMax"]],
  OP_E: ["EXACT_WRITER_SERVICE_ACCOUNT_TOKEN_CREATOR_MUTATION", "surface.iam.service_accounts.add_iam_policy_binding", "REMOTE", "MUTATION", "SERVICE_ACCOUNT_IAM_POLICY_BINDING", "EXACT_WRITER_SERVICE_ACCOUNT", ["iamMutationAttemptsMax"]],
  OP_C_POST: ["WRITER_SERVICE_ACCOUNT_IAM_POLICY_POSTCHECK", "surface.iam.service_accounts.get_iam_policy", "REMOTE", "READ", "SERVICE_ACCOUNT_IAM_POLICY", "EXACT_WRITER_SERVICE_ACCOUNT", ["remoteIamPoststateReadsMax"]],
  OP_D_POST: ["PROJECT_IAM_POLICY_POSTCHECK", "surface.projects.get_iam_policy", "REMOTE", "READ", "PROJECT_IAM_POLICY", "EXACT_PROJECT", ["remoteIamPoststateReadsMax", "projectIamReadsMax"]],
});

const BUDGET_KEYS = Object.freeze([
  "accessTokenCallsMax", "cloudLoggingReadsMax", "firestoreCallsMax", "iamMutationAttemptsMax",
  "localIdentityDiscoveryMax", "m4MutationsMax", "projectIamReadsMax", "remoteIamPoststateReadsMax",
  "remoteIamPrestateReadsMax", "retriesMax", "serviceAccountKeyOperationsMax", "testIamPermissionsMax",
]);

const ROOT_KEYS = Object.freeze([
  "branchProjectIamReads", "budgetMismatch", "correctedBudget", "g4r3hR2Attestation",
  "g4r3r1Attestation", "g4r3r2BoundBudget", "g4r3r2CompositeSha256", "g4r3r2ResultSha256",
  "graphIdentity", "graphRequiredBudget", "m3l3StoppedEvidenceSha256", "m3l3StoppedResultSha256",
  "nodeOperationClassification", "oldApprovalStatus", "privacy", "schema", "verdict", "verifierGap",
]);

const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|configRootValue|absolutePath|rawArgv|rawEnvironment|rawPolicy|rawOutput|stdout|stderr|etag|conditionExpression)$/i;
const SENSITIVE_SCALAR = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z]:[\\/](?:Users|Documents)[\\/]|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function noSensitiveMaterial(value) {
  if (Array.isArray(value)) return value.every(noSensitiveMaterial);
  if (typeof value === "string") return !SENSITIVE_SCALAR.test(value);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noSensitiveMaterial(child));
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function classifyNodes(graph) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length !== 9) throw new Error("invalid-m3-graph");
  return graph.nodes.map((node) => {
    const rule = NODE_RULES[node.id];
    if (!rule) throw new Error(`unknown-node:${node.id}`);
    const [semanticOperation, commandSurface, location, operationType, resourceType, resourceScope, budgetBuckets] = rule;
    if (node.semanticOperation !== semanticOperation || node.commandSurface !== commandSurface
      || node.maxCalls !== 1 || node.retryMax !== 0 || node.mutatesState !== (operationType === "MUTATION")) {
      throw new Error(`node-contract-drift:${node.id}`);
    }
    return {
      nodeId: node.id,
      location,
      operationType,
      resourceType,
      resourceScope,
      conditional: node.predecessorConditions.length > 0,
      executionCondition: node.predecessorConditions.length === 0 ? ["SESSION_ENTRY"] : [...node.predecessorConditions],
      maxExecutionsPerSession: node.maxCalls,
      retryMax: node.retryMax,
      budgetBuckets: [...budgetBuckets],
    };
  });
}

function deriveGraphBudget(classification) {
  const budget = Object.fromEntries(BUDGET_KEYS.map((key) => [key, 0]));
  for (const node of classification) {
    for (const bucket of node.budgetBuckets) budget[bucket] += node.maxExecutionsPerSession;
  }
  return budget;
}

function deriveBoundBudget(g4r3r2) {
  const live = g4r3r2?.futureLiveBudget;
  if (!plain(live) || !plain(g4r3r2?.forbiddenReachability)) throw new Error("invalid-g4r3r2-budget-source");
  return {
    accessTokenCallsMax: live.accessTokenCallsMax,
    cloudLoggingReadsMax: live.cloudLoggingReadsMax,
    firestoreCallsMax: live.firestoreCallsMax,
    iamMutationAttemptsMax: live.iamMutationAttemptsMax,
    localIdentityDiscoveryMax: live.localIdentityDiscoveryMax,
    m4MutationsMax: live.m4MutationsMax,
    projectIamReadsMax: live.projectIamReadsMax,
    remoteIamPoststateReadsMax: live.remoteIamPoststateReadsMax,
    remoteIamPrestateReadsMax: live.remoteIamPrestateReadsMax,
    retriesMax: live.retriesMax,
    serviceAccountKeyOperationsMax: g4r3r2.forbiddenReachability.serviceAccountKeyAccess === false ? 0 : null,
    testIamPermissionsMax: live.testIamPermissionsMax,
  };
}

function exactObject(value, expected) {
  return JSON.stringify(sortValue(value)) === JSON.stringify(sortValue(expected));
}

export function buildM3L3B1Payload({ graph, g4r3r2 }) {
  const nodeOperationClassification = classifyNodes(graph);
  const graphRequiredBudget = deriveGraphBudget(nodeOperationClassification);
  const g4r3r2BoundBudget = deriveBoundBudget(g4r3r2);
  const mismatchFields = BUDGET_KEYS.filter((key) => graphRequiredBudget[key] !== g4r3r2BoundBudget[key]);
  if (graphRequiredBudget.projectIamReadsMax !== 2 || g4r3r2BoundBudget.projectIamReadsMax !== 2) {
    throw new Error("project-iam-budget-not-reconciled");
  }
  return {
    schema: M3L3_B1_SCHEMA,
    m3l3StoppedEvidenceSha256: HASHES.stoppedEvidence,
    m3l3StoppedResultSha256: HASHES.stoppedResult,
    g4r3r2CompositeSha256: HASHES.g4r3r2Composite,
    g4r3r2ResultSha256: HASHES.g4r3r2Result,
    g4r3r1Attestation: HASHES.g4r3r1,
    g4r3hR2Attestation: HASHES.g4r3hR2,
    graphIdentity: HASHES.graph,
    nodeOperationClassification,
    graphRequiredBudget,
    g4r3r2BoundBudget,
    budgetMismatch: {
      relation: mismatchFields.length === 0 ? "MATCH" : "UNRESOLVED",
      mismatchFields,
      stoppedLiveApprovalProjectIamReadsMax: 0,
      defectScope: mismatchFields.length === 0 ? "LIVE_APPROVAL_BUDGET_NOT_COMPOSITE" : "UNRESOLVED",
    },
    branchProjectIamReads: {
      prestatePresentMax: 0,
      mutationSuccessMax: 2,
      mutationIndeterminateMax: 1,
      postNodeCondition: "OP_E_CONFIRMED_SUCCESS_AND_OP_C_POST_PRESENT_EXACT",
    },
    verifierGap: {
      classification: "NO_GRAPH_BUDGET_CROSS_CHECK",
      currentImpact: "DESIGN_GAP_WITHOUT_CURRENT_VALUE_MISMATCH",
      literalProjectIamReadsMaxCheck: 2,
    },
    correctedBudget: {
      projectIamReadsMax: 2,
      correctionTarget: "FUTURE_LIVE_APPROVAL_ONLY",
      supersedingCompositeRequired: false,
      allowedProjectIamReadNodes: ["OP_D_PRE", "OP_D_POST"],
    },
    oldApprovalStatus: {
      consumed: false,
      reusable: false,
      reason: "SUPERSEDED_BY_BUDGET_AUTHORITY_CORRECTION_REQUIRED",
    },
    privacy: {
      rawIdentityPersisted: false,
      rawIamPolicyPersisted: false,
      rawProcessOutputPersisted: false,
      credentialPersisted: false,
      tokenPersisted: false,
      timestampPersisted: false,
    },
    verdict: M3L3_B1_LIVE_GATE_ERROR_VERDICT,
  };
}

function valid(payload) {
  if (!plain(payload) || Object.keys(payload).length !== ROOT_KEYS.length
    || !ROOT_KEYS.every((key) => Object.hasOwn(payload, key)) || !noSensitiveMaterial(payload)) return false;
  if (payload.schema !== M3L3_B1_SCHEMA || payload.verdict !== M3L3_B1_LIVE_GATE_ERROR_VERDICT) return false;
  if (payload.m3l3StoppedEvidenceSha256 !== HASHES.stoppedEvidence
    || payload.m3l3StoppedResultSha256 !== HASHES.stoppedResult
    || payload.g4r3r2CompositeSha256 !== HASHES.g4r3r2Composite
    || payload.g4r3r2ResultSha256 !== HASHES.g4r3r2Result
    || payload.g4r3r1Attestation !== HASHES.g4r3r1
    || payload.g4r3hR2Attestation !== HASHES.g4r3hR2
    || payload.graphIdentity !== HASHES.graph) return false;
  return true;
}

export function parseM3L3B1(text) {
  if (typeof text !== "string") return null;
  try { const value = JSON.parse(text); return valid(value) ? value : null; } catch { return null; }
}

export function canonicalizeM3L3B1(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-b1-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3B1Sha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3B1(payload), "utf8").digest("hex");
}

export function verifyM3L3B1(payload, { graph, g4r3r2 }) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_B1_EVIDENCE" });
  let expected;
  try { expected = buildM3L3B1Payload({ graph, g4r3r2 }); } catch { return Object.freeze({ ok: false, code: "B1_SOURCE_OR_GRAPH_DRIFT" }); }
  if (!exactObject(payload, expected)) return Object.freeze({ ok: false, code: "B1_RECONCILIATION_MISMATCH" });
  return Object.freeze({ ok: true, code: "GRAPH_BUDGET_MATCH_LIVE_GATE_ERROR", sha256: computeM3L3B1Sha256(payload) });
}

export const M3L3_B1_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  runtimeMutation: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
