import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R3_PARSER_ATTESTATION_SCHEMA = "myweb.m3l3.r3.canonical-policy-parser-attestation.v1";

const LOCKS = Object.freeze([
  Object.freeze({ path: "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs", sha256: "33a887e60c57383c7b53448a84c63252f7772210e043844f10a8611ba633a7cd" }),
  Object.freeze({ path: "tools/authority-audit-tests/m3l3R3CanonicalPolicyParser.test.mjs", sha256: "fdab61b473300a8827b86bdf7d105bd928f6837d0c1829ca91a17c6d50d7df26" }),
  Object.freeze({ path: "tools/authority-audit/m3l3R3CanonicalPolicyRecoveryExecutor.mjs", sha256: "7328e4ff13c7018ddd415c2e51961d8e05f40d3f0612e8405e232dd29b239427" }),
  Object.freeze({ path: "tools/authority-audit-tests/m3l3R3CanonicalPolicyRecoveryExecutor.test.mjs", sha256: "4d351e3d7f381503f0d033591b35c1efb637565bf802f993af7cd513fd08efff" }),
  Object.freeze({ path: "functions/node_modules/google-gax/build/protos/google/iam/v1/policy.proto", sha256: "a99431edb515842806fcedc699572f40757c751f84e793242c336c7ca2a91292" }),
  Object.freeze({ path: "functions/node_modules/proto3-json-serializer/build/src/toproto3json.js", sha256: "43bb37516120e264f6bc1524eedb3c658f166c06e3660390e6d9958d46a8ef02" }),
]);

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
const exact = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));

export function buildM3L3R3CanonicalPolicyParserAttestation() {
  return {
    schema: M3L3_R3_PARSER_ATTESTATION_SCHEMA,
    supersedesPreliminaryR3Packet: true,
    authority: {
      r2EvidenceSha256: "607db23fc03c830d14f9da9e8241a6629ee6cd967cd64b44d6e99d16ad431fae",
      r2ResultDocumentSha256: "106fab9b3cbc583dd3bff9f97f46b7db7962f16154f79c001d908e7a45566309",
      r2PacketSha256: "5ae22bdf0fcfb8d44e62eedda3a65c88f38282bb80d2dca90271012bd4b3d9f4",
      rf1AttestationSha256: "a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9",
      currentM3State: "READ_FAILURE",
    },
    localProof: {
      policyBindingsProtoField: "REPEATED",
      serializerEmptyRepeatedArray: "OMITTED",
      omittedBindingsAcceptance: "VALID_ETAG_POLICY_ONLY",
      genericEmptyObject: "REJECTED",
      arbitraryJson: "REJECTED",
    },
    sourceLocks: LOCKS.map((entry) => ({ ...entry })),
    resultDomain: ["PRESENT_CONFIRMED", "ZERO_BINDINGS_ABSENT", "MEMBER_ABSENT", "AMBIGUOUS", "READ_FAILURE", "IDENTITY_FAILURE"],
    budget: { localIdentityDiscoveryMax: 1, writerSaGetIamPolicyReadsMax: 1, projectIamReadsMax: 0, retriesMax: 0, mutationsMax: 0, tokenCallsMax: 0, firestoreCallsMax: 0, loggingCallsMax: 0, testIamPermissionsMax: 0, serviceAccountKeyOperationsMax: 0 },
    privacy: { rawPolicyPersisted: false, rawIdentityPersisted: false, rawMemberPersisted: false, rawEtagPersisted: false, rawConditionPersisted: false, rawProcessOutputPersisted: false, tokenPersisted: false },
    execution: { approved: false, executed: false, remoteCalls: 0, mutations: 0 },
  };
}

export function canonicalizeM3L3R3CanonicalPolicyParserAttestation(payload) {
  if (!exact(payload, buildM3L3R3CanonicalPolicyParserAttestation())) throw new Error("invalid-r3-parser-attestation");
  return JSON.stringify(stable(payload));
}

export function computeM3L3R3CanonicalPolicyParserAttestationSha256(payload) {
  return hash(canonicalizeM3L3R3CanonicalPolicyParserAttestation(payload));
}

export function verifyM3L3R3CanonicalPolicyParserAttestation(payload, { repositoryRoot = process.cwd() } = {}) {
  if (!exact(payload, buildM3L3R3CanonicalPolicyParserAttestation())) return Object.freeze({ ok: false, code: "INVALID_R3_PARSER_ATTESTATION" });
  if (!LOCKS.every((lock) => hash(readFileSync(resolve(repositoryRoot, lock.path))) === lock.sha256)) {
    return Object.freeze({ ok: false, code: "R3_PARSER_SOURCE_LOCK_DRIFT" });
  }
  return Object.freeze({ ok: true, code: "R3_CANONICAL_POLICY_PARSER_ATTESTED", sha256: computeM3L3R3CanonicalPolicyParserAttestationSha256(payload) });
}
