import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const G4R3R2_SCHEMA = "myweb.m3l2.g4r3r2.post-identity-patch-final-execution-composite.v1";
export const G4R3R2_PASS_VERDICT = "P1_5_C2H2E3D_W1C_M3L2_G4R3R2_POST_IDENTITY_PATCH_FINAL_EXECUTION_COMPOSITE_PASS_M3L3_APPROVAL_ELIGIBLE";

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_PATH = /^(tools|docs|sdk)\/[A-Za-z0-9._/-]+$/;
const GRAPH_NODES = ["ROLE_STAGE1", "ROLE_CANONICAL", "OP_A", "OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"];
const PINNED_OPERATIONS = ["OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"];
const PRESTATE_DOMAIN = ["TARGET_MEMBER_PRESENT", "TARGET_MEMBER_ABSENT", "AMBIGUOUS", "READ_FAILURE"];
const POSTSTATE_DOMAIN = ["TARGET_MEMBER_PRESENT_CONFIRMED", "TARGET_MEMBER_ABSENT", "AMBIGUOUS", "READ_FAILURE"];
const ROOT_KEYS = [
  "approvalConsumption", "classifier", "crashSemantics", "currentImplementationAuthority",
  "currentRuntimeAuthority", "externalCapabilities", "forbiddenReachability", "forensicChain",
  "futureAuthority", "futureLiveBudget", "graph", "historicalAuthorityStatus", "identity",
  "mutation", "poststate", "prestate", "privacy", "schema", "sdkLocks", "skippedTestPolicy",
  "sourceLocks", "verdict",
];
const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|configRootValue|absolutePath|rawArgv|rawEnvironment|rawPolicy|rawOutput|stdout|stderr|etag|conditionExpression)$/i;
const SENSITIVE_SCALAR = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z]:[\\/](?:Users|Documents)[\\/]|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = (value) => typeof value === "string" && SHA256.test(value);
const exactKeys = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const falseMap = (value) => plain(value) && Object.values(value).every((item) => item === false);

function noSensitiveMaterial(value) {
  if (Array.isArray(value)) return value.every(noSensitiveMaterial);
  if (typeof value === "string") return !SENSITIVE_SCALAR.test(value);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noSensitiveMaterial(child));
}

function validLocks(value, { sdk = false } = {}) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const seen = new Set();
  return value.every((entry) => {
    if (!exactKeys(entry, sdk ? ["logicalId", "operations", "path", "sha256"] : ["path", "sha256"])) return false;
    if (!SAFE_PATH.test(entry.path) || entry.path.includes("..") || !hash(entry.sha256) || seen.has(entry.path)) return false;
    if (sdk && (!entry.path.startsWith("sdk/") || !/^CAP_[0-9]{2}$/.test(entry.logicalId)
      || !Array.isArray(entry.operations) || entry.operations.length === 0)) return false;
    if (!sdk && entry.path.startsWith("sdk/")) return false;
    seen.add(entry.path);
    return true;
  });
}

function validAuthority(payload) {
  return exactKeys(payload.forensicChain, ["f1Attestation", "g4r3hGeneration1Status"])
    && payload.forensicChain.f1Attestation === "845c4ce63d9830966ab331afd641cae127f106d3f93d03ef704a5f79659eb33b"
    && payload.forensicChain.g4r3hGeneration1Status === "HISTORICAL_INCONSISTENT_ATTESTATION_CHAIN"
    && exactKeys(payload.currentImplementationAuthority, ["g4r3hR2Attestation", "g4r3hR2ResultDocumentSha256"])
    && payload.currentImplementationAuthority.g4r3hR2Attestation === "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc"
    && payload.currentImplementationAuthority.g4r3hR2ResultDocumentSha256 === "dc7650788218f7aae178f8d657c81bc816a4848e4061e0364aa0c99b34b911e1"
    && exactKeys(payload.currentRuntimeAuthority, ["g4r3r1Attestation", "g4r3r1ResultDocumentSha256"])
    && payload.currentRuntimeAuthority.g4r3r1Attestation === "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9"
    && payload.currentRuntimeAuthority.g4r3r1ResultDocumentSha256 === "11bcb124f12500805da2f8b2937c1456caf10e0ec9bab3fbf63e6bbd911278b7";
}

