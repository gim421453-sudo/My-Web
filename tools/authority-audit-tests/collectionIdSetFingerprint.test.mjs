import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  COLLECTION_ID_SET_FINGERPRINT_VERSION,
  CollectionIdSetFingerprintError,
  computeCollectionIdSetFingerprintV1,
} from "../authority-audit/collectionIdSetFingerprint.mjs";
import { WORKSPACE2_PAGE1_COLLECTION_IDS } from "./workspace2Page1CollectionIds.fixture.mjs";

const WORKSPACE2_V1_SHA256 = "71ed87d59b7b9f5183e49daecf0cb9bad18be8d138025dd036fbcb4a896ce80b";
const EMPTY_SET_V1_SHA256 = "aff998ddfd9b9bac9eb367b74401723f4c83a7324b61b38d7040c1b857d22ba6";
const LEGACY_NODE_SHA256 = "6ffbc127fa36fdb1541a6bbbdf4c08da86fa2b5669451b59a0fc1ff8014d02c7";
const CULTURE_EDGE_V1_SHA256 = "01f7d51997d93177388a1ccaae452f2c7bdf425c76b7894c69b344ac0e0b1087";

function defaultStringSortV1Like(ids) {
  const payload = [Buffer.from(`${COLLECTION_ID_SET_FINGERPRINT_VERSION}\u0000`, "utf8")];
  for (const id of [...ids].sort()) {
    const bytes = Buffer.from(id, "utf8");
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(bytes.length, 0);
    payload.push(length, bytes);
  }
  return createHash("sha256").update(Buffer.concat(payload)).digest("hex");
}

function expectCode(input, code) {
  assert.throws(
    () => computeCollectionIdSetFingerprintV1(input),
    (error) => error instanceof CollectionIdSetFingerprintError && error.code === code,
  );
}

test("canonical V1 fingerprints the approved Workspace-2 page-one fixture", () => {
  assert.deepEqual(computeCollectionIdSetFingerprintV1(WORKSPACE2_PAGE1_COLLECTION_IDS), {
    version: COLLECTION_ID_SET_FINGERPRINT_VERSION,
    count: 25,
    sha256: WORKSPACE2_V1_SHA256,
  });
});

test("canonical V1 is order-independent and deterministic", () => {
  const reversed = [...WORKSPACE2_PAGE1_COLLECTION_IDS].reverse();
  const first = computeCollectionIdSetFingerprintV1(reversed);
  const second = computeCollectionIdSetFingerprintV1(WORKSPACE2_PAGE1_COLLECTION_IDS);
  const third = computeCollectionIdSetFingerprintV1(reversed);
  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
});

test("canonical V1 uses UTF-8 byte lexical order instead of default string sorting", () => {
  const ids = ["I", "i", "캅", "캇", "a", "채", "z", "\uE000", "\u{10000}"];
  const canonical = computeCollectionIdSetFingerprintV1(ids);
  assert.equal(canonical.sha256, CULTURE_EDGE_V1_SHA256);
  assert.notEqual(canonical.sha256, defaultStringSortV1Like(ids));
});

test("canonical V1 preserves byte-distinct Unicode strings without normalization", () => {
  const composed = "\u00e9";
  const decomposed = "e\u0301";
  const combined = computeCollectionIdSetFingerprintV1([composed, decomposed]);
  assert.equal(combined.count, 2);
  assert.notEqual(combined.sha256, computeCollectionIdSetFingerprintV1([composed]).sha256);
  assert.notEqual(combined.sha256, computeCollectionIdSetFingerprintV1([decomposed]).sha256);
});

test("canonical V1 rejects malformed inputs instead of silently changing a set", () => {
  expectCode("classes", "NON_ARRAY_INPUT");
  expectCode(["classes", 1], "NON_STRING_ID");
  expectCode([""], "EMPTY_ID");
  expectCode(["classes", "classes"], "DUPLICATE_ID");
  expectCode(["\uD800"], "ENCODING_ERROR");
});

test("canonical V1 defines a stable empty set and changes for content differences", () => {
  assert.deepEqual(computeCollectionIdSetFingerprintV1([]), {
    version: COLLECTION_ID_SET_FINGERPRINT_VERSION,
    count: 0,
    sha256: EMPTY_SET_V1_SHA256,
  });
  assert.notEqual(
    computeCollectionIdSetFingerprintV1(["classes"]).sha256,
    computeCollectionIdSetFingerprintV1(["classRegistry"]).sha256,
  );
});

test("legacy Node ordering remains historical evidence and is not V1", () => {
  const legacy = createHash("sha256")
    .update([...WORKSPACE2_PAGE1_COLLECTION_IDS].sort().join("\n"), "utf8")
    .digest("hex");
  assert.equal(legacy, LEGACY_NODE_SHA256);
  assert.notEqual(legacy, WORKSPACE2_V1_SHA256);
});
