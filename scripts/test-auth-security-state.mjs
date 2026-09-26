import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const resolver = require(resolve(root, "shared/authSecurityState.js"));
const appSource = readFileSync(resolve(root, "app.js"), "utf8");
const providerSource = readFileSync(resolve(root, "src/auth/AuthProvider.tsx"), "utf8");
const authServiceSource = readFileSync(resolve(root, "services/authService.js"), "utf8");
const rulesSource = readFileSync(resolve(root, "firestore.rules"), "utf8");
const tests = [];

function test(name, run) {
  tests.push([name, run]);
}

function resolveReady(overrides = {}) {
  return resolver.resolve({
    firebaseUser: { uid: "redacted", emailVerified: true },
    userProfile: { status: "active" },
    profileStatus: "ready",
    membershipStatus: "not_applicable",
    policy: { phase: "observe" },
    ...overrides,
  });
}

test("Firebase verified wins over Firestore false", () => {
  assert.equal(resolveReady({ userProfile: { emailVerified: false } }).emailVerified, true);
});

test("Firebase unverified wins over Firestore true", () => {
  assert.equal(resolveReady({
    firebaseUser: { uid: "redacted", emailVerified: false },
    userProfile: { emailVerified: true },
  }).emailVerified, false);
});

test("Firestore email metadata cannot change security state", () => {
  const first = resolveReady({ userProfile: { emailVerified: false } });
  const second = resolveReady({ userProfile: { emailVerified: true } });
  assert.equal(first.emailVerified, second.emailVerified);
});

test("profile identity boolean is untrusted", () => {
  const state = resolveReady({ userProfile: { identityVerified: true } });
  assert.equal(state.identity.status, "not_configured");
  assert.equal(state.identity.trusted, false);
});

test("profile MFA boolean is untrusted", () => {
  const state = resolveReady({ userProfile: { mfaVerified: true } });
  assert.equal(state.mfa.enrollmentStatus, "not_configured");
  assert.equal(state.mfa.trusted, false);
});

test("client reauthenticated boolean is untrusted", () => {
  const state = resolveReady({ userProfile: { reauthenticated: true } });
  assert.equal(state.reauth.status, "not_configured");
  assert.equal(state.reauth.trusted, false);
});

test("missing Firebase user is signed out", () => {
  assert.equal(resolveReady({ firebaseUser: null }).gate, "SIGNED_OUT");
});

test("authenticated profile loading remains explicit", () => {
  const state = resolveReady({ userProfile: null, profileStatus: "loading" });
  assert.equal(state.profile.status, "loading");
  assert.equal(state.gate, "UNKNOWN_SECURITY_STATE");
});

test("missing required membership is not workspace ready", () => {
  const state = resolveReady({ workspaceRequired: true, membershipStatus: "missing" });
  assert.equal(state.workspaceReady, false);
});

test("disabled membership is blocked", () => {
  const state = resolveReady({ workspaceRequired: true, membershipStatus: "disabled" });
  assert.equal(state.gate, "MEMBERSHIP_DISABLED");
});

test("canonical system owner registry preserves owner authority", () => {
  const state = resolveReady({
    systemOwnerRecord: { exists: true, status: "active" },
    workspaceRequired: true,
    membershipStatus: "not_applicable",
  });
  assert.equal(state.role.isSystemOwner, true);
  assert.equal(state.workspaceReady, true);
});

test("users role alone cannot grant system owner", () => {
  const state = resolveReady({ userProfile: { role: "system_owner", globalRole: "system_owner" } });
  assert.equal(state.role.isSystemOwner, false);
});