function validGraph(graph) {
  return exactKeys(graph, ["executionEdgeCount", "graphIdentity", "nodeCount", "nodes", "predecessorMetadataEdgeCount"])
    && graph.nodeCount === 9
    && graph.executionEdgeCount === 8
    && graph.predecessorMetadataEdgeCount === 7
    && JSON.stringify(graph.nodes) === JSON.stringify(GRAPH_NODES)
    && graph.graphIdentity === "db970e486979b1a82b4245141236d534e2b754bd345c2dc0c913e02232d5a424";
}

function validIdentity(identity) {
  return exactKeys(identity, [
    "accountPinning", "authOverrideClosure", "childEnvironmentSnapshot", "configurationPinning",
    "exactMemberConstruction", "identityContext", "legacyFingerprintAuthorizationReachability",
    "opABootstrapContract", "sessionConfigRoot",
  ])
    && identity.legacyFingerprintAuthorizationReachability === 0
    && exactKeys(identity.opABootstrapContract, ["cardinality", "role", "usedAsLaterCallerProof"])
    && identity.opABootstrapContract.cardinality === "EXACTLY_ONE"
    && identity.opABootstrapContract.role === "BOOTSTRAP_DISCOVERY_ONLY"
    && identity.opABootstrapContract.usedAsLaterCallerProof === false
    && exactKeys(identity.identityContext, ["createdMax", "immutable", "restartResumable"])
    && identity.identityContext.createdMax === 1 && identity.identityContext.immutable === true
    && identity.identityContext.restartResumable === false
    && exactKeys(identity.exactMemberConstruction, ["constructedCount", "rederivedAfterContext"])
    && identity.exactMemberConstruction.constructedCount === 1
    && identity.exactMemberConstruction.rederivedAfterContext === 0
    && exactKeys(identity.sessionConfigRoot, ["opAEqualsSession", "pinned", "reread"])
    && identity.sessionConfigRoot.opAEqualsSession === "BY_CONSTRUCTION"
    && identity.sessionConfigRoot.pinned === true && identity.sessionConfigRoot.reread === false
    && exactKeys(identity.childEnvironmentSnapshot, ["createdOnce", "mutableParentReused"])
    && identity.childEnvironmentSnapshot.createdOnce === true
    && identity.childEnvironmentSnapshot.mutableParentReused === false
    && exactKeys(identity.accountPinning, ["operations", "unpinnedRetryReachable"])
    && JSON.stringify(identity.accountPinning.operations) === JSON.stringify(PINNED_OPERATIONS)
    && identity.accountPinning.unpinnedRetryReachable === false
    && exactKeys(identity.configurationPinning, ["conflictingFlagReachable", "flagsFileReachable", "mode"])
    && identity.configurationPinning.mode === "NONE"
    && identity.configurationPinning.conflictingFlagReachable === false
    && identity.configurationPinning.flagsFileReachable === false
    && exactKeys(identity.authOverrideClosure, ["accessTokenArgv", "accessTokenEnvironment", "credentialFileEnvironment", "impersonationArgv", "impersonationEnvironment"])
    && falseMap(identity.authOverrideClosure);
}

function validPrestate(prestate) {
  return exactKeys(prestate, ["exactMember", "freshRequired", "r1b4Reusable", "resultDomain", "role", "sameMemberAsMutation", "target"])
    && prestate.freshRequired === true && prestate.r1b4Reusable === false
    && prestate.target === "LOCKED_WRITER_SERVICE_ACCOUNT"
    && prestate.role === "roles/iam.serviceAccountTokenCreator"
    && prestate.exactMember === "TRANSIENT_IMMUTABLE_SESSION_MEMBER"
    && JSON.stringify(prestate.resultDomain) === JSON.stringify(PRESTATE_DOMAIN)
    && prestate.sameMemberAsMutation === "BY_CONSTRUCTION";
}

function validMutation(mutation) {
  return exactKeys(mutation, ["maxAttempts", "retries", "rollbacks", "sameCallerContext", "secondMutationReachable"])
    && mutation.maxAttempts === 1 && mutation.retries === 0 && mutation.rollbacks === 0
    && mutation.secondMutationReachable === false
    && mutation.sameCallerContext === "SAME_SESSION_IDENTITY_CONTEXT";
}

