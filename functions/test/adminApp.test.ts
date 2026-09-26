import assert from "node:assert/strict";
import test from "node:test";
import type { App } from "firebase-admin/app";
import {
  createTrustedAdminAppInitializer,
  createTrustedAdminAuthGetter,
} from "../src/runtime/adminApp.js";

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

function fakeApp(name = "fixture-app"): App {
  return { name } as App;
}

test("guard failure stops initializeApp", () => {
  let initializeCount = 0;
  const initialize = createTrustedAdminAppInitializer({
    getApps: () => [],
    initializeApp: () => {
      initializeCount += 1;
      return fakeApp();
    },
  });
  assert.throws(() => initialize({ env: validEnv({ GCLOUD_PROJECT: "sample-production-project" }) }));
  assert.equal(initializeCount, 0);
});

test("demo emulator runtime allows initialization", () => {
  let initializeCount = 0;
  const initialize = createTrustedAdminAppInitializer({
    getApps: () => [],
    initializeApp: () => {
      initializeCount += 1;
      return fakeApp();
    },
  });
  const result = initialize({ env: validEnv() });
  assert.equal(result.context.demoProject, true);
  assert.equal(initializeCount, 1);
});

test("existing Admin app prevents duplicate initialization", () => {
  const existing = fakeApp("existing");
  let initializeCount = 0;
  const initialize = createTrustedAdminAppInitializer({
    getApps: () => [existing],
    initializeApp: () => {
      initializeCount += 1;
      return fakeApp();
    },
  });
  assert.equal(initialize({ env: validEnv() }).app, existing);
  assert.equal(initializeCount, 0);
});

test("a recreated initializer reuses the shared Admin app registry", () => {
  const apps: App[] = [];
  let initializeCount = 0;
  const dependencies = {
    getApps: () => apps,
    initializeApp: () => {
      initializeCount += 1;
      const app = fakeApp(`fixture-${initializeCount}`);
      apps.push(app);
      return app;
    },
  };
  createTrustedAdminAppInitializer(dependencies)({ env: validEnv() });
  createTrustedAdminAppInitializer(dependencies)({ env: validEnv() });
  assert.equal(initializeCount, 1);
});

test("Auth resolver runs only after the emulator guard succeeds", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  getTrustedAuth({ env: validEnv() });
  assert.equal(authResolveCount, 1);
});

test("missing Auth Emulator host prevents getAuth", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  assert.throws(() => getTrustedAuth({ env: validEnv({ FIREBASE_AUTH_EMULATOR_HOST: undefined }) }));
  assert.equal(authResolveCount, 0);
});

test("remote Auth Emulator host prevents getAuth", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  assert.throws(() => getTrustedAuth({ env: validEnv({ FIREBASE_AUTH_EMULATOR_HOST: "example.invalid:9098" }) }));
  assert.equal(authResolveCount, 0);
});

test("missing project context prevents getAuth", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  assert.throws(() => getTrustedAuth({ env: validEnv({ GCLOUD_PROJECT: undefined }) }));
  assert.equal(authResolveCount, 0);
});

test("non-demo project prevents getAuth", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  assert.throws(() => getTrustedAuth({ env: validEnv({ GCLOUD_PROJECT: "sample-production-project" }) }));
  assert.equal(authResolveCount, 0);
});

test("credential environment prevents getAuth", () => {
  let authResolveCount = 0;
  const getTrustedAuth = createTrustedAdminAuthGetter(
    createTrustedAdminAppInitializer({
      getApps: () => [],
      initializeApp: () => fakeApp(),
    }),
    () => {
      authResolveCount += 1;
      return { fixture: true } as never;
    },
  );
  assert.throws(() => getTrustedAuth({ env: validEnv({ GOOGLE_APPLICATION_CREDENTIALS: "fixture" }) }));
  assert.equal(authResolveCount, 0);
});
