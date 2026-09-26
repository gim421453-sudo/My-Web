import assert from "node:assert/strict";
import test from "node:test";
import {
  createHmacInvitationSecretProvider,
  generateInvitationSecret,
  hashHighEntropyInvitationCode,
} from "../src/invitations/invitationFoundation.js";

test("invitation secret uses high-entropy base64url material", () => {
  const first = generateInvitationSecret();
  const second = generateInvitationSecret();
  assert.match(first.rawCode, /^[A-Za-z0-9_-]{32}$/);
  assert.match(first.codeHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.rawCode, second.rawCode);
  assert.equal(first.codeHash, hashHighEntropyInvitationCode(first.rawCode));
});

for (const weak of ["123456", "INVITE-CODE", "a".repeat(31), "a".repeat(33)]) {
  test(`predictable or malformed invitation code is rejected: ${weak.length}`, () => {
    assert.throws(() => hashHighEntropyInvitationCode(weak), /INVITATION_CODE_ENTROPY_REQUIRED/);
  });
}

test("versioned HMAC derivation is deterministic without persisting the raw code", () => {
  const provider = createHmacInvitationSecretProvider(
    { fixture_v1: "fixture-secret-material-that-is-longer-than-thirty-two-bytes" },
    "fixture_v1",
  );
  const operationIdHash = "a".repeat(64);
  const first = provider.derive("fixture_v1", operationIdHash);
  const replay = provider.derive("fixture_v1", operationIdHash);
  assert.deepEqual(first, replay);
  assert.match(first.rawCode, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(first.codeHash, hashHighEntropyInvitationCode(first.rawCode));
});

test("HMAC provider requires a strong key and a retained key version", () => {
  assert.throws(
    () => createHmacInvitationSecretProvider({ fixture_v1: "short" }, "fixture_v1"),
    /INVITATION_DERIVATION_SECRET_REQUIRED/,
  );
  const provider = createHmacInvitationSecretProvider(
    { fixture_v1: "fixture-secret-material-that-is-longer-than-thirty-two-bytes" },
    "fixture_v1",
  );
  assert.throws(
    () => provider.derive("missing", "a".repeat(64)),
    /INVITATION_SECRET_DERIVATION_FAILED/,
  );
});
