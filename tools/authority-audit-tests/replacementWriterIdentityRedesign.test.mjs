import assert from "node:assert/strict";
import {
  FAILED_G2_ACCOUNT_ID,
  REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID,
  REPLACEMENT_WRITER_IDENTITY_REDESIGN_CONTRACT,
  isProviderCompatibleServiceAccountId,
} from "../authority-audit/replacementWriterIdentityRedesign.mjs";

assert.equal(FAILED_G2_ACCOUNT_ID.length, 31);
assert.equal(isProviderCompatibleServiceAccountId(FAILED_G2_ACCOUNT_ID), false);
assert.equal(REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID.length, 25);
assert.equal(isProviderCompatibleServiceAccountId(REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID), true);
assert.equal(REPLACEMENT_WRITER_IDENTITY_REDESIGN_CONTRACT.candidateAvailabilityAsserted, false);
assert.equal(REPLACEMENT_WRITER_IDENTITY_REDESIGN_CONTRACT.m3Allowed, false);
console.log("replacement writer identity redesign matrix passed; remote operations=0");
