import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveProjectContext,
  safeProjectContextMetadata,
} from "../src/runtime/projectContext.js";

const DEMO_PROJECT = "demo-myweb-trusted-backend";

test("runtime Firebase config is the first project source", () => {
  const context = resolveProjectContext({
    env: {
      FIREBASE_CONFIG: JSON.stringify({ projectId: DEMO_PROJECT }),
      GOOGLE_CLOUD_PROJECT: DEMO_PROJECT,
      GCLOUD_PROJECT: DEMO_PROJECT,
    },
  });
  assert.equal(context.projectId, DEMO_PROJECT);
  assert.equal(context.source, "firebase-config");
  assert.equal(context.conflictingSources, false);
});

test("conflicting runtime project sources fail closed in context", () => {
  const context = resolveProjectContext({
    env: {
      GOOGLE_CLOUD_PROJECT: DEMO_PROJECT,
      GCLOUD_PROJECT: "fixture-conflict-project",
    },
  });
  assert.equal(context.conflictingSources, true);
});

test("explicit test project requires an explicit opt-in", () => {
  const denied = resolveProjectContext({ env: {}, explicitTestProjectId: DEMO_PROJECT });
  assert.equal(denied.projectId, null);
  const allowed = resolveProjectContext({
    env: {},
    explicitTestProjectId: DEMO_PROJECT,
    allowExplicitTestContext: true,
  });
  assert.equal(allowed.source, "explicit-test");
});

test("malformed Firebase config does not fall back silently", () => {
  const context = resolveProjectContext({
    env: { FIREBASE_CONFIG: "not-json", GCLOUD_PROJECT: DEMO_PROJECT },
  });
  assert.equal(context.malformedFirebaseConfig, true);
});

test("safe context metadata contains no project value", () => {
  const context = resolveProjectContext({ env: { GCLOUD_PROJECT: DEMO_PROJECT } });
  const text = JSON.stringify(safeProjectContextMetadata(context));
  assert.equal(text.includes(DEMO_PROJECT), false);
  assert.equal(text.includes("projectId"), false);
});
