import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFirestoreEmulatorOnly,
  FirestoreEmulatorGuardError,
} from "../src/runtime/firestoreEmulatorGuard.js";

const DEMO_PROJECT = "demo-myweb-trusted-backend";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    MYWEB_TRUSTED_BACKEND_MODE: "emulator",
    GCLOUD_PROJECT: DEMO_PROJECT,
    FUNCTIONS_EMULATOR: "true",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8084",
    ...overrides,
  };
}

function expectCode(overrides: Record<string, string | undefined>, code: string) {
  assert.throws(
    () => assertFirestoreEmulatorOnly({ env: validEnv(overrides) }),
    (error: unknown) => error instanceof FirestoreEmulatorGuardError && error.code === code,
  );
}

test("Firestore guard allows loopback demo Emulator", () => {
  assert.equal(assertFirestoreEmulatorOnly({ env: validEnv() }).demoProject, true);
});

for (const host of ["127.0.0.1:8084", "localhost:8084"]) {
  test(`Firestore guard accepts loopback host ${host}`, () => {
    assert.equal(assertFirestoreEmulatorOnly({ env: validEnv({ FIRESTORE_EMULATOR_HOST: host }) }).mode, "emulator");
  });
}

test("Firestore guard rejects missing mode", () => {
  expectCode({ MYWEB_TRUSTED_BACKEND_MODE: undefined }, "FIRESTORE_MODE_NOT_EMULATOR");
});

test("Firestore guard rejects production mode", () => {
  expectCode({ MYWEB_TRUSTED_BACKEND_MODE: "production" }, "FIRESTORE_MODE_NOT_EMULATOR");
});

test("Firestore guard rejects missing project", () => {
  expectCode({ GCLOUD_PROJECT: undefined }, "FIRESTORE_PROJECT_ID_MISSING");
});

test("Firestore guard rejects non-demo project", () => {
  expectCode({ GCLOUD_PROJECT: "sample-production-project" }, "FIRESTORE_PROJECT_ID_NOT_DEMO");
});

test("Firestore guard rejects credential environment", () => {
  expectCode({ GOOGLE_APPLICATION_CREDENTIALS: "fixture-only" }, "FIRESTORE_CREDENTIAL_ENV_BLOCKED");
});

for (const host of [undefined, "example.invalid:8084", "192.168.0.2:8084", "[::1]:8084", "http://127.0.0.1:8084", "localhost:65536"]) {
  test(`Firestore guard rejects unsafe host ${String(host)}`, () => {
    expectCode({ FIRESTORE_EMULATOR_HOST: host }, "FIRESTORE_EMULATOR_REQUIRED");
  });
}

test("Firestore guard ignores client supplied project", () => {
  const options = {
    env: validEnv({ GCLOUD_PROJECT: undefined }),
    clientProjectId: DEMO_PROJECT,
  } as unknown as Parameters<typeof assertFirestoreEmulatorOnly>[0];
  assert.throws(
    () => assertFirestoreEmulatorOnly(options),
    (error: unknown) => error instanceof FirestoreEmulatorGuardError
      && error.code === "FIRESTORE_PROJECT_ID_MISSING",
  );
});
