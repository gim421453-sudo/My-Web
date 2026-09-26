import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  buildG2BM3NewGenerationAuthorityPreparation,
  verifyG2BM3NewGenerationAuthorityPreparation,
} from "../authority-audit/g2bM3NewGenerationAuthorityPreparation.mjs";

assert.throws(
  () => buildG2BM3NewGenerationAuthorityPreparation({ operationGeneration: randomUUID() }),
  /new-generation-preconditions-not-satisfied/,
);
assert.equal(verifyG2BM3NewGenerationAuthorityPreparation({ packet: { operationGeneration: randomUUID() } }).ok, false);

console.log("G2B new-generation authority preparation is blocked until remote capability accounting is repaired; remote operations=0");
