import { createHash } from "node:crypto";

export const G4R3S_ATTESTATION_SCHEMA = "myweb.m3l2.g4r3s.effective-caller-pinning-semantics.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const PATH = /^(tools|docs)\/[A-Za-z0-9._/-]+$/;
const REQUIRED_KEYS = [
  "schema", "g4r3dPayloadSha256", "g4r3dResultDocumentSha256", "g4r2CompositeSha256", "g4r1AttestationSha256",
  "officialSemantics", "localRuntimeAnalysis", "authOverrideInventory", "configurationNoneSemantics",
  "accountPinningSemantics", "credentialFallbackSemantics", "toctouClosure", "principalKindContract",
  "memberConstructionContract", "futureIdentityContext", "proposedPatchScope", "externalCapabilityImpact",
  "privacy", "futureAuthorityRequirements", "verdict",
];
const FORBIDDEN_KEY = /(?:^|_)(?:email|uid|token|credential|stdout|stderr|secret|password|apiKey|privateKey|absolutePath|documentId|workspaceId|rawConfig|policy)(?:$|_)/i;
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v, keys) => plain(v) && Object.keys(v).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));
const safePath = (v) => typeof v === "string" && PATH.test(v) && !v.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(v);
const noForbiddenKeys = (v) => Array.isArray(v) ? v.every(noForbiddenKeys) : !plain(v) || Object.entries(v).every(([k, x]) => !FORBIDDEN_KEY.test(k) && noForbiddenKeys(x));
const noRawIdentity = (v) => Array.isArray(v) ? v.every(noRawIdentity) : !plain(v) ? (typeof v !== "string" || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !/^[A-Za-z]:[\\/]/.test(v) && !/^\//.test(v))) : Object.values(v).every(noRawIdentity);
const locks = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => exactKeys(x, ["path", "sha256"]) && safePath(x.path) && SHA256.test(x.sha256));

