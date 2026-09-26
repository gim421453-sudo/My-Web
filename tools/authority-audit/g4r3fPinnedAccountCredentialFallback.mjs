import { createHash } from "node:crypto";

export const G4R3F_ATTESTATION_SCHEMA = "myweb.m3l2.g4r3f.pinned-account-credential-fallback.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const PATH = /^(tools|docs|sdk)\/[A-Za-z0-9._/-]+$/;
const REQUIRED_KEYS = [
  "schema", "g4r3sPayloadSha256", "g4r3sResultDocumentSha256", "g4r3dPayloadSha256", "g4r2CompositeSha256", "localSdkIdentity", "accountFlagFlow", "credentialLoaderEntry", "overrideExclusionFlow", "credentialStoreLookupSemantics", "storedAccountEnumerationAnalysis", "staticCredentialProviders", "metadataProviderSemantics", "missingCredentialFinalAction", "refreshFailureSemantics", "invalidCredentialSemantics", "accountRemovalSemantics", "configRootSemantics", "effectiveCallerContract", "runtimeImplementationRequirement", "privacy", "futureAuthorityRequirements", "sdkSourceLocks", "verdict",
];
const FORBIDDEN_KEY = /(?:^|_)(?:email|uid|token|secret|password|apiKey|privateKey|absolutePath|credentialPath|databasePath|rawOutput|rawPolicy)(?:$|_)/i;
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v, keys) => plain(v) && Object.keys(v).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));
const safePath = (v) => typeof v === "string" && PATH.test(v) && !v.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(v);
const noForbiddenKeys = (v) => Array.isArray(v) ? v.every(noForbiddenKeys) : !plain(v) || Object.entries(v).every(([k, x]) => !FORBIDDEN_KEY.test(k) && noForbiddenKeys(x));
const noRaw = (v) => Array.isArray(v) ? v.every(noRaw) : !plain(v) ? (typeof v !== "string" || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !/^[A-Za-z]:[\\/]/.test(v) && !/^\//.test(v))) : Object.values(v).every(noRaw);
const locks = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => exactKeys(x, ["path", "sha256", "role"]) && safePath(x.path) && SHA256.test(x.sha256) && typeof x.role === "string");

