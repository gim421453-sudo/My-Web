import {
  AUTH_OVERRIDE_ENV_SURFACES,
  createSanitizedChildEnvironment,
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "./windowsGcloudProcessAdapter.mjs";
import { analyzeStderrLines, classifySafeStderr } from "./gcloudStderrDiagnosticAnalyzer.mjs";
import { projectCanonicalWriterPolicyResult } from "./m3l3R3CanonicalPolicyParser.mjs";

export const DEFAULT_LIVE_EXECUTION_ENABLED = false;
export const M3_MUTATION_MAX = 1;
export const M3_RETRY_MAX = 0;
export const M3_ALLOWED_PRINCIPAL_KIND = Object.freeze(["user", "serviceAccount"]);

const PROJECT_ID = "my-management-app-8a933";
const WRITER_SERVICE_ACCOUNT = "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com";
const TOKEN_CREATOR_ROLE = "roles/iam.serviceAccountTokenCreator";
const G2B_WRITER_SERVICE_ACCOUNT = "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com";
const STAGE1_ROLE_ID = "mywebStage1CollectionIdReader";
const CANONICAL_ROLE_ID = "mywebCanonicalStateReader";
const STAGE1_ROLE_RESOURCE = `projects/${PROJECT_ID}/roles/${STAGE1_ROLE_ID}`;
const CANONICAL_ROLE_RESOURCE = `projects/${PROJECT_ID}/roles/${CANONICAL_ROLE_ID}`;
const CLASS_CREATE_ROLE_RESOURCE = `projects/${PROJECT_ID}/roles/mywebClassMigrationCreateOnly`;
const FIREBASE_ADMIN_SERVICE_ACCOUNT = "firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com";

const ROLE_READ_SURFACE = "surface.iam.roles.describe";
const AUTH_LIST_SURFACE = "surface.auth.list";
const SERVICE_ACCOUNT_DESCRIBE_SURFACE = "surface.iam.service_accounts.describe";
const SERVICE_ACCOUNT_POLICY_SURFACE = "surface.iam.service_accounts.get_iam_policy";
const PROJECT_POLICY_SURFACE = "surface.projects.get_iam_policy";
const SERVICE_ACCOUNT_BINDING_SURFACE = "surface.iam.service_accounts.add_iam_policy_binding";

// The installed Cloud SDK's generated add-binding command explicitly performs
// GetIamPolicy followed by SetIamPolicy. It cannot be treated as one physical
// provider call by a future M3 authority budget.
export const M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT = Object.freeze({
  mutationCommand: "iam service-accounts add-iam-policy-binding",
  mutationProcessInternalGetIamPolicy: true,
  mutationProcessInternalSetIamPolicy: true,
  mutationProcessPhysicalProviderCallsMin: 2,
  mutationProcessPhysicalProviderCallsMax: "UNKNOWN",
  priorSingleMutationCallModelAccurate: false,
  oldGcloudMutationPathReachableFromFutureM3: false,
  oldGcloudMutationPathFallbackReachable: false,
  oldGcloudMutationPathRetryReachable: false,
  accountingRepairState: "LOCAL_EXPLICIT_DIRECT_SET_TRANSPORT_READY_REATTESTATION_REQUIRED",
  explicitDirectSetPhysicalProviderCallsMax: 3,
  explicitDirectSetHiddenProviderCalls: 0,
  prospectiveM3Reachable: false,
  repairRequiredBeforeProspectiveApproval: false,
  postAccountingReattestationRequired: true,
});

function freezeArray(value) {
  return Object.freeze([...value]);
}

function freezeNode(node) {
  return Object.freeze({
    ...node,
    argvTemplate: freezeArray(node.argvTemplate),
    predecessorConditions: freezeArray(node.predecessorConditions),
    sensitiveFields: freezeArray(node.sensitiveFields),
  });
}

function safeResult(code, extra = {}) {
  return Object.freeze({ ok: false, code, ...extra });
}

function isExactEmail(value) {
  return typeof value === "string"
    && value.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCallerPrincipal(value) {
  if (!isExactEmail(value)) return false;
  return !/[`"'\\\r\n;]/.test(value);
}

function normalizeExactPrincipal(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return validateCallerPrincipal(normalized) ? normalized : null;
}

export function constructExactIamMember(value) {
  const principal = normalizeExactPrincipal(value);
  if (!principal) return null;
  return `${principal.endsWith(".iam.gserviceaccount.com") ? "serviceAccount" : "user"}:${principal}`;
}

export function createIdentityContext(principal, { environment = process.env } = {}) {
  const exactPrincipal = normalizeExactPrincipal(principal);
  const exactIamMember = constructExactIamMember(exactPrincipal);
  if (!exactPrincipal || !exactIamMember) return null;
  const configRoot = environment && typeof environment.CLOUDSDK_CONFIG === "string"
    ? environment.CLOUDSDK_CONFIG
    : null;
  const childEnvironment = createSanitizedChildEnvironment({ environment, configRoot });
  const principalKind = exactIamMember.startsWith("serviceAccount:") ? "serviceAccount" : "user";
  if (!M3_ALLOWED_PRINCIPAL_KIND.includes(principalKind)) return null;
  return Object.freeze(Object.defineProperties({}, {
    exactPrincipal: { value: exactPrincipal, enumerable: false },
    exactIamMember: { value: exactIamMember, enumerable: false },
    principalKind: { value: principalKind, enumerable: false },
    pinnedConfigRoot: { value: configRoot, enumerable: false },
    childEnvironment: { value: childEnvironment, enumerable: false },
  }));
}

function callerMember(value) {
  return constructExactIamMember(value);
}

function contextMember(value) {
  return value && typeof value === "object" && typeof value.exactIamMember === "string"
    ? value.exactIamMember
    : callerMember(value);
}

function pinnedArgs(args, identityContext) {
  if (!identityContext || !identityContext.exactPrincipal || !identityContext.exactIamMember) {
    throw new Error("identity-context-required");
  }
  return freezeArray([
    ...args,
    "--configuration=NONE",
    `--account=${identityContext.exactPrincipal}`,
  ]);
}

export function buildPinnedWriterMetadataCommand(identityContext) {
  return pinnedArgs([
    "iam", "service-accounts", "describe", WRITER_SERVICE_ACCOUNT, ...jsonArgs(),
  ], identityContext);
}

export function buildPinnedWriterPolicyReadCommand(identityContext) {
  return pinnedArgs([
    "iam", "service-accounts", "get-iam-policy", WRITER_SERVICE_ACCOUNT, ...jsonArgs(),
  ], identityContext);
}

export function buildPinnedProjectPolicyReadCommand(identityContext) {
  return pinnedArgs([
    "projects", "get-iam-policy", PROJECT_ID, ...jsonArgs(),
  ], identityContext);
}

export function buildPinnedWriterBindingMutationCommand(identityContext) {
  if (!identityContext || typeof identityContext.exactIamMember !== "string") {
    throw new Error("identity-context-required");
  }
  return pinnedArgs([
    "iam", "service-accounts", "add-iam-policy-binding", WRITER_SERVICE_ACCOUNT,
    `--member=${identityContext.exactIamMember}`,
    `--role=${TOKEN_CREATOR_ROLE}`, "--condition=None", "--quiet", "--verbosity=error",
  ], identityContext);
}

// The legacy writer builders remain available for historical callers. The
// current G2B executor must use these target-bound builders so its attested
// recovery and mutation surfaces cannot drift apart.
export function buildPinnedG2BWriterPolicyReadCommand(identityContext) {
  return pinnedArgs([
    "iam", "service-accounts", "get-iam-policy", G2B_WRITER_SERVICE_ACCOUNT, ...jsonArgs(),
  ], identityContext);
}

export function buildPinnedG2BWriterBindingMutationCommand(identityContext) {
  if (!identityContext || typeof identityContext.exactIamMember !== "string") {
    throw new Error("identity-context-required");
  }
  return pinnedArgs([
    "iam", "service-accounts", "add-iam-policy-binding", G2B_WRITER_SERVICE_ACCOUNT,
    `--member=${identityContext.exactIamMember}`,
    `--role=${TOKEN_CREATOR_ROLE}`, "--condition=None", "--quiet", "--verbosity=error",
  ], identityContext);
}

function logicalPinnedArgs(args) {
  return freezeArray([...args, "--configuration=NONE", "--account=<SESSION_EXACT_PRINCIPAL>"]);
}

function exactProjectId(value) {
  return value === PROJECT_ID;
}

function exactWriter(value) {
  return value === WRITER_SERVICE_ACCOUNT;
}

function jsonArgs() {
  return ["--format=json", "--verbosity=error"];
}

export function buildRoleReadCommand(roleId) {
  if (roleId !== STAGE1_ROLE_ID && roleId !== CANONICAL_ROLE_ID) {
    throw new Error("unsupported-role-id");
  }
  return freezeArray([
    "iam",
    "roles",
    "describe",
    roleId,
    `--project=${PROJECT_ID}`,
    ...jsonArgs(),
  ]);
}

export function buildActiveCallerCommand() {
  return freezeArray([
    "auth",
    "list",
    "--filter=status:ACTIVE",
    "--format=value(account)",
    "--verbosity=error",
  ]);
}

export function buildWriterMetadataCommand(identityContext) {
  return buildPinnedWriterMetadataCommand(identityContext);
}

export function buildWriterPolicyReadCommand(identityContext) {
  return buildPinnedWriterPolicyReadCommand(identityContext);
}

export function buildProjectPolicyReadCommand(identityContext) {
  return buildPinnedProjectPolicyReadCommand(identityContext);
}

export function buildWriterBindingMutationCommand(identityContext) {
  return buildPinnedWriterBindingMutationCommand(identityContext);
}

export function buildLogicalWriterPolicyReadCommand() {
  return logicalPinnedArgs(["iam", "service-accounts", "get-iam-policy", "<EXACT_WRITER_SA>", ...jsonArgs()]);
}

export function buildM3CommandGraph() {
  return Object.freeze({
    defaultLiveExecutionEnabled: DEFAULT_LIVE_EXECUTION_ENABLED,
    nodes: Object.freeze([
      freezeNode({
        id: "ROLE_STAGE1",
        semanticOperation: "STAGE1_ROLE_READ",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: ROLE_READ_SURFACE,
        argvTemplate: buildRoleReadCommand(STAGE1_ROLE_ID),
        structuredOutputContract: "exact-role-metadata",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: [],
        mutatesState: false,
        sensitiveFields: ["raw stdout"],
      }),
      freezeNode({
        id: "ROLE_CANONICAL",
        semanticOperation: "CANONICAL_ROLE_READ",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: ROLE_READ_SURFACE,
        argvTemplate: buildRoleReadCommand(CANONICAL_ROLE_ID),
        structuredOutputContract: "exact-role-metadata",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["ROLE_STAGE1=EXISTS_EXACT"],
        mutatesState: false,
        sensitiveFields: ["raw stdout"],
      }),
      freezeNode({
        id: "OP_A",
        semanticOperation: "ACTIVE_CALLER_DISCOVERY",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: AUTH_LIST_SURFACE,
        argvTemplate: buildActiveCallerCommand(),
        structuredOutputContract: "exactly-one-active-account-and-fingerprint",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["ROLE_CANONICAL=EXISTS_EXACT"],
        mutatesState: false,
        sensitiveFields: ["raw account transient only"],
      }),
      freezeNode({
        id: "OP_B",
        semanticOperation: "WRITER_SERVICE_ACCOUNT_METADATA_READ",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: SERVICE_ACCOUNT_DESCRIBE_SURFACE,
        argvTemplate: logicalPinnedArgs(["iam", "service-accounts", "describe", "<EXACT_WRITER_SA>", ...jsonArgs()]),
        structuredOutputContract: "writer-exists-enabled-exact-identity",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["OP_A=CALLER_IDENTITY_EXACT"],
        mutatesState: false,
        sensitiveFields: ["raw stdout"],
      }),
      freezeNode({
        id: "OP_C_PRE",
        semanticOperation: "WRITER_SERVICE_ACCOUNT_IAM_POLICY_PRECHECK",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: SERVICE_ACCOUNT_POLICY_SURFACE,
        argvTemplate: logicalPinnedArgs(["iam", "service-accounts", "get-iam-policy", "<EXACT_WRITER_SA>", ...jsonArgs()]),
        structuredOutputContract: "bounded-token-creator-predicate-and-etag-presence",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["OP_B=EXISTS_ENABLED"],
        mutatesState: false,
        sensitiveFields: ["raw policy", "etag"],
      }),
      freezeNode({
        id: "OP_D_PRE",
        semanticOperation: "PROJECT_IAM_POLICY_PRECHECK",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: PROJECT_POLICY_SURFACE,
        argvTemplate: logicalPinnedArgs(["projects", "get-iam-policy", "<EXACT_PROJECT>", ...jsonArgs()]),
        structuredOutputContract: "bounded-authority-predicates",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["OP_C_PRE=M3_ABSENT"],
        mutatesState: false,
        sensitiveFields: ["raw policy", "etag"],
      }),
      freezeNode({
        id: "OP_E",
        semanticOperation: "EXACT_WRITER_SERVICE_ACCOUNT_TOKEN_CREATOR_MUTATION",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: SERVICE_ACCOUNT_BINDING_SURFACE,
        argvTemplate: [
          "iam", "service-accounts", "add-iam-policy-binding", "<EXACT_WRITER_SA>",
          "--member=<TRANSIENT_VERIFIED_CALLER>", `--role=${TOKEN_CREATOR_ROLE}`,
          "--condition=None", "--quiet", "--verbosity=error",
          "--configuration=NONE", "--account=<SESSION_EXACT_PRINCIPAL>",
        ],
        structuredOutputContract: "confirmed-success-failure-or-indeterminate",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["FRESH_AUDIT_BASELINE=SAFE", "M3=ABSENT", "M4=ABSENT"],
        mutatesState: true,
        sensitiveFields: ["transient caller", "raw stdout", "raw stderr"],
      }),
      freezeNode({
        id: "OP_C_POST",
        semanticOperation: "WRITER_SERVICE_ACCOUNT_IAM_POLICY_POSTCHECK",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: SERVICE_ACCOUNT_POLICY_SURFACE,
        argvTemplate: logicalPinnedArgs(["iam", "service-accounts", "get-iam-policy", "<EXACT_WRITER_SA>", ...jsonArgs()]),
        structuredOutputContract: "bounded-final-token-creator-predicate",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["OP_E=CONFIRMED_SUCCESS"],
        mutatesState: false,
        sensitiveFields: ["raw policy", "etag"],
      }),
      freezeNode({
        id: "OP_D_POST",
        semanticOperation: "PROJECT_IAM_POLICY_POSTCHECK",
        transport: "gcloud-via-windows-process-adapter",
        commandSurface: PROJECT_POLICY_SURFACE,
        argvTemplate: logicalPinnedArgs(["projects", "get-iam-policy", "<EXACT_PROJECT>", ...jsonArgs()]),
        structuredOutputContract: "bounded-final-authority-predicates",
        maxCalls: 1,
        retryMax: 0,
        predecessorConditions: ["OP_C_POST=PRESENT_EXACT"],
        mutatesState: false,
        sensitiveFields: ["raw policy", "etag"],
      }),
    ]),
  });
}

function parseJson(stdout) {
  if (typeof stdout !== "string" || stdout.length > 1024 * 1024) return null;
  try {
    const parsed = JSON.parse(stdout);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function roleResource(role) {
  return typeof role?.name === "string" ? role.name : null;
}

export function parseExactRoleMetadata(stdout, expectedRoleId, expectedPermission) {
  const role = parseJson(stdout);
  const expectedResource = `projects/${PROJECT_ID}/roles/${expectedRoleId}`;
  if (!role || roleResource(role) !== expectedResource) return safeResult("ROLE_RESOURCE_MISMATCH");
  const permissions = Array.isArray(role.includedPermissions) ? role.includedPermissions : [];
  const extra = permissions.filter((permission) => permission !== expectedPermission);
  const missing = expectedPermission && permissions.includes(expectedPermission) ? [] : [expectedPermission];
  if (extra.length || missing.length || role.stage !== "GA" || role.deleted === true) {
    return safeResult("ROLE_METADATA_NOT_EXACT", { extraCount: extra.length, missingCount: missing.length });
  }
  return Object.freeze({ ok: true, state: "EXISTS_EXACT" });
}

export function parseWriterMetadata(stdout) {
  const metadata = parseJson(stdout);
  const expectedName = `projects/${PROJECT_ID}/serviceAccounts/${WRITER_SERVICE_ACCOUNT}`;
  if (!metadata || metadata.name !== expectedName) return safeResult("WRITER_IDENTITY_UNEXPECTED", { state: "UNEXPECTED_IDENTITY" });
  if (metadata.disabled === true) return safeResult("WRITER_DISABLED", { state: "DISABLED" });
  return Object.freeze({ ok: true, state: "EXISTS_ENABLED" });
}

function normalizedRole(role) {
  if (typeof role !== "string") return null;
  return role.startsWith("projects/") ? role : role;
}

function hasBinding(policy, member, role) {
  return Array.isArray(policy?.bindings)
    && policy.bindings.some((binding) => binding?.role === normalizedRole(role)
      && Array.isArray(binding.members)
      && binding.members.includes(member));
}

function policyObject(value) {
  if (typeof value === "string") return parseJson(value);
  return value && typeof value === "object" ? value : null;
}

export function parseWriterPolicyPredicates(value, callerPrincipal) {
  const policy = policyObject(value);
  const member = contextMember(callerPrincipal);
  if (!policy || !member) return safeResult("WRITER_POLICY_UNRESOLVED");
  const tokenCreatorMembers = new Set(
    (policy.bindings || [])
      .filter((binding) => binding?.role === TOKEN_CREATOR_ROLE)
      .flatMap((binding) => Array.isArray(binding.members) ? binding.members : []),
  );
  return Object.freeze({
    ok: true,
    m3Binding: tokenCreatorMembers.has(member),
    unexpectedTokenCreatorDelegation: [...tokenCreatorMembers].some((value) => value !== member),
    etagPresent: typeof policy.etag === "string" && policy.etag.length > 0,
  });
}

/** Maps the R3 parser's bounded projection to the legacy predicate contract. */
export function parseCanonicalWriterPolicyPredicates(value, callerPrincipal) {
  const member = contextMember(callerPrincipal);
  let stdout;
  try {
    stdout = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return safeResult("WRITER_POLICY_UNRESOLVED");
  }
  const projected = projectCanonicalWriterPolicyResult(stdout, member);
  if (projected.state === "READ_FAILURE" || !projected.canonical) {
    return safeResult("WRITER_POLICY_UNRESOLVED");
  }
  return Object.freeze({
    ok: true,
    m3Binding: projected.state === "PRESENT_CONFIRMED",
    unexpectedTokenCreatorDelegation: projected.state !== "ZERO_BINDINGS_ABSENT",
    etagPresent: projected.canonical.etagPresent === true,
  });
}

export function parseProjectPolicyPredicates(value, callerPrincipal) {
  const policy = policyObject(value);
  const member = contextMember(callerPrincipal);
  if (!policy || !member) return safeResult("PROJECT_POLICY_UNRESOLVED");
  return Object.freeze({
    ok: true,
    callerProjectWideTokenCreator: hasBinding(policy, member, TOKEN_CREATOR_ROLE),
    firebaseAdminProjectWideTokenCreator: hasBinding(policy, `serviceAccount:${FIREBASE_ADMIN_SERVICE_ACCOUNT}`, TOKEN_CREATOR_ROLE),
    writerCustomRoleBinding: hasBinding(policy, `serviceAccount:${WRITER_SERVICE_ACCOUNT}`, CLASS_CREATE_ROLE_RESOURCE),
    auditStage1ReaderBinding: hasBinding(policy, "serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com", STAGE1_ROLE_RESOURCE),
    auditCanonicalReaderBinding: hasBinding(policy, "serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com", CANONICAL_ROLE_RESOURCE),
    auditClassCreateRole: hasBinding(policy, "serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com", CLASS_CREATE_ROLE_RESOURCE),
    etagPresent: typeof policy.etag === "string" && policy.etag.length > 0,
  });
}

function parseActiveAccounts(stdout) {
  if (typeof stdout !== "string" || stdout.length > 1024 * 1024) return [];
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function evaluateExactPrestate(value, identityContext) {
  const policy = policyObject(value);
  const member = contextMember(identityContext);
  if (!policy || !member || !Array.isArray(policy.bindings)) return "READ_FAILURE";
  const matchingBindings = policy.bindings.filter((binding) => binding?.role === TOKEN_CREATOR_ROLE);
  if (matchingBindings.some((binding) => !Array.isArray(binding.members))) return "READ_FAILURE";
  const members = matchingBindings.flatMap((binding) => binding.members);
  if (members.filter((value) => value === member).length > 1) return "AMBIGUOUS";
  if (members.includes(member)) return "TARGET_MEMBER_PRESENT";
  return "TARGET_MEMBER_ABSENT";
}

export function createM3ExecutionState() {
  return { mutationAttempts: 0, retryCount: 0 };
}

function resultCounters(state, processCalls) {
  return Object.freeze({
    processCalls,
    mutationAttempts: state.mutationAttempts,
    retryCount: state.retryCount,
    m4Attempts: 0,
    tokenCalls: 0,
    firestoreCalls: 0,
  });
}

const SAFE_FAILURE_CLASSES = Object.freeze({
  timeout: "TIMEOUT",
  unresolved: "UNRESOLVED",
  unknownNonzero: "UNKNOWN_NONZERO",
});

export const M3_MUTATION_OUTCOME_DOMAIN = Object.freeze([
  "NOT_ATTEMPTED",
  "CONFIRMED_SUCCESS",
  "CONFIRMED_FAILURE",
  "INDETERMINATE",
]);

export const M3_CONFIRMED_FAILURE_RULES = Object.freeze([]);

/**
 * Classifies the remote effect of a started mutation conservatively. A local
 * process result cannot prove that a remote mutation was not applied.
 */
export function classifyM3MutationOutcome({
  mutationCommandStarted = false,
  result = null,
  remoteNonApplicationProven = false,
  normalResponseCompleted = false,
} = {}) {
  if (mutationCommandStarted !== true) return "NOT_ATTEMPTED";
  if (result?.exitCode === 0 && result?.timedOut !== true && normalResponseCompleted === true) {
    return "CONFIRMED_SUCCESS";
  }
  if (remoteNonApplicationProven === true && M3_CONFIRMED_FAILURE_RULES.length > 0) {
    return "CONFIRMED_FAILURE";
  }
  return "INDETERMINATE";
}

function safeStderrMetadata(stderr) {
  const value = typeof stderr === "string" ? stderr : "";
  const ruleIds = [...new Set(
    analyzeStderrLines(value)
      .flatMap((line) => line.matchedRuleIds)
      .filter((ruleId) => ruleId !== "TERMINAL_BLANK_V1"),
  )].sort();
  return Object.freeze({
    stderrLineCount: value.length === 0 ? 0 : value.split(/\r\n|\n|\r/).length,
    stderrByteCount: Buffer.byteLength(value, "utf8"),
    safeErrorIdentifier: ruleIds.length > 0 ? ruleIds.join("+") : "NO_KNOWN_STDERR_RULE",
    safeErrorClass: classifySafeStderr(analyzeStderrLines(value)),
  });
}

function safeProcessStartState(result) {
  if (!result || typeof result !== "object") return "UNKNOWN";
  if (result.timedOut === true || Number.isInteger(result.exitCode) || Boolean(result.signal)) {
    return "STARTED";
  }
  if (result.spawnError) return "NOT_STARTED";
  return "UNKNOWN";
}

function safeSignalCategory(result) {
  return typeof result?.signal === "string" && result.signal.length > 0
    ? "SIGNAL_OBSERVED"
    : "NONE";
}

function safeSpawnErrorCategory(result) {
  return result?.spawnError ? "SPAWN_ERROR" : "NONE";
}

function safeFailureStage(result, processStartState) {
  if (processStartState === "NOT_STARTED") return "BEFORE_PROCESS_START";
  if (result?.timedOut === true || safeSignalCategory(result) === "SIGNAL_OBSERVED") {
    return "PROCESS_RUNNING";
  }
  if (Number.isInteger(result?.exitCode)) return "PROCESS_EXIT";
  return "UNKNOWN";
}

export function projectSafeMutationDiagnostic(result, mutationOutcome, {
  mutationCommandStarted = true,
  remoteNonApplicationProven = false,
  normalResponseCompleted = false,
} = {}) {
  const metadata = safeStderrMetadata(result?.stderr);
  const failureClass = result?.timedOut === true
    ? SAFE_FAILURE_CLASSES.timeout
    : Number.isInteger(result?.exitCode) && result.exitCode !== 0
      ? SAFE_FAILURE_CLASSES.unknownNonzero
      : result?.exitCode === null || result?.exitCode === undefined
        ? SAFE_FAILURE_CLASSES.unresolved
        : "NONE";
  const processStartState = safeProcessStartState(result);
  return Object.freeze({
    processStarted: processStartState === "STARTED",
    processStartState,
    exitCode: Number.isInteger(result?.exitCode) ? result.exitCode : null,
    timedOut: result?.timedOut === true,
    signalCategory: safeSignalCategory(result),
    spawnErrorCategory: safeSpawnErrorCategory(result),
    safeFailureStage: safeFailureStage(result, processStartState),
    failureClass,
    safeErrorIdentifier: metadata.safeErrorIdentifier,
    safeErrorClass: metadata.safeErrorClass,
    stderrLineCount: metadata.stderrLineCount,
    stderrByteCount: metadata.stderrByteCount,
    mutationOutcome: classifyM3MutationOutcome({
      mutationCommandStarted,
      result,
      remoteNonApplicationProven,
      normalResponseCompleted,
    }),
  });
}

async function callJson(runProcess, executable, args, processCalls, environment) {
  let result;
  try {
    result = await runProcess({ executable, args, timeoutMs: 10_000, environment });
  } catch {
    return { ok: false, code: "PROCESS_FAILED", processCalls: processCalls + 1 };
  }
  const nextCalls = processCalls + 1;
  if (!result || result.exitCode !== 0 || result.timedOut) {
    return { ok: false, code: "PROCESS_FAILED", processCalls: nextCalls };
  }
  const parsed = parseJson(result.stdout);
  return parsed ? { ok: true, value: parsed, processCalls: nextCalls } : { ok: false, code: "INVALID_JSON", processCalls: nextCalls };
}

export async function runM3Dormant({
  enabled = DEFAULT_LIVE_EXECUTION_ENABLED,
  executable = null,
  runProcess = runWindowsProcess,
  environment = process.env,
} = {}) {
  const state = createM3ExecutionState();
  if (enabled !== true) {
    return Object.freeze({
      ok: false,
      code: "LIVE_EXECUTION_DISABLED",
      counters: resultCounters(state, 0),
    });
  }
  const selectedExecutable = executable || resolveLocalGcloudExecutable();
  if (!selectedExecutable) return safeResult("GCLOUD_EXECUTABLE_UNAVAILABLE", { counters: resultCounters(state, 0) });

  let processCalls = 0;
  const role1 = await callJson(runProcess, selectedExecutable, buildRoleReadCommand(STAGE1_ROLE_ID), processCalls, environment);
  processCalls = role1.processCalls;
  if (!role1.ok) return safeResult(role1.code, { counters: resultCounters(state, processCalls) });
  const role1State = parseExactRoleMetadata(JSON.stringify(role1.value), STAGE1_ROLE_ID, "datastore.entities.list");
  if (!role1State.ok) return safeResult(role1State.code, { counters: resultCounters(state, processCalls) });

  const role2 = await callJson(runProcess, selectedExecutable, buildRoleReadCommand(CANONICAL_ROLE_ID), processCalls, environment);
  processCalls = role2.processCalls;
  if (!role2.ok) return safeResult(role2.code, { counters: resultCounters(state, processCalls) });
  const role2State = parseExactRoleMetadata(JSON.stringify(role2.value), CANONICAL_ROLE_ID, "datastore.entities.get");
  if (!role2State.ok) return safeResult(role2State.code, { counters: resultCounters(state, processCalls) });

  const callerResult = await runProcess({ executable: selectedExecutable, args: buildActiveCallerCommand(), timeoutMs: 10_000, environment });
  processCalls += 1;
  const accounts = callerResult?.exitCode === 0 && !callerResult.timedOut ? parseActiveAccounts(callerResult.stdout) : [];
  if (accounts.length !== 1) {
    return safeResult("CALLER_IDENTITY_MISMATCH", { counters: resultCounters(state, processCalls) });
  }
  const identityContext = createIdentityContext(accounts[0], { environment });
  if (!identityContext) return safeResult("CALLER_IDENTITY_INVALID", { counters: resultCounters(state, processCalls) });

  const writer = await callJson(runProcess, selectedExecutable, buildPinnedWriterMetadataCommand(identityContext), processCalls, identityContext.childEnvironment);
  processCalls = writer.processCalls;
  if (!writer.ok) return safeResult(writer.code, { counters: resultCounters(state, processCalls) });
  const writerState = parseWriterMetadata(JSON.stringify(writer.value));
  if (!writerState.ok) return safeResult(writerState.code, { counters: resultCounters(state, processCalls) });

  const writerPolicy = await callJson(runProcess, selectedExecutable, buildPinnedWriterPolicyReadCommand(identityContext), processCalls, identityContext.childEnvironment);
  processCalls = writerPolicy.processCalls;
  if (!writerPolicy.ok) return safeResult(writerPolicy.code, { counters: resultCounters(state, processCalls) });
  const writerPredicates = parseCanonicalWriterPolicyPredicates(writerPolicy.value, identityContext);
  if (!writerPredicates.ok || writerPredicates.m3Binding || writerPredicates.unexpectedTokenCreatorDelegation || !writerPredicates.etagPresent) {
    return safeResult("WRITER_PRESTATE_UNSAFE", { counters: resultCounters(state, processCalls) });
  }

  const projectPolicy = await callJson(runProcess, selectedExecutable, buildPinnedProjectPolicyReadCommand(identityContext), processCalls, identityContext.childEnvironment);
  processCalls = projectPolicy.processCalls;
  if (!projectPolicy.ok) return safeResult(projectPolicy.code, { counters: resultCounters(state, processCalls) });
  const projectPredicates = parseProjectPolicyPredicates(projectPolicy.value, identityContext);
  if (!projectPredicates.ok || projectPredicates.callerProjectWideTokenCreator
    || projectPredicates.firebaseAdminProjectWideTokenCreator || projectPredicates.writerCustomRoleBinding
    || !projectPredicates.auditStage1ReaderBinding || !projectPredicates.auditCanonicalReaderBinding
    || projectPredicates.auditClassCreateRole || !projectPredicates.etagPresent) {
    return safeResult("PROJECT_PRESTATE_UNSAFE", { counters: resultCounters(state, processCalls) });
  }

  if (state.mutationAttempts >= M3_MUTATION_MAX) return safeResult("M3_MUTATION_BUDGET_EXHAUSTED", { counters: resultCounters(state, processCalls) });
  state.mutationAttempts += 1;
  let mutation;
  try {
    mutation = await runProcess({ executable: selectedExecutable, args: buildPinnedWriterBindingMutationCommand(identityContext), timeoutMs: 10_000, environment: identityContext.childEnvironment });
  } catch {
    return safeResult("M3_MUTATION_INDETERMINATE", {
      counters: resultCounters(state, processCalls + 1),
      diagnostic: projectSafeMutationDiagnostic(null, "INDETERMINATE"),
    });
  }
  processCalls += 1;
  if (!mutation || mutation.timedOut || mutation.exitCode === null) {
    return safeResult("M3_MUTATION_INDETERMINATE", {
      counters: resultCounters(state, processCalls),
      diagnostic: projectSafeMutationDiagnostic(mutation, "INDETERMINATE"),
    });
  }
  if (mutation.exitCode !== 0) {
    return safeResult("M3_MUTATION_INDETERMINATE", {
      counters: resultCounters(state, processCalls),
      diagnostic: projectSafeMutationDiagnostic(mutation, "CONFIRMED_FAILURE"),
    });
  }

  const writerPost = await callJson(runProcess, selectedExecutable, buildPinnedWriterPolicyReadCommand(identityContext), processCalls, identityContext.childEnvironment);
  processCalls = writerPost.processCalls;
  if (!writerPost.ok) return safeResult(writerPost.code, { counters: resultCounters(state, processCalls) });
  const writerFinal = parseCanonicalWriterPolicyPredicates(writerPost.value, identityContext);
  const projectPost = await callJson(runProcess, selectedExecutable, buildPinnedProjectPolicyReadCommand(identityContext), processCalls, identityContext.childEnvironment);
  processCalls = projectPost.processCalls;
  if (!projectPost.ok) return safeResult(projectPost.code, { counters: resultCounters(state, processCalls) });
  const projectFinal = parseProjectPolicyPredicates(projectPost.value, identityContext);
  if (!writerFinal.ok || !writerFinal.m3Binding || !projectFinal.ok || projectFinal.callerProjectWideTokenCreator
    || projectFinal.firebaseAdminProjectWideTokenCreator || projectFinal.writerCustomRoleBinding
    || projectFinal.auditClassCreateRole) {
    return safeResult("M3_POSTSTATE_VERIFICATION_FAILURE", { counters: resultCounters(state, processCalls) });
  }
  return Object.freeze({
    ok: true,
    state: "M3_PRESENT_EXACT",
    counters: resultCounters(state, processCalls),
  });
}

export const M3_RUNTIME_SECURITY_CONTRACT = Object.freeze({
  projectId: PROJECT_ID,
  writerServiceAccount: WRITER_SERVICE_ACCOUNT,
  tokenCreatorRole: TOKEN_CREATOR_ROLE,
  defaultLiveExecutionEnabled: DEFAULT_LIVE_EXECUTION_ENABLED,
  mutationMax: M3_MUTATION_MAX,
  retryMax: M3_RETRY_MAX,
  projectIamMutationCommandCount: 0,
  m4CommandBuilderPresent: false,
  tokenGenerationCommandReachable: false,
  firestoreCommandOrApiPathReachable: false,
  serviceAccountKeyPathReachable: false,
  legacyFingerprintAuthorization: false,
  accountPinnedDownstreamOperations: Object.freeze(["OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"]),
  configurationPinnedToNone: true,
  childEnvironmentSnapshottedOnce: true,
  authOverrideEnvironmentSanitized: AUTH_OVERRIDE_ENV_SURFACES,
  unpinnedAuthRetryReachable: false,
  identityContextPersisted: false,
  memberRederivationAfterContextCreate: 0,
  remoteCapabilityAccounting: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT,
});