test("app-next keeps admin refresh observer and explicit-only signout", () => {
  assert.match(providerSource, /onAuthStateChanged\(auth/);
  assert.match(providerSource, /const signOut = useCallback/);
  assert.equal((providerSource.match(/await firebaseSignOut\(auth\)/g) || []).length, 1);
});

test("profile permission denied does not trigger automatic signout", () => {
  const state = resolveReady({ profileStatus: "permission_denied" });
  assert.equal(state.gate, "PROFILE_BLOCKED");
  const errorBranch = providerSource.slice(providerSource.indexOf("void loadCurrentSession"), providerSource.indexOf("const signInWithEmail"));
  assert.equal(errorBranch.includes("firebaseSignOut"), false);
});

test("observe phase does not enforce absent MFA or identity", () => {
  const state = resolveReady({
    firebaseUser: { uid: "redacted", emailVerified: false },
    policy: { phase: "observe", emailPolicy: "observe", identityPolicy: "observe", mfaPolicy: "observe" },
  });
  assert.equal(state.gate, "READY");
  assert.equal(state.ready, true);
  assert.equal(state.securityReady, false);
});

test("diagnostics exclude identifiers and credentials", () => {
  const state = resolveReady({
    firebaseUser: { uid: "sensitive-uid", email: "person@example.com", emailVerified: true },
    userProfile: { token: "sensitive-token", workspaceId: "ws_sensitive" },
  });
  resolver.record(state);
  const text = JSON.stringify(resolver.diagnosticsSnapshot());
  assert.equal(text.includes("sensitive-uid"), false);
  assert.equal(text.includes("person@example.com"), false);
  assert.equal(text.includes("sensitive-token"), false);
  assert.equal(text.includes("ws_sensitive"), false);
});

test("main admin and app-next use the same resolver enum contract", () => {
  assert.match(appSource, /PMAuthSecurityState/);
  assert.match(providerSource, /resolveAuthSecurityState/);
  assert.equal(resolveReady().gate, "READY");
});

test("operational resolver receives an explicit canonical owner result", () => {
  const start = appSource.indexOf("function recordOperationalAuthSecurityStateV162");
  const end = appSource.indexOf("function syncFirebaseUserToLocalAuthV33", start);
  const helper = appSource.slice(start, end);
  assert.match(helper, /authority\.systemOwnerVerified === true/);
  assert.match(helper, /firebaseUser\.pmRole === "system_owner"/);
  assert.equal(helper.includes("user.isSystemOwnerResolved === true"), false);
  assert.match(appSource, /systemOwnerVerified: ownerByRegistry/);
});

test("operational profile listeners never trust Firestore emailVerified", () => {
  assert.equal(appSource.includes("currentUser.emailVerified = data.emailVerified"), false);
  assert.match(appSource, /firebaseAuthUser\?\.emailVerified === true/);
});

test("local dev source cannot become Firebase authenticated or system owner", () => {
  const state = resolveReady({
    securitySource: "local-dev",
    firebaseUser: { uid: "local", emailVerified: true },
    userProfile: { role: "system_owner", identityVerified: true, mfaVerified: true },
    systemOwnerRecord: { exists: true, status: "active" },
  });
  assert.equal(state.primaryAuthenticated, false);
  assert.equal(state.role.isSystemOwner, false);
  assert.equal(state.identity.trusted, false);
  assert.equal(state.mfa.trusted, false);
});

test("local dev password authority is unavailable outside localhost", () => {
  assert.match(authServiceSource, /hostname === "localhost" \|\| hostname === "127\.0\.0\.1"/);
  assert.match(authServiceSource, /if \(!isLocalDevAuthAllowed\(\)\) return false/);
  assert.match(authServiceSource, /role === "system_owner" \? "normal"/);
});

test("Rules self-update allowlist excludes email and future security authority fields", () => {
  const selfUpdate = rulesSource.slice(
    rulesSource.indexOf("function selfUserUpdateAllowed"),
    rulesSource.indexOf("function adminUserActivationAllowed"),
  );
  assert.equal(selfUpdate.includes('"emailVerified"'), false);
  assert.equal(selfUpdate.includes('"identityVerified"'), false);
  assert.equal(selfUpdate.includes('"mfaVerified"'), false);
});

let passed = 0;
for (const [name, run] of tests) {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`Auth security state tests: ${passed}/${tests.length} passed`);
