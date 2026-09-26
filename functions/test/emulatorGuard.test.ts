import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTrustedBackendEmulatorOnly,
  safeTrustedBackendMetadata,
  TrustedBackendGuardError,
} from "../src/runtime/emulatorGuard.js";

const DEMO_PROJECT = "demo-myweb-trusted-backend";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    MYWEB_TRUSTED_BACKEND_MODE: "emulator",
    GCLOUD_PROJECT: DEMO_PROJECT,
    FUNCTIONS_EMULATOR: "true",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8084",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9098",
    ...overrides,
  };
}

function expectGuardCode(env: Record<string, string | undefined>, code: string) {
  assert.throws(
    () => assertTrustedBackendEmulatorOnly({ env }),
    (error: unknown) => error instanceof TrustedBackendGuardError && error.code === code,
  );
}

test("demo project and emulator mode are allowed", () => {
  const context = assertTrustedBackendEmulatorOnly({ env: validEnv() });
  assert.equal(context.mode, "emulator");
  assert.equal(context.demoProject, true);
});

test("demo project with missing mode is denied", () => {
  expectGuardCode(validEnv({ MYWEB_TRUSTED_BACKEND_MODE: undefined }), "TB_MODE_NOT_EMULATOR");
});

test("demo project with production mode is denied", () => {
  expectGuardCode(validEnv({ MYWEB_TRUSTED_BACKEND_MODE: "production" }), "TB_MODE_NOT_EMULATOR");
});

test("non-demo project with emulator mode is denied", () => {
  expectGuardCode(validEnv({ GCLOUD_PROJECT: "fixture-local-project" }), "TB_PROJECT_ID_NOT_DEMO");
});

test("production-looking project fixture with emulator mode is denied", () => {
  expectGuardCode(validEnv({ GCLOUD_PROJECT: "sample-production-project" }), "TB_PROJECT_ID_NOT_DEMO");
});

test("missing project is denied", () => {
  expectGuardCode(validEnv({ GCLOUD_PROJECT: undefined }), "TB_PROJECT_ID_MISSING");
});

test("empty project is denied", () => {
  expectGuardCode(validEnv({ GCLOUD_PROJECT: "" }), "TB_PROJECT_ID_MISSING");
});

test("malformed Firebase config is denied", () => {
  expectGuardCode(validEnv({ FIREBASE_CONFIG: "{fixture", GCLOUD_PROJECT: undefined }), "TB_FIREBASE_CONFIG_INVALID");
});

test("client supplied project ID is ignored", () => {
  const options = {
    env: validEnv({ GCLOUD_PROJECT: undefined }),
    clientProjectId: DEMO_PROJECT,
  } as unknown as NonNullable<Parameters<typeof assertTrustedBackendEmulatorOnly>[0]>;
  assert.throws(
    () => assertTrustedBackendEmulatorOnly(options),
    (error: unknown) => error instanceof TrustedBackendGuardError
      && error.code === "TB_PROJECT_ID_MISSING",
  );
});

test("service credential environment is blocked", () => {
  expectGuardCode(validEnv({ GOOGLE_APPLICATION_CREDENTIALS: "fixture-only" }), "TB_CREDENTIAL_ENV_BLOCKED");
});

test("safe metadata never exposes the project ID", () => {
  const text = JSON.stringify(safeTrustedBackendMetadata({ env: validEnv() }));
  assert.equal(text.includes(DEMO_PROJECT), false);
  assert.equal(text.includes("projectId"), false);
  assert.equal(text.includes("credentialEnvironmentPresent"), true);
});

test("unknown mode fails closed", () => {
  expectGuardCode(validEnv({ MYWEB_TRUSTED_BACKEND_MODE: "unknown" }), "TB_MODE_NOT_EMULATOR");
});

test("Functions Emulator marker is required", () => {
  expectGuardCode(validEnv({ FUNCTIONS_EMULATOR: "false" }), "TB_FUNCTIONS_EMULATOR_REQUIRED");
});

test("Firestore Emulator must use loopback", () => {
  expectGuardCode(validEnv({ FIRESTORE_EMULATOR_HOST: "example.invalid:8084" }), "TB_FIRESTORE_EMULATOR_REQUIRED");
});

test("Auth Emulator must use loopback", () => {
  expectGuardCode(validEnv({ FIREBASE_AUTH_EMULATOR_HOST: "example.invalid:9098" }), "TB_AUTH_EMULATOR_REQUIRED");
});

test("Auth Emulator host is required", () => {
  expectGuardCode(validEnv({ FIREBASE_AUTH_EMULATOR_HOST: undefined }), "TB_AUTH_EMULATOR_REQUIRED");
});

test("Auth Emulator host rejects URL syntax", () => {
  expectGuardCode(validEnv({ FIREBASE_AUTH_EMULATOR_HOST: "http://127.0.0.1:9098" }), "TB_AUTH_EMULATOR_REQUIRED");
});

test("Auth Emulator host rejects malformed and out-of-range ports", () => {
  expectGuardCode(validEnv({ FIREBASE_AUTH_EMULATOR_HOST: "localhost:not-a-port" }), "TB_AUTH_EMULATOR_REQUIRED");
  expectGuardCode(validEnv({ FIREBASE_AUTH_EMULATOR_HOST: "localhost:65536" }), "TB_AUTH_EMULATOR_REQUIRED");
});
