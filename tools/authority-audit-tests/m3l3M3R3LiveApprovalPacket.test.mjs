import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildM3L3M3R3CanonicalRuntimeRelock } from "../authority-audit/m3l3M3R3CanonicalRuntimeRelock.mjs";

const path = "docs/p1-5-c2h2e3d-w1c-m3l3-m3-r3-live-mutation-approval-packet.md";
const packet = readFileSync(path, "utf8");
const relock = buildM3L3M3R3CanonicalRuntimeRelock();
for (const term of [
  "CANONICAL_RUNTIME_INTEGRATION=PASS", "PRESTATE_REMOTE_READS_MAX=5", "MUTATION_ATTEMPTS_MAX=1",
  "POSTSTATE_REMOTE_READS_MAX=2", "PROJECT_IAM_READS_MAX=2", "ALLOWED_PROJECT_IAM_READ_NODES=OP_D_PRE,OP_D_POST",
  "RETRIES=0", "ROLLBACKS=0", "SECOND_MUTATION_REACHABLE=no", "M4_ALLOWED=no", "FIRESTORE_ALLOWED=no", "ACCESS_TOKEN_ALLOWED=no",
]) assert.equal(packet.includes(term), true);
assert.equal(packet.includes(`CURRENT_GRAPH_IDENTITY=${relock.graph.identity}`), true);
assert.equal(/(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*/.test(packet), false);
console.log(`M3-R3 live approval packet passed: ${createHash("sha256").update(packet, "utf8").digest("hex")}; real gcloud=0`);
