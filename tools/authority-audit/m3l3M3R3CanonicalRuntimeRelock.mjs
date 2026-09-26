import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildM3CommandGraph } from "./m3RuntimeCommandGraph.mjs";

const OLD_COMPOSITE = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-execution-composite-v1.json";
const R3_EVIDENCE = "29c9f7727155318c8d93b1adeed854713ee0c865c3a5a6db552d9d74f370beeb";
const R3_PARSER_ATTESTATION = "a455d5df0210395c4c8625e5774384838ffcd8980f3e46321af03c28e6735455";
const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const stable = (value) => value && typeof value === "object"
  ? Array.isArray(value) ? value.map(stable) : Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  : value;

function lockEntry(repositoryRoot, path) {
  return Object.freeze({ path, sha256: hash(readFileSync(resolve(repositoryRoot, path))) });
}

export function buildM3L3M3R3CanonicalRuntimeRelock({ repositoryRoot = process.cwd() } = {}) {
  const historical = JSON.parse(readFileSync(resolve(repositoryRoot, OLD_COMPOSITE), "utf8"));
  const graph = buildM3CommandGraph();
  const repositoryPaths = [...new Set([
    ...historical.sourceLocks.map((entry) => entry.path),
    "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  ])].sort();
  const node = (id) => graph.nodes.find((entry) => entry.id === id);
  const prestate = graph.nodes.filter((entry) => ["ROLE_STAGE1", "ROLE_CANONICAL", "OP_B", "OP_C_PRE", "OP_D_PRE"].includes(entry.id));
  const poststate = graph.nodes.filter((entry) => ["OP_C_POST", "OP_D_POST"].includes(entry.id));
  return Object.freeze({
    schema: "myweb.m3l3.m3-r3.canonical-runtime-relock.v1",
    historicalAuthority: Object.freeze({ g4r3hR2: "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc", g4r3r1: "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9", g4r3r2: "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195" }),
    recoveryAuthority: Object.freeze({ r3Evidence: R3_EVIDENCE, r3ParserAttestation: R3_PARSER_ATTESTATION }),
    canonicalRuntimeIntegration: Object.freeze({ prestate: true, poststate: true, legacyM3StateReachability: 0, parserImplementations: 1 }),
    repositoryLocks: Object.freeze(repositoryPaths.map((path) => lockEntry(repositoryRoot, path))),
    graph: Object.freeze({
      nodes: Object.freeze(graph.nodes.map((entry) => entry.id)),
      nodeCount: graph.nodes.length,
      executionEdgeCount: 8,
      metadataEdgeCount: 7,
      identity: hash(JSON.stringify(graph.nodes.map((entry) => ({ id: entry.id, predecessors: entry.predecessorConditions, maxCalls: entry.maxCalls, retryMax: entry.retryMax })))),
    }),
    budget: Object.freeze({
      localIdentityDiscoveryMax: node("OP_A").maxCalls,
      prestateRemoteReadsMax: prestate.reduce((total, entry) => total + entry.maxCalls, 0),
      mutationAttemptsMax: node("OP_E").maxCalls,
      poststateRemoteReadsMax: poststate.reduce((total, entry) => total + entry.maxCalls, 0),
      projectIamReadsMax: node("OP_D_PRE").maxCalls + node("OP_D_POST").maxCalls,
      retriesMax: 0,
      rollbacksMax: 0,
      m4MutationsMax: 0,
      firestoreCallsMax: 0,
      accessTokenCallsMax: 0,
      cloudLoggingReadsMax: 0,
      testIamPermissionsMax: 0,
      serviceAccountKeyOperationsMax: 0,
      allowedProjectIamReadNodes: Object.freeze(["OP_D_PRE", "OP_D_POST"]),
    }),
    invariants: Object.freeze({ mutationMax: 1, retries: 0, rollbacks: 0, secondMutationReachable: false, m4Reachable: false, firestoreReachable: false, tokenReachable: false, canonicalParserFailureFallsBack: false }),
    privacy: Object.freeze({ rawPolicyPersisted: false, rawIdentityPersisted: false, rawMemberPersisted: false, rawOutputPersisted: false }),
  });
}

export function canonicalizeM3L3M3R3CanonicalRuntimeRelock(payload) {
  return JSON.stringify(stable(payload));
}

export function computeM3L3M3R3CanonicalRuntimeRelockSha256(payload) {
  return hash(canonicalizeM3L3M3R3CanonicalRuntimeRelock(payload));
}

export function verifyM3L3M3R3CanonicalRuntimeRelock(payload, { repositoryRoot = process.cwd() } = {}) {
  const expected = buildM3L3M3R3CanonicalRuntimeRelock({ repositoryRoot });
  return canonicalizeM3L3M3R3CanonicalRuntimeRelock(payload) === canonicalizeM3L3M3R3CanonicalRuntimeRelock(expected)
    ? Object.freeze({ ok: true, code: "CANONICAL_RUNTIME_RELOCKED", sha256: computeM3L3M3R3CanonicalRuntimeRelockSha256(payload) })
    : Object.freeze({ ok: false, code: "CANONICAL_RUNTIME_RELOCK_MISMATCH" });
}
