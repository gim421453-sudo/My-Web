import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildG2BImplementationAttestation,
  buildG2BRuntimeCapabilityAttestation,
  buildG2BFinalExecutionComposite,
  sha256Canonical,
  verifyG2BReattestation,
} from "../authority-audit/g2bM3AuthorityReattestation.mjs";
import { buildG2BM3MutationApprovalPacket, verifyG2BM3MutationApprovalPacket } from "../authority-audit/g2bM3ApprovalPacket.mjs";

const implementation = JSON.parse(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-anchor-implementation-attestation-v1.json", "utf8"));
const runtime = JSON.parse(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-runtime-capability-attestation-v1.json", "utf8"));
const composite = JSON.parse(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-final-execution-composite-v1.json", "utf8"));
assert.deepEqual(implementation, buildG2BImplementationAttestation());
assert.deepEqual(runtime, buildG2BRuntimeCapabilityAttestation());
assert.deepEqual(composite, buildG2BFinalExecutionComposite({ implementation, runtimeCapability: runtime }));
assert.equal(verifyG2BReattestation({ implementation, runtimeCapability: runtime, composite }).ok, true);
assert.equal(sha256Canonical(implementation), "25f32f84878d42c98596dd2988e0f8852131567572eec301d920caa74e88f75f");
assert.equal(sha256Canonical(runtime), "8dacebf79eb5ac64d5af338845411b7cf1690389c8edfeb24c7cfccec851c7bb");
assert.equal(sha256Canonical(composite), "5a41c54073020b4a654db3f2933e50c7bcccb69071bd72bfe0571d738a6e830c");
const packet = buildG2BM3MutationApprovalPacket();
assert.equal(verifyG2BM3MutationApprovalPacket(packet).ok, true);
assert.equal(verifyG2BM3MutationApprovalPacket({ ...packet, recoveryAnchorRequired: false }).ok, false);
assert.equal(verifyG2BM3MutationApprovalPacket({ ...packet, mutationAttemptsMax: 2 }).ok, false);
assert.equal(verifyG2BM3MutationApprovalPacket({ ...packet, m4Allowed: true }).ok, false);
console.log("G2B M3 authority reattestation and approval packet matrix passed; remote operations=0");