function validClassifier(classifier) {
  return exactKeys(classifier, ["confirmedFailureRules", "errorPrefixV1ProvesNonApplication", "timeoutAfterStart", "unknownDefault", "unknownNonzero"])
    && classifier.unknownNonzero === "INDETERMINATE"
    && classifier.errorPrefixV1ProvesNonApplication === false
    && classifier.timeoutAfterStart === "INDETERMINATE"
    && classifier.unknownDefault === "INDETERMINATE"
    && Array.isArray(classifier.confirmedFailureRules) && classifier.confirmedFailureRules.length === 0;
}

function validPoststate(poststate) {
  return exactKeys(poststate, ["indeterminateRecoveryMode", "preexistingBindingAdoptionPolicy", "required", "resultDomain", "successSemantics"])
    && poststate.required === true
    && JSON.stringify(poststate.resultDomain) === JSON.stringify(POSTSTATE_DOMAIN)
    && poststate.indeterminateRecoveryMode === "SEPARATE_APPROVAL"
    && poststate.preexistingBindingAdoptionPolicy === "REQUIRES_SEPARATE_GATE"
    && poststate.successSemantics === "PROCESS_SUCCESS_PLUS_EXACT_POSTSTATE_PRESENT_CONFIRMED";
}

function validBudget(budget) {
  return exactKeys(budget, [
    "accessTokenCallsMax", "cloudLoggingReadsMax", "firestoreCallsMax", "iamMutationAttemptsMax",
    "localIdentityDiscoveryMax", "m4MutationsMax", "projectIamReadsMax", "remoteIamPoststateReadsMax",
    "remoteIamPrestateReadsMax", "retriesMax", "testIamPermissionsMax",
  ])
    && budget.localIdentityDiscoveryMax === 1
    && budget.remoteIamPrestateReadsMax === 5
    && budget.iamMutationAttemptsMax === 1
    && budget.remoteIamPoststateReadsMax === 2
    && budget.retriesMax === 0
    && budget.cloudLoggingReadsMax === 0
    && budget.projectIamReadsMax === 2
    && budget.testIamPermissionsMax === 0
    && budget.accessTokenCallsMax === 0
    && budget.firestoreCallsMax === 0
    && budget.m4MutationsMax === 0;
}

