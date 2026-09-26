import assert from "node:assert/strict";
import test from "node:test";
import type { App } from "firebase-admin/app";
import {
  AdminFirestoreBoundaryError,
  createTrustedAdminFirestoreGetter,
} from "../src/runtime/adminFirestore.js";

const context = Object.freeze({
  projectId: "demo-myweb-trusted-backend",
  mode: "emulator" as const,
  demoProject: true as const,
  projectSource: "test",
});

function fakeApp(projectId: string = context.projectId): App {
  return { name: "fixture-app", options: { projectId } } as App;
}

test("Firestore getter calls guard before getFirestore", () => {
  const order: string[] = [];
  const getter = createTrustedAdminFirestoreGetter({
    assertGuard: () => { order.push("guard"); return context; },
    getApps: () => [],
    initializeApp: () => { order.push("app"); return fakeApp(); },
    getFirestore: () => { order.push("firestore"); return {} as never; },
  });
  getter();
  assert.deepEqual(order, ["guard", "app", "firestore"]);
});

test("Firestore guard failure prevents app and Firestore access", () => {
  let accessCount = 0;
  const getter = createTrustedAdminFirestoreGetter({
    assertGuard: () => { throw new Error("guard"); },
    getApps: () => { accessCount += 1; return []; },
    initializeApp: () => { accessCount += 1; return fakeApp(); },
    getFirestore: () => { accessCount += 1; return {} as never; },
  });
  assert.throws(() => getter());
  assert.equal(accessCount, 0);
});

test("Firestore getter reuses matching Admin app", () => {
  const existing = fakeApp();
  let initializeCount = 0;
  const getter = createTrustedAdminFirestoreGetter({
    assertGuard: () => context,
    getApps: () => [existing],
    initializeApp: () => { initializeCount += 1; return fakeApp(); },
    getFirestore: () => ({} as never),
  });
  assert.equal(getter().app, existing);
  assert.equal(initializeCount, 0);
});

test("Firestore getter rejects an existing different-project app", () => {
  let firestoreCount = 0;
  const getter = createTrustedAdminFirestoreGetter({
    assertGuard: () => context,
    getApps: () => [fakeApp("demo-other-project")],
    initializeApp: () => fakeApp(),
    getFirestore: () => { firestoreCount += 1; return {} as never; },
  });
  assert.throws(
    () => getter(),
    (error: unknown) => error instanceof AdminFirestoreBoundaryError,
  );
  assert.equal(firestoreCount, 0);
});

test("module construction alone performs no Firestore access", () => {
  let firestoreCount = 0;
  createTrustedAdminFirestoreGetter({
    assertGuard: () => context,
    getApps: () => [],
    initializeApp: () => fakeApp(),
    getFirestore: () => { firestoreCount += 1; return {} as never; },
  });
  assert.equal(firestoreCount, 0);
});
