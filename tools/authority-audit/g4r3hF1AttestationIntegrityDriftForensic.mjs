import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const G4R3H_F1_SCHEMA = "myweb.m3l2.g4r3h-f1.attestation-integrity-drift-forensic.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const safe = (value) => value !== null && typeof value === "object";
const hash = (value) => typeof value === "string" && SHA256.test(value);

function valid(payload) {
  if (!safe(payload) || Array.isArray(payload) || payload.schema !== G4R3H_F1_SCHEMA) return false;
  for (const key of ["historicalReportedG4r3hAttestation", "currentResultDocumentSha256", "literalResultDocumentAttestation", "currentEvidenceRawSha256", "currentPayloadRecomputedAttestation", "builderHash"]) {
    if (!hash(payload[key])) return false;
  }
  return payload.g4r3hArtifactSet?.resultDocumentPath === "docs/p1-5-c2h2e3d-w1c-m3l2-g4r3h-exact-effective-caller-target-member-identity-contract-implementation.md"
    && payload.g4r3hArtifactSet?.evidencePath === "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-exact-effective-caller-identity-implementation-v1.json"
    && payload.comparison?.historicalReported === payload.historicalReportedG4r3hAttestation
    && payload.comparison?.currentPayloadRecomputed === payload.currentPayloadRecomputedAttestation
    && payload.comparison?.resultDocument === payload.literalResultDocumentAttestation
    && payload.original69547Recoverability === "NO_EXISTING_COMPLETE_CANONICAL_INPUT"
    && payload.rootCauseClassification === "MULTIPLE_DRIFTS"
    && payload.recommendedRecoveryOption === "NEW_G4R3H_GENERATION_REQUIRED"
    && payload.currentImplementationSemantics === "PASS"
    && payload.currentCanonicalPayloadInternallyConsistent === true
    && payload.g4r3r1ApprovalEligible === false;
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R3H_F1(text) {
  try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; }
}
export function canonicalizeG4R3H_F1(payload) { if (!valid(payload)) throw new Error("invalid-g4r3h-f1-payload"); return JSON.stringify(sortValue(payload)); }
export function computeG4R3H_F1Sha256(payload) { return createHash("sha256").update(canonicalizeG4R3H_F1(payload), "utf8").digest("hex"); }
export function verifyG4R3H_F1(payload) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_FORENSIC_PAYLOAD" });
  return Object.freeze({ ok: true, code: "FORENSIC_DRIFT_REPRODUCIBLE", sha256: computeG4R3H_F1Sha256(payload) });
}
export function sha256File(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
