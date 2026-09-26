import { createHash } from "node:crypto";

export const G4R3D_ATTESTATION_SCHEMA = "myweb.m3l2.g4r3d.exact-target-member-identity-contract.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const PATH = /^(tools|docs)\/[A-Za-z0-9._/-]+$/;
const REQUIRED_KEYS = [
  "schema", "g4r2CompositeSha256", "g4r2ResultDocumentSha256", "g4r1AttestationSha256",
  "currentOpAIdentityFlow", "legacyFingerprintStatus", "intendedTargetMemberContract",
  "memberConstructionContract", "effectiveCredentialContract", "accountOverrideAnalysis",
  "impersonationAnalysis", "toctouAnalysis", "identityPinningDesign", "freshPrestateContract",
  "sameMemberInvariant", "restartBehavior", "approvalConsumption", "runtimeChangeRequired",
  "proposedPatchScope", "externalCapabilityImpact", "privacy", "futureAuthorityRequirements",
  "verdict",
];
const FORBIDDEN_KEY = /(?:^|_)(?:email|uid|token|credential|stdout|stderr|secret|password|apiKey|privateKey|absolutePath|documentId|workspaceId)(?:$|_)/i;
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v, keys) => plain(v) && Object.keys(v).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));
const safePath = (v) => typeof v === "string" && PATH.test(v) && !v.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(v);
const noForbiddenKeys = (v) => Array.isArray(v) ? v.every(noForbiddenKeys) : !plain(v) || Object.entries(v).every(([k, x]) => !FORBIDDEN_KEY.test(k) && noForbiddenKeys(x));
const noRawIdentity = (v) => {
  if (Array.isArray(v)) return v.every(noRawIdentity);
  if (plain(v)) return Object.values(v).every(noRawIdentity);
  if (typeof v !== "string") return true;
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !/^[A-Za-z]:[\\/]/.test(v) && !/^\//.test(v);
};
const locks = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => exactKeys(x, ["path", "sha256"]) && safePath(x.path) && SHA256.test(x.sha256));

