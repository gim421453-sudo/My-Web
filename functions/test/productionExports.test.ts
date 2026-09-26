import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import * as productionExports from "../src/index.js";
import { verifyActorFromRequest } from "../src/auth/verifiedActor.js";

const exportNames = Object.keys(productionExports);
const sourceEntry = readFileSync(new URL("../../src/index.ts", import.meta.url), "utf8");
const compiledEntry = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

test("production entry exports trustedBackendHealth", () => {
  assert.equal(typeof productionExports.trustedBackendHealth, "function");
});

test("production entry excludes actor probe", () => {
  assert.equal(exportNames.includes("trustedBackendActorProbe"), false);
});

test("production entry excludes verified-email probe", () => {
  assert.equal(exportNames.includes("trustedBackendVerifiedEmailProbe"), false);
});

for (const forbidden of ["Probe", "Debug", "Dev", "Test"]) {
  test(`production exports contain no ${forbidden} symbol`, () => {
    assert.equal(exportNames.some((name) => name.includes(forbidden)), false);
  });
}

test("source and compiled production entries contain no probe registration", () => {
  assert.doesNotMatch(sourceEntry, /verifiedActorProbe|trustedBackendActorProbe|trustedBackendVerifiedEmailProbe/);
  assert.doesNotMatch(compiledEntry, /verifiedActorProbe|trustedBackendActorProbe|trustedBackendVerifiedEmailProbe/);
});

test("clean build removes the deployable probe wrapper artifact", () => {
  assert.equal(existsSync(new URL("../src/auth/verifiedActorProbe.js", import.meta.url)), false);
});

test("VerifiedActor core remains directly importable by the test harness", () => {
  assert.equal(typeof verifyActorFromRequest, "function");
});