function validate(p) {
  if (!exactKeys(p, REQUIRED_KEYS) || p.schema !== G4R3F_ATTESTATION_SCHEMA || !noForbiddenKeys(p) || !noRaw(p)) return false;
  if (!["g4r3sPayloadSha256", "g4r3sResultDocumentSha256", "g4r3dPayloadSha256", "g4r2CompositeSha256"].every((k) => SHA256.test(p[k]))) return false;
  if (!exactKeys(p.localSdkIdentity, ["version", "identityMatch", "pathContainment"]) || p.localSdkIdentity.version !== "580.0.0" || p.localSdkIdentity.identityMatch !== "yes" || p.localSdkIdentity.pathContainment !== "PASS") return false;
  if (!exactKeys(p.accountFlagFlow, ["explicitAccountSupported", "overridesCoreAccount", "loaderReceivesExplicitAccount", "enumerationAfterSelection"]) || Object.values(p.accountFlagFlow).some((v) => v !== true && v !== "PROVEN_ABSENT")) return false;
  if (!exactKeys(p.credentialLoaderEntry, ["symbol", "accountSource", "normalEntry", "requestedScope"]) || p.credentialLoaderEntry.symbol !== "googlecloudsdk.core.credentials.store.Load -> _Load" || p.credentialLoaderEntry.accountSource !== "explicit account argument, otherwise core/account" || p.credentialLoaderEntry.normalEntry !== "after override branches" || p.credentialLoaderEntry.requestedScope !== "EXACT_ACCOUNT") return false;
  if (!exactKeys(p.overrideExclusionFlow, ["accessTokenEnvironment", "accessTokenFile", "credentialFileOverride", "impersonation", "normalLookupReachedAfterExclusion"]) || Object.values(p.overrideExclusionFlow).some((v) => v !== "BLOCKED_BY_FUTURE_CONTRACT" && v !== true)) return false;
  if (!exactKeys(p.credentialStoreLookupSemantics, ["storeLoadScope", "missingResult", "otherAccountSelection"]) || p.credentialStoreLookupSemantics.storeLoadScope !== "EXACT_ACCOUNT_ONLY" || p.credentialStoreLookupSemantics.missingResult !== "NULL" || p.credentialStoreLookupSemantics.otherAccountSelection !== "PROVEN_ABSENT") return false;
  if (!exactKeys(p.storedAccountEnumerationAnalysis, ["reachableAfterExplicitSelection", "enumerationSymbols", "result"]) || p.storedAccountEnumerationAnalysis.reachableAfterExplicitSelection !== false || p.storedAccountEnumerationAnalysis.result !== "PROVEN_ABSENT") return false;
  if (!exactKeys(p.staticCredentialProviders, ["count", "providers", "accountScoping", "crossAccountRisk"]) || p.staticCredentialProviders.count !== 1 || p.staticCredentialProviders.providers[0] !== "GceCredentialProvider" || p.staticCredentialProviders.accountScoping[0] !== "REQUESTED_ACCOUNT_METADATA_MEMBERSHIP" || p.staticCredentialProviders.crossAccountRisk[0] !== "EXACT_REQUESTED_ACCOUNT_ONLY") return false;
  if (!exactKeys(p.metadataProviderSemantics, ["requestAccountGated", "crossAccountFallback"]) || p.metadataProviderSemantics.requestAccountGated !== true || p.metadataProviderSemantics.crossAccountFallback !== "PROVEN_NO") return false;
  if (!exactKeys(p.missingCredentialFinalAction, ["action", "exception", "alternateAccountSelected", "interactivePrompt"]) || p.missingCredentialFinalAction.action !== "FAIL" || p.missingCredentialFinalAction.exception !== "NoCredentialsForAccountException" || p.missingCredentialFinalAction.alternateAccountSelected !== false || p.missingCredentialFinalAction.interactivePrompt !== false) return false;
  for (const key of ["refreshFailureSemantics", "invalidCredentialSemantics", "accountRemovalSemantics"]) if (!exactKeys(p[key], ["result", "alternateAccountSelected"]) || p[key].result !== "FAILS_CLOSED" || p[key].alternateAccountSelected !== false) return false;
  if (!exactKeys(p.configRootSemantics, ["surfaces", "explicitAccountWithNone", "crossAccountSubstitution", "pinningRequired"]) || p.configRootSemantics.crossAccountSubstitution !== "PROVEN_NO" || p.configRootSemantics.explicitAccountWithNone !== "NO_OTHER_CONFIG_ACCOUNT" || p.configRootSemantics.pinningRequired !== true) return false;
  if (!exactKeys(p.effectiveCallerContract, ["exactPrincipalOnce", "accountPinnedEveryInvocation", "configurationNone", "overridesSanitized", "missingCredentialFailsClosed", "crossAccountFallbackAbsent"]) || Object.values(p.effectiveCallerContract).some((v) => v !== true)) return false;
  if (p.runtimeImplementationRequirement !== "yes" || !locks(p.sdkSourceLocks)) return false;
  if (!exactKeys(p.privacy, ["rawIdentityPersisted", "rawCredentialPersisted", "overrideValuesPersisted", "rawConfigPersisted", "rawOutputPersisted", "absolutePathPersisted"]) || Object.values(p.privacy).some((v) => v !== false)) return false;
  if (!exactKeys(p.futureAuthorityRequirements, ["m3l3ApprovalGranted", "m4ApprovalGranted", "m3MutationDiagnostic", "newReattestationRequired"]) || p.futureAuthorityRequirements.m3l3ApprovalGranted !== false || p.futureAuthorityRequirements.m4ApprovalGranted !== false || p.futureAuthorityRequirements.m3MutationDiagnostic !== false || p.futureAuthorityRequirements.newReattestationRequired !== true) return false;
  return p.verdict === "P1_5_C2H2E3D_W1C_M3L2_G4R3F_PINNED_ACCOUNT_FALLBACK_PROVEN_FAILS_CLOSED_IMPLEMENTATION_REQUIRED";
}
function sortValue(v) { if (v === null || typeof v === "string" || typeof v === "boolean") return v; if (typeof v === "number" && Number.isFinite(v)) return v; if (Array.isArray(v)) return v.map(sortValue); if (!plain(v)) throw new Error("invalid-canonical-value"); return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])])); }
export function parseG4R3FAttestation(text) { if (typeof text !== "string") return null; try { const p = JSON.parse(text); return validate(p) ? p : null; } catch { return null; } }
export function canonicalizeG4R3FAttestation(p) { if (!validate(p)) throw new Error("invalid-g4r3f-attestation"); return JSON.stringify(sortValue(p)); }
export function computeG4R3FAttestationSha256(p) { return createHash("sha256").update(canonicalizeG4R3FAttestation(p), "utf8").digest("hex"); }
export function verifyG4R3FAttestation(p) { if (!validate(p)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" }); return Object.freeze({ ok: true, code: "PINNED_ACCOUNT_FALLBACK_PROVEN_FAILS_CLOSED", sha256: computeG4R3FAttestationSha256(p) }); }
export const G4R3F_CONTRACT = Object.freeze({ networkAccess: false, processSpawn: false, filesystemWrite: false, productionAccess: false, rawCredentialPersistence: false });