function validate(p) {
  if (!exactKeys(p, REQUIRED_KEYS) || p.schema !== G4R3D_ATTESTATION_SCHEMA || !noForbiddenKeys(p) || !noRawIdentity(p)) return false;
  if (!["g4r2CompositeSha256", "g4r2ResultDocumentSha256", "g4r1AttestationSha256"].every((k) => SHA256.test(p[k]))) return false;
  if (p.currentOpAIdentityFlow !== "SINGLE_ACTIVE_ACCOUNT_RAW_TRANSIENT_WITH_48_BIT_GATE") return false;
  if (p.legacyFingerprintStatus !== "AUTHORIZATION_GRADE_EXACT_IDENTITY_PROOF_NO") return false;
  if (p.intendedTargetMemberContract !== "SINGLE_EXACT_VALIDATED_PRINCIPAL_TO_EXACT_IAM_MEMBER") return false;
  if (!exactKeys(p.memberConstructionContract, ["targetRole", "supportedKindRule", "constructionCountAfterContextCreate"]) || p.memberConstructionContract.targetRole !== "roles/iam.serviceAccountTokenCreator" || p.memberConstructionContract.constructionCountAfterContextCreate !== 0) return false;
  if (!exactKeys(p.effectiveCredentialContract, ["status", "reason", "futureRequirement"]) || p.effectiveCredentialContract.status !== "UNRESOLVED" || p.effectiveCredentialContract.futureRequirement !== "BOUND_TO_EXACT_TRANSIENT_CONTEXT") return false;
  if (!exactKeys(p.accountOverrideAnalysis, ["surfaces", "currentRuntimePinsAccount"]) || !Array.isArray(p.accountOverrideAnalysis.surfaces) || p.accountOverrideAnalysis.currentRuntimePinsAccount !== false) return false;
  if (!exactKeys(p.impersonationAnalysis, ["currentArgvSupport", "unapprovedPolicy"]) || p.impersonationAnalysis.unapprovedPolicy !== "BLOCK") return false;
  if (!exactKeys(p.toctouAnalysis, ["status", "failureBehavior"]) || p.toctouAnalysis.status !== "POSSIBLE" || p.toctouAnalysis.failureBehavior !== "STOP_BEFORE_PRESTATE_OR_MUTATION") return false;
  if (!exactKeys(p.identityPinningDesign, ["discoveryMax", "context", "exactDecision", "restartResumable", "noRediscovery", "options"]) || p.identityPinningDesign.discoveryMax !== 1 || p.identityPinningDesign.exactDecision !== true || p.identityPinningDesign.restartResumable !== false || p.identityPinningDesign.noRediscovery !== true || !Array.isArray(p.identityPinningDesign.options) || p.identityPinningDesign.options.length < 1) return false;
  if (!exactKeys(p.freshPrestateContract, ["states", "inspection", "storedReason", "memberMatch"]) || JSON.stringify(p.freshPrestateContract.states) !== JSON.stringify(["PRESENT", "ABSENT", "AMBIGUOUS", "READ_FAILURE"]) || p.freshPrestateContract.inspection !== "TRANSIENT_EXACT_COMPARE_ONLY" || p.freshPrestateContract.memberMatch !== "EXACT_NO_HASH_NO_SUBSTRING") return false;
  if (!exactKeys(p.sameMemberInvariant, ["prestateEqualsMutation", "construction"]) || p.sameMemberInvariant.prestateEqualsMutation !== "BY_CONSTRUCTION") return false;
  if (!exactKeys(p.restartBehavior, ["identityContextResumable", "crashAfterAbsentMutationCount"]) || p.restartBehavior.identityContextResumable !== false || p.restartBehavior.crashAfterAbsentMutationCount !== 0) return false;
  if (!exactKeys(p.approvalConsumption, ["point", "accountChange"]) || p.approvalConsumption.accountChange !== "STOP_NO_REDISCOVERY") return false;
  if (p.runtimeChangeRequired !== true || !locks(p.proposedPatchScope)) return false;
  if (!exactKeys(p.externalCapabilityImpact, ["status", "reason"]) || p.externalCapabilityImpact.status !== "ARGV_AND_SEMANTIC_REATTESTATION_REQUIRED") return false;
  if (!exactKeys(p.privacy, ["rawPrincipalPersisted", "rawMemberPersisted", "identityHashUsedForAuthorization", "rawProcessOutputPersisted"]) || Object.values(p.privacy).some((v) => v !== false)) return false;
  if (!exactKeys(p.futureAuthorityRequirements, ["m3l3ApprovalGranted", "m4ApprovalGranted", "unapprovedImpersonation", "historicalIdentityRequired"]) || p.futureAuthorityRequirements.m3l3ApprovalGranted !== false || p.futureAuthorityRequirements.m4ApprovalGranted !== false || p.futureAuthorityRequirements.unapprovedImpersonation !== "BLOCK" || p.futureAuthorityRequirements.historicalIdentityRequired !== false) return false;
  return p.verdict === "P1_5_C2H2E3D_W1C_M3L2_G4R3D_EFFECTIVE_CALLER_IDENTITY_SEMANTICS_UNRESOLVED";
}

function sortValue(v) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.map(sortValue);
  if (!plain(v)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
}

export function parseG4R3DContract(text) {
  if (typeof text !== "string") return null;
  try { const p = JSON.parse(text); return validate(p) ? p : null; } catch { return null; }
}
export function canonicalizeG4R3DContract(p) { if (!validate(p)) throw new Error("invalid-g4r3d-contract"); return JSON.stringify(sortValue(p)); }
export function computeG4R3DContractSha256(p) { return createHash("sha256").update(canonicalizeG4R3DContract(p), "utf8").digest("hex"); }
export function verifyG4R3DContract(p) {
  if (!validate(p)) return Object.freeze({ ok: false, code: "INVALID_CONTRACT" });
  return Object.freeze({ ok: false, code: "EFFECTIVE_CALLER_IDENTITY_SEMANTICS_UNRESOLVED", sha256: computeG4R3DContractSha256(p) });
}
export const G4R3D_DESIGN_CONTRACT = Object.freeze({ networkAccess: false, processSpawn: false, filesystemWrite: false, productionAccess: false, rawIdentityPersistence: false });
