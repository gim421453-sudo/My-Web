import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";

const secretProvider = { loadOrInitialize: () => ({ state: "READY", secret: randomBytes(32), keyId: randomUUID() }) };
const identity = { exactIamMember: "user:failure-subject@example.invalid" };
const baseStore = { hasAnyAnchor: () => false, create: () => ({ ok: false, code: "ANCHOR_PERSISTENCE_FAILURE" }), load: () => ({ state: "MISSING" }), transition: () => ({ ok: false }) };
assert.equal(prepareG2BFutureM3Anchor({ identityContext: null, secretProvider, store: baseStore }).mutationReachable, false, "identity creation failure");
assert.equal(prepareG2BFutureM3Anchor({ identityContext: identity, secretProvider: { loadOrInitialize: () => ({ state: "INVALID" }) }, store: baseStore }).mutationReachable, false, "secret failure");
assert.equal(prepareG2BFutureM3Anchor({ identityContext: identity, secretProvider, store: baseStore }).mutationReachable, false, "persistence failure");
const rereadFailureStore = { ...baseStore, create: () => ({ ok: true }) };
assert.equal(prepareG2BFutureM3Anchor({ identityContext: identity, secretProvider, store: rereadFailureStore }).mutationReachable, false, "post-persistence reread failure");
console.log("G2B recovery anchor failure matrix passed; mutation reachability=0 on every failure; remote operations=0");