function validate(p) {
  if (!exactKeys(p, REQUIRED_KEYS) || p.schema !== G4R3S_ATTESTATION_SCHEMA || !noForbiddenKeys(p) || !noRawIdentity(p)) return false;
  if (!["g4r3dPayloadSha256", "g4r3dResultDocumentSha256", "g4r2CompositeSha256", "g4r1AttestationSha256"].every((k) => SHA256.test(p[k]))) return false;
  const official = p.officialSemantics;
  if (!exactKeys(official, ["authListExcludesOverrides", "accountFlagOverridesCoreAccount", "accessTokenCanIgnoreActiveAccount", "credentialFileOverrideExists", "impersonationOverridesSelectedAccount", "environmentOverridesExist", "configurationNonePropertyEmpty"]) || Object.values(official).some((v) => v !== true)) return false;
  if (!exactKeys(p.localRuntimeAnalysis, ["processLaunchModule", "processLaunchSymbol", "childEnvMode", "workingDirectory", "currentCommandArgvPinned"]) || p.localRuntimeAnalysis.childEnvMode !== "INHERIT_ALL" || p.localRuntimeAnalysis.currentCommandArgvPinned !== false) return false;
  const inv = p.authOverrideInventory;
  if (!exactKeys(inv, ["environmentSurfaces", "configProperties", "flagsFileReachable", "valuesPersisted"]) || JSON.stringify(inv.environmentSurfaces) !== JSON.stringify(["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"]) || JSON.stringify(inv.configProperties) !== JSON.stringify(["auth/access_token_file", "auth/credential_file_override", "auth/impersonate_service_account", "core/account"]) || inv.flagsFileReachable !== false || inv.valuesPersisted !== 0) return false;
  if (!exactKeys(p.configurationNoneSemantics, ["status", "noneConfigProperties", "explicitAccountContract"]) || p.configurationNoneSemantics.status !== "PROVEN_PROPERTY_EMPTY" || p.configurationNoneSemantics.noneConfigProperties !== "NONE" || p.configurationNoneSemantics.explicitAccountContract !== "SUPPORTED") return false;
  if (!exactKeys(p.accountPinningSemantics, ["accountFlagCoreAccount", "configAccountToctou", "accountPinnedOperations", "opADiscoveryRole"]) || p.accountPinningSemantics.accountFlagCoreAccount !== "PROVEN" || p.accountPinningSemantics.configAccountToctou !== "PROVEN_CLOSED" || p.accountPinningSemantics.opADiscoveryRole !== "BOOTSTRAP_ONLY_NOT_LATER_CALLER_PROOF" || !Array.isArray(p.accountPinningSemantics.accountPinnedOperations)) return false;
  if (!exactKeys(p.credentialFallbackSemantics, ["accessTokenOverride", "credentialFileOverride", "impersonationOverride", "childOverrideInheritance", "pinnedMissingCredentialFallback"]) || p.credentialFallbackSemantics.accessTokenOverride !== "PROVEN_YES" || p.credentialFallbackSemantics.credentialFileOverride !== "FORBIDDEN" || p.credentialFallbackSemantics.impersonationOverride !== "FORBIDDEN" || p.credentialFallbackSemantics.childOverrideInheritance !== "yes" || p.credentialFallbackSemantics.pinnedMissingCredentialFallback !== "UNRESOLVED") return false;
  if (!exactKeys(p.toctouClosure, ["configAccountAfterPinning", "childAuthEnv", "midSessionOverride", "failureBehavior"]) || p.toctouClosure.configAccountAfterPinning !== "PROVEN_CLOSED" || p.toctouClosure.childAuthEnv !== "PROVEN_CLOSED" || p.toctouClosure.midSessionOverride !== "BLOCK" || p.toctouClosure.failureBehavior !== "STOP_BEFORE_PRESTATE_OR_MUTATION") return false;
  if (!exactKeys(p.principalKindContract, ["allowedKind", "cardinality", "normalization"]) || p.principalKindContract.cardinality !== "EXACTLY_ONE" || p.principalKindContract.normalization !== "NONE_EXCEPT_DOCUMENTED_TRANSPORT_FRAMING") return false;
  if (!exactKeys(p.memberConstructionContract, ["status", "constructor", "targetRole", "prestateEqualsOpE"]) || p.memberConstructionContract.status !== "PROVEN" || p.memberConstructionContract.targetRole !== "roles/iam.serviceAccountTokenCreator" || p.memberConstructionContract.prestateEqualsOpE !== "BY_CONSTRUCTION") return false;
  if (!exactKeys(p.futureIdentityContext, ["storage", "immutable", "discoveryMax", "exactDecision", "restartResumable", "rediscoveryAfterPrestate"]) || p.futureIdentityContext.storage !== "IN_MEMORY_ONLY" || p.futureIdentityContext.immutable !== true || p.futureIdentityContext.discoveryMax !== 1 || p.futureIdentityContext.exactDecision !== true || p.futureIdentityContext.restartResumable !== false || p.futureIdentityContext.rediscoveryAfterPrestate !== 0) return false;
  if (!locks(p.proposedPatchScope) || !exactKeys(p.externalCapabilityImpact, ["status", "reason"]) || p.externalCapabilityImpact.status !== "ARGV_REATTESTATION_REQUIRED" || p.privacy?.valuesPersisted !== 0) return false;
  if (!exactKeys(p.privacy, ["rawIdentityPersisted", "rawMemberPersisted", "overrideValuesPersisted", "rawConfigPersisted", "rawOutputPersisted", "valuesPersisted"]) || Object.values(p.privacy).some((v) => v !== false && v !== 0)) return false;
  if (!exactKeys(p.futureAuthorityRequirements, ["m3l3ApprovalGranted", "m4ApprovalGranted", "historicalIdentityRequired", "unapprovedImpersonation", "m3MutationDiagnostic"]) || p.futureAuthorityRequirements.m3l3ApprovalGranted !== false || p.futureAuthorityRequirements.m4ApprovalGranted !== false || p.futureAuthorityRequirements.historicalIdentityRequired !== false || p.futureAuthorityRequirements.unapprovedImpersonation !== "BLOCK" || p.futureAuthorityRequirements.m3MutationDiagnostic !== false) return false;
  return p.verdict === "P1_5_C2H2E3D_W1C_M3L2_G4R3S_PINNED_ACCOUNT_CREDENTIAL_FALLBACK_UNRESOLVED";
}

function sortValue(v) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.map(sortValue);
  if (!plain(v)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
}
export function parseG4R3SAttestation(text) { if (typeof text !== "string") return null; try { const p = JSON.parse(text); return validate(p) ? p : null; } catch { return null; } }
export function canonicalizeG4R3SAttestation(p) { if (!validate(p)) throw new Error("invalid-g4r3s-attestation"); return JSON.stringify(sortValue(p)); }
export function computeG4R3SAttestationSha256(p) { return createHash("sha256").update(canonicalizeG4R3SAttestation(p), "utf8").digest("hex"); }
export function verifyG4R3SAttestation(p) { if (!validate(p)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" }); return Object.freeze({ ok: false, code: "PINNED_ACCOUNT_CREDENTIAL_FALLBACK_UNRESOLVED", sha256: computeG4R3SAttestationSha256(p) }); }
export const G4R3S_CONTRACT = Object.freeze({ networkAccess: false, processSpawn: false, filesystemWrite: false, productionAccess: false, rawOverrideValuePersistence: false });