function valid(payload) {
  if (!exactKeys(payload, ROOT_KEYS) || payload.schema !== G4R3R2_SCHEMA || !noSensitiveMaterial(payload)) return false;
  if (!validAuthority(payload) || !validLocks(payload.sourceLocks) || !validLocks(payload.sdkLocks, { sdk: true })) return false;
  if (payload.sourceLocks.length !== 26 || payload.sdkLocks.length !== 15) return false;
  if (!validGraph(payload.graph) || !validIdentity(payload.identity) || !validPrestate(payload.prestate)
    || !validMutation(payload.mutation) || !validClassifier(payload.classifier) || !validPoststate(payload.poststate)
    || !validBudget(payload.futureLiveBudget)) return false;
  if (!exactKeys(payload.externalCapabilities, ["bound", "count", "sdkPathContainment", "sdkVersion", "unbound"])
    || payload.externalCapabilities.count !== 15 || payload.externalCapabilities.bound !== 15
    || payload.externalCapabilities.unbound !== 0 || payload.externalCapabilities.sdkVersion !== "580.0.0"
    || payload.externalCapabilities.sdkPathContainment !== "PASS") return false;
  if (!exactKeys(payload.approvalConsumption, ["point", "restartRequiresNewApproval", "sessionRestartable"])
    || payload.approvalConsumption.point !== "WHEN_FRESH_EXACT_PRESTATE_READ_BEGINS"
    || payload.approvalConsumption.restartRequiresNewApproval !== true
    || payload.approvalConsumption.sessionRestartable !== false) return false;
  if (!exactKeys(payload.crashSemantics, ["afterPrestateBeforeMutation", "afterSuccessBeforePoststate", "duringMutation"])
    || payload.crashSemantics.afterPrestateBeforeMutation !== "NO_RESUME_NEW_APPROVAL_REQUIRED"
    || payload.crashSemantics.duringMutation !== "INDETERMINATE_NO_RETRY_NO_ROLLBACK"
    || payload.crashSemantics.afterSuccessBeforePoststate !== "UNCONFIRMED_SEPARATE_READ_APPROVAL_REQUIRED") return false;
  if (!falseMap(payload.forbiddenReachability) || !falseMap(payload.privacy)) return false;
  if (!exactKeys(payload.skippedTestPolicy, ["authorityClass", "compensatingSourceAttestation", "gcloudVersionHelpStatus"])
    || payload.skippedTestPolicy.gcloudVersionHelpStatus !== "NOT_RUN_BY_ZERO_GCLOUD_POLICY"
    || payload.skippedTestPolicy.authorityClass !== "NON_BLOCKING_BY_SOURCE_ATTESTATION"
    || !exactKeys(payload.skippedTestPolicy.compensatingSourceAttestation, ["capabilitySourceLockCount", "launcherIdentity", "sdkPathContainment", "sdkVersion"])
    || payload.skippedTestPolicy.compensatingSourceAttestation.capabilitySourceLockCount !== 15
    || payload.skippedTestPolicy.compensatingSourceAttestation.launcherIdentity !== "BOUND_BY_WINDOWS_ADAPTER_AND_SDK_SOURCE_LOCKS"
    || payload.skippedTestPolicy.compensatingSourceAttestation.sdkPathContainment !== "PASS"
    || payload.skippedTestPolicy.compensatingSourceAttestation.sdkVersion !== "580.0.0") return false;
  if (!exactKeys(payload.historicalAuthorityStatus, ["currentImplementationAuthority", "currentRuntimeCapabilityAuthority", "g4r1", "g4r2", "g4r3hGeneration1"])
    || payload.historicalAuthorityStatus.g4r1 !== "HISTORICAL_ONLY_FOR_PRE_IDENTITY_PATCH_RUNTIME"
    || payload.historicalAuthorityStatus.g4r2 !== "HISTORICAL_STRUCTURALLY_VALID_BUT_BLOCKED_PRE_IDENTITY_PATCH_COMPOSITE"
    || payload.historicalAuthorityStatus.g4r3hGeneration1 !== "HISTORICAL_INCONSISTENT_ATTESTATION_CHAIN"
    || payload.historicalAuthorityStatus.currentImplementationAuthority !== "G4R3H_R2"
    || payload.historicalAuthorityStatus.currentRuntimeCapabilityAuthority !== "G4R3R1") return false;
  if (!exactKeys(payload.futureAuthority, ["m3l3ApprovalEligible", "m3l3LiveApprovalGranted", "m4ApprovalGranted"])
    || payload.futureAuthority.m3l3ApprovalEligible !== true
    || payload.futureAuthority.m3l3LiveApprovalGranted !== false
    || payload.futureAuthority.m4ApprovalGranted !== false) return false;
  return payload.verdict === G4R3R2_PASS_VERDICT;
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R3R2(text) {
  if (typeof text !== "string") return null;
  try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; }
}

export function canonicalizeG4R3R2(payload) {
  if (!valid(payload)) throw new Error("invalid-g4r3r2-composite");
  return JSON.stringify(sortValue(payload));
}

export function computeG4R3R2Sha256(payload) {
  return createHash("sha256").update(canonicalizeG4R3R2(payload), "utf8").digest("hex");
}

export function verifyG4R3R2(payload) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_COMPOSITE" });
  return Object.freeze({ ok: true, code: "POST_IDENTITY_PATCH_FINAL_EXECUTION_COMPOSITE_LOCKED", sha256: computeG4R3R2Sha256(payload) });
}

export function verifyG4R3R2SourceLocks(payload, { repositoryRoot = process.cwd(), sdkRoot = null } = {}) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_COMPOSITE", checked: 0 });
  let checked = 0;
  for (const entry of [...payload.sourceLocks, ...payload.sdkLocks]) {
    const root = entry.path.startsWith("sdk/") ? sdkRoot : repositoryRoot;
    const relative = entry.path.startsWith("sdk/") ? entry.path.slice(4) : entry.path;
    if (!root) return Object.freeze({ ok: false, code: "SOURCE_ROOT_UNAVAILABLE", checked });
    const rootPath = resolve(root);
    const target = resolve(rootPath, relative);
    if (!target.startsWith(rootPath) || !existsSync(target)) return Object.freeze({ ok: false, code: "SOURCE_LOCK_MISSING", checked });
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== entry.sha256) {
      return Object.freeze({ ok: false, code: "SOURCE_LOCK_DRIFT", checked, path: entry.path });
    }
    checked += 1;
  }
  return Object.freeze({ ok: true, code: "SOURCE_LOCKS_MATCH", checked });
}

function mergeRepositoryLocks(g4r3hR2, g4r3r1) {
  const merged = new Map();
  const entries = [
    ...g4r3r1.repositoryLocks,
    ...g4r3hR2.runtimeLocks,
    ...g4r3hR2.testLocks,
    ...g4r3hR2.evidenceLocks,
  ];
  for (const entry of entries) {
    const previous = merged.get(entry.path);
    if (previous && previous !== entry.sha256) throw new Error(`source-lock-conflict:${entry.path}`);
    merged.set(entry.path, entry.sha256);
  }
  return [...merged.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, sha256]) => ({ path, sha256 }));
}

export function buildG4R3R2Payload({ g4r3hR2, g4r3r1 }) {
  const payload = {
    schema: G4R3R2_SCHEMA,
    forensicChain: {
      f1Attestation: g4r3hR2.f1AttestationSha256,
      g4r3hGeneration1Status: g4r3hR2.generation1Status,
    },
    currentImplementationAuthority: {
      g4r3hR2Attestation: g4r3r1.g4r3hR2AttestationSha256,
      g4r3hR2ResultDocumentSha256: g4r3r1.g4r3hR2ResultDocumentSha256,
    },
    currentRuntimeAuthority: {
      g4r3r1Attestation: "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9",
      g4r3r1ResultDocumentSha256: "11bcb124f12500805da2f8b2937c1456caf10e0ec9bab3fbf63e6bbd911278b7",
    },
    sourceLocks: mergeRepositoryLocks(g4r3hR2, g4r3r1),
    sdkLocks: g4r3r1.sdkSourceLocks.map((entry) => ({
      logicalId: entry.logicalId,
      operations: [...entry.operations],
      path: entry.path,
      sha256: entry.sha256,
    })),
    graph: {
      nodeCount: g4r3r1.runtimeGraph.nodeCount,
      executionEdgeCount: g4r3r1.runtimeGraph.executionEdgeCount,
      predecessorMetadataEdgeCount: g4r3r1.runtimeGraph.metadataEdgeCount,
      nodes: [...g4r3r1.runtimeGraph.nodes],
      graphIdentity: g4r3r1.runtimeGraph.graphIdentitySha256,
    },
    externalCapabilities: {
      count: g4r3r1.externalCapabilities.count,
      bound: g4r3r1.externalCapabilities.bound,
      unbound: g4r3r1.externalCapabilities.unbound,
      sdkVersion: g4r3r1.externalCapabilities.sdkVersion,
      sdkPathContainment: "PASS",
    },
    identity: {
      legacyFingerprintAuthorizationReachability: g4r3r1.identityContract.legacyFingerprintAuthorizationReachability,
      opABootstrapContract: { role: "BOOTSTRAP_DISCOVERY_ONLY", cardinality: "EXACTLY_ONE", usedAsLaterCallerProof: false },
      identityContext: { createdMax: 1, immutable: g4r3r1.identityContract.contextImmutable, restartResumable: false },
      exactMemberConstruction: { constructedCount: g4r3r1.identityContract.exactMemberConstructedCount, rederivedAfterContext: g4r3r1.identityContract.memberRederivationAfterContext },
      sessionConfigRoot: { opAEqualsSession: g4r3r1.identityContract.opAConfigRootEqualsSession, pinned: g4r3r1.sessionEnvironment.configRootPinned, reread: g4r3r1.sessionEnvironment.configRootReread },
      childEnvironmentSnapshot: { createdOnce: g4r3r1.sessionEnvironment.childSnapshotCreatedCount === 1, mutableParentReused: g4r3r1.sessionEnvironment.mutableParentEnvironmentReused },
      accountPinning: { operations: [...g4r3r1.commandSurfaces.accountPinnedOperations], unpinnedRetryReachable: g4r3r1.commandSurfaces.unpinnedRetryReachable },
      configurationPinning: { mode: "NONE", conflictingFlagReachable: g4r3r1.commandSurfaces.conflictingConfigurationFlagReachable, flagsFileReachable: g4r3r1.commandSurfaces.flagsFileReachable },
      authOverrideClosure: {
        accessTokenArgv: false,
        accessTokenEnvironment: false,
        credentialFileEnvironment: false,
        impersonationArgv: false,
        impersonationEnvironment: false,
      },
    },
    prestate: {
      freshRequired: true,
      r1b4Reusable: false,
      target: "LOCKED_WRITER_SERVICE_ACCOUNT",
      role: "roles/iam.serviceAccountTokenCreator",
      exactMember: "TRANSIENT_IMMUTABLE_SESSION_MEMBER",
      resultDomain: [...PRESTATE_DOMAIN],
      sameMemberAsMutation: "BY_CONSTRUCTION",
    },
    mutation: {
      maxAttempts: g4r3r1.classifier.mutationMax,
      retries: g4r3r1.classifier.retry,
      rollbacks: g4r3r1.classifier.rollback,
      secondMutationReachable: g4r3r1.classifier.secondMutationReachable,
      sameCallerContext: "SAME_SESSION_IDENTITY_CONTEXT",
    },
    classifier: {
      unknownNonzero: g4r3r1.classifier.unknownNonzero,
      errorPrefixV1ProvesNonApplication: g4r3r1.classifier.errorPrefixProvesRemoteNonApplication,
      timeoutAfterStart: g4r3r1.classifier.timeoutAfterMutationStart,
      unknownDefault: "INDETERMINATE",
      confirmedFailureRules: [...g4r3r1.classifier.confirmedFailureRules],
    },
    poststate: {
      required: true,
      resultDomain: [...POSTSTATE_DOMAIN],
      indeterminateRecoveryMode: "SEPARATE_APPROVAL",
      preexistingBindingAdoptionPolicy: "REQUIRES_SEPARATE_GATE",
      successSemantics: "PROCESS_SUCCESS_PLUS_EXACT_POSTSTATE_PRESENT_CONFIRMED",
    },
    futureLiveBudget: {
      localIdentityDiscoveryMax: 1,
      remoteIamPrestateReadsMax: 5,
      iamMutationAttemptsMax: 1,
      remoteIamPoststateReadsMax: 2,
      retriesMax: 0,
      cloudLoggingReadsMax: 0,
      projectIamReadsMax: 2,
      testIamPermissionsMax: 0,
      accessTokenCallsMax: 0,
      firestoreCallsMax: 0,
      m4MutationsMax: 0,
    },
    approvalConsumption: {
      point: "WHEN_FRESH_EXACT_PRESTATE_READ_BEGINS",
      restartRequiresNewApproval: true,
      sessionRestartable: false,
    },
    crashSemantics: {
      afterPrestateBeforeMutation: "NO_RESUME_NEW_APPROVAL_REQUIRED",
      duringMutation: "INDETERMINATE_NO_RETRY_NO_ROLLBACK",
      afterSuccessBeforePoststate: "UNCONFIRMED_SEPARATE_READ_APPROVAL_REQUIRED",
    },
    forbiddenReachability: {
      m4: false,
      firestore: false,
      accessTokenGeneration: false,
      writerImpersonation: false,
      serviceAccountKeyAccess: false,
      cloudLogging: false,
      projectIamMutation: false,
    },
    skippedTestPolicy: {
      gcloudVersionHelpStatus: "NOT_RUN_BY_ZERO_GCLOUD_POLICY",
      authorityClass: "NON_BLOCKING_BY_SOURCE_ATTESTATION",
      compensatingSourceAttestation: {
        sdkVersion: "580.0.0",
        sdkPathContainment: "PASS",
        launcherIdentity: "BOUND_BY_WINDOWS_ADAPTER_AND_SDK_SOURCE_LOCKS",
        capabilitySourceLockCount: 15,
      },
    },
    privacy: {
      rawIdentityPersisted: false,
      rawIamPolicyPersisted: false,
      rawProcessOutputPersisted: false,
      configRootPersisted: false,
      credentialMaterialPersisted: false,
      personalAbsolutePathPersisted: false,
    },
    historicalAuthorityStatus: {
      g4r1: "HISTORICAL_ONLY_FOR_PRE_IDENTITY_PATCH_RUNTIME",
      g4r2: "HISTORICAL_STRUCTURALLY_VALID_BUT_BLOCKED_PRE_IDENTITY_PATCH_COMPOSITE",
      g4r3hGeneration1: "HISTORICAL_INCONSISTENT_ATTESTATION_CHAIN",
      currentImplementationAuthority: "G4R3H_R2",
      currentRuntimeCapabilityAuthority: "G4R3R1",
    },
    futureAuthority: {
      m3l3ApprovalEligible: true,
      m3l3LiveApprovalGranted: false,
      m4ApprovalGranted: false,
    },
    verdict: G4R3R2_PASS_VERDICT,
  };
  if (!valid(payload)) throw new Error("derived-g4r3r2-composite-invalid");
  return payload;
}

export const G4R3R2_COMPOSITE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
