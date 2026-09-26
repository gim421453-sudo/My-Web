(function attachAuthSecurityState(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PMAuthSecurityState = api;
  root.PMAuthSecurityDiagnostics = {
    snapshot: api.diagnosticsSnapshot,
  };
})(typeof globalThis !== "undefined" ? globalThis : window, function createAuthSecurityStateApi() {
  const RESOLVER_VERSION = "1";
  const DEFAULT_POLICY = Object.freeze({
    phase: "observe",
    emailPolicy: "observe",
    identityPolicy: "observe",
    mfaPolicy: "observe",
  });
  const AUTHORITY_SOURCES = Object.freeze({
    primaryAuthenticated: "firebase-auth-current-user",
    emailVerified: "firebase-auth-current-user",
    systemOwner: "system-owner-registry",
    workspaceRole: "canonical-membership",
    identity: "trusted-backend-required",
    mfa: "firebase-auth-mfa-or-trusted-backend-required",
    recentReauth: "server-auth-time-and-operation-nonce-required",
  });
  const VALID_PROFILE_STATUSES = new Set(["loading", "ready", "missing", "permission_denied", "error"]);
  const VALID_MEMBERSHIP_STATUSES = new Set([
    "not_applicable",
    "loading",
    "active",
    "pending",
    "missing",
    "disabled",
    "error",
  ]);
  const VALID_IDENTITY_STATUSES = new Set([
    "not_configured",
    "required",
    "pending",
    "verified",
    "rejected",
    "review_required",
    "unknown",
  ]);
  const VALID_MFA_ENROLLMENT_STATUSES = new Set(["not_configured", "required", "enrolled", "unknown"]);
  const VALID_MFA_CHALLENGE_STATUSES = new Set(["not_required", "required", "satisfied", "unknown"]);
  let lastDiagnostics = Object.freeze({
    resolverVersion: RESOLVER_VERSION,
    primaryAuthenticated: false,
    emailVerified: false,
    identityStatus: "not_configured",
    mfaEnrollmentStatus: "not_configured",
    mfaChallengeStatus: "not_required",
    profileStatus: "loading",
    membershipStatus: "not_applicable",
    gate: "SIGNED_OUT",
    policyPhase: "observe",
    securitySource: "firebase",
    authoritySources: AUTHORITY_SOURCES,
  });

  function enumValue(value, allowed, fallback) {
    const normalized = String(value || "").trim().toLowerCase();
    return allowed.has(normalized) ? normalized : fallback;
  }

  function normalizePolicy(policy) {
    const source = policy && typeof policy === "object" ? policy : {};
    const phase = ["observe", "enroll_admins", "enroll_staff", "enroll_students", "enforce_all"]
      .includes(source.phase) ? source.phase : DEFAULT_POLICY.phase;
    const policyValue = (value, fallback) => ["observe", "warn", "enforce"].includes(value) ? value : fallback;
    return {
      phase,
      emailPolicy: policyValue(source.emailPolicy, DEFAULT_POLICY.emailPolicy),
      identityPolicy: policyValue(source.identityPolicy, DEFAULT_POLICY.identityPolicy),
      mfaPolicy: policyValue(source.mfaPolicy, DEFAULT_POLICY.mfaPolicy),
    };
  }

  function profileStatusFor(input, primaryAuthenticated) {
    if (!primaryAuthenticated) return "loading";
    if (input.profileStatus) {
      return enumValue(input.profileStatus, VALID_PROFILE_STATUSES, "error");
    }
    return input.userProfile ? "ready" : "loading";
  }

  function trustedSystemOwner(input, securitySource) {
    if (securitySource !== "firebase") return false;
    const record = input.systemOwnerRecord;
    if (!record || typeof record !== "object") return false;
    const exists = record.exists === true || record.active === true;
    return exists && !["disabled", "revoked", "inactive"].includes(String(record.status || "active"));
  }

  function membershipStatusFor(input, systemOwner) {
    if (input.membershipStatus) {
      return enumValue(input.membershipStatus, VALID_MEMBERSHIP_STATUSES, "error");
    }
    const membership = input.membership;
    if (!membership) return systemOwner || input.workspaceRequired !== true ? "not_applicable" : "missing";
    const status = String(membership.status || "").trim().toLowerCase();
    if (["active", "accepted"].includes(status)) return "active";
    if (["pending", "waiting_approval"].includes(status)) return "pending";
    if (["disabled", "rejected", "revoked"].includes(status)) return "disabled";
    return "missing";
  }

  function trustedIdentityState(input) {
    const result = input.trustedIdentityResult;
    const sourceTrusted = result?.authority === "trusted-backend";
    const status = sourceTrusted
      ? enumValue(result.status, VALID_IDENTITY_STATUSES, "unknown")
      : "not_configured";
    return {
      status,
      trusted: sourceTrusted,
    };
  }

  function trustedMfaState(input) {
    const result = input.trustedMfaResult;
    const sourceTrusted = result?.authority === "firebase-auth-mfa" || result?.authority === "trusted-backend";
    return {
      required: sourceTrusted && result.required === true,
      enrollmentStatus: sourceTrusted
        ? enumValue(result.enrollmentStatus, VALID_MFA_ENROLLMENT_STATUSES, "unknown")
        : "not_configured",
      challengeStatus: sourceTrusted
        ? enumValue(result.challengeStatus, VALID_MFA_CHALLENGE_STATUSES, "unknown")
        : "not_required",
      trusted: sourceTrusted,
    };
  }

  function trustedReauthState(input) {
    const result = input.trustedReauthResult;
    const trusted = result?.authority === "trusted-backend"
      && result?.operationNonceBound === true
      && result?.status === "satisfied";
    return {
      status: trusted ? "satisfied" : "not_configured",
      trusted,
    };
  }

  function gateFor(state) {
    if (!state.primaryAuthenticated) return ["SIGNED_OUT", "primary-auth-required"];
    if (["missing", "permission_denied", "error"].includes(state.profile.status)) {
      return ["PROFILE_BLOCKED", `profile-${state.profile.status}`];
    }
    if (state.profile.status === "loading") return ["UNKNOWN_SECURITY_STATE", "profile-loading"];
    if (state.membership.status === "pending") return ["MEMBERSHIP_PENDING", "membership-pending"];
    if (state.membership.status === "disabled") return ["MEMBERSHIP_DISABLED", "membership-disabled"];
    if (["loading", "missing", "error"].includes(state.membership.status) && state.workspaceRequired) {
      return ["UNKNOWN_SECURITY_STATE", `membership-${state.membership.status}`];
    }
    if (state.policy.emailPolicy === "enforce" && !state.emailVerified) {
      return ["EMAIL_UNVERIFIED", "email-unverified"];
    }
    if (state.policy.identityPolicy === "enforce") {
      if (["pending", "review_required"].includes(state.identity.status)) {
        return ["IDENTITY_PENDING", `identity-${state.identity.status}`];
      }
      if (state.identity.status !== "verified" || !state.identity.trusted) {
        return ["IDENTITY_REQUIRED", `identity-${state.identity.status}`];
      }
    }
    if (state.policy.mfaPolicy === "enforce") {
      if (state.mfa.enrollmentStatus !== "enrolled" || !state.mfa.trusted) {
        return ["MFA_ENROLL_REQUIRED", `mfa-enrollment-${state.mfa.enrollmentStatus}`];
      }
      if (state.mfa.challengeStatus === "required" || state.mfa.challengeStatus === "unknown") {
        return ["MFA_CHALLENGE_REQUIRED", `mfa-challenge-${state.mfa.challengeStatus}`];
      }
    }
    return ["READY", ""];
  }

  function resolveAuthSecurityState(input = {}) {
    const securitySource = input.securitySource === "local-dev" ? "local-dev" : "firebase";
    const firebaseUser = securitySource === "firebase" ? input.firebaseUser : null;
    const primaryAuthenticated = Boolean(firebaseUser);
    const emailVerified = primaryAuthenticated && firebaseUser.emailVerified === true;
    const policy = normalizePolicy(input.policy);
    const isSystemOwner = trustedSystemOwner(input, securitySource);
    const profileStatus = profileStatusFor(input, primaryAuthenticated);
    const membershipStatus = membershipStatusFor(input, isSystemOwner);
    const identity = trustedIdentityState(input);
    const mfa = trustedMfaState(input);
    const reauth = trustedReauthState(input);
    const workspaceRequired = input.workspaceRequired === true;
    const workspaceReady = isSystemOwner || !workspaceRequired || membershipStatus === "active";
    const roleStatus = enumValue(
      input.roleStatus || (isSystemOwner || membershipStatus === "active" ? "ready" : "missing"),
      new Set(["loading", "ready", "missing", "error"]),
      "error",
    );
    const assignmentStatus = enumValue(
      input.assignmentStatus || "not_applicable",
      new Set(["not_applicable", "loading", "ready", "missing", "error"]),
      "error",
    );
    const state = {
      resolverVersion: RESOLVER_VERSION,
      securitySource,
      primary: { status: primaryAuthenticated ? "authenticated" : "signed_out" },
      primaryAuthenticated,
      firebaseAuthenticated: primaryAuthenticated,
      email: { status: emailVerified ? "verified" : "unverified" },
      emailVerified,
      identity,
      mfa,
      profile: { status: profileStatus },
      membership: { status: membershipStatus },
      role: { status: roleStatus, isSystemOwner },
      assignment: { status: assignmentStatus },
      reauth,
      workspaceRequired,
      workspaceReady,
      policy,
      authoritySources: AUTHORITY_SOURCES,
    };
    const [gate, blockReason] = gateFor(state);
    const securityReady = primaryAuthenticated
      && emailVerified
      && identity.trusted
      && identity.status === "verified"
      && mfa.trusted
      && mfa.enrollmentStatus === "enrolled"
      && ["not_required", "satisfied"].includes(mfa.challengeStatus);
    return Object.freeze({
      ...state,
      gate,
      blockReason,
      ready: gate === "READY",
      securityReady,
    });
  }

  function diagnosticsFor(state) {
    return Object.freeze({
      resolverVersion: RESOLVER_VERSION,
      primaryAuthenticated: state.primaryAuthenticated === true,
      emailVerified: state.emailVerified === true,
      identityStatus: String(state.identity?.status || "unknown"),
      mfaEnrollmentStatus: String(state.mfa?.enrollmentStatus || "unknown"),
      mfaChallengeStatus: String(state.mfa?.challengeStatus || "unknown"),
      profileStatus: String(state.profile?.status || "error"),
      membershipStatus: String(state.membership?.status || "error"),
      gate: String(state.gate || "UNKNOWN_SECURITY_STATE"),
      policyPhase: String(state.policy?.phase || "observe"),
      securitySource: String(state.securitySource || "firebase"),
      authoritySources: AUTHORITY_SOURCES,
    });
  }

  function record(state) {
    lastDiagnostics = diagnosticsFor(state || {});
    return lastDiagnostics;
  }

  function diagnosticsSnapshot() {
    return {
      ...lastDiagnostics,
      authoritySources: { ...lastDiagnostics.authoritySources },
    };
  }

  return Object.freeze({
    RESOLVER_VERSION,
    DEFAULT_POLICY,
    AUTHORITY_SOURCES,
    resolve: resolveAuthSecurityState,
    resolveAuthSecurityState,
    record,
    diagnosticsSnapshot,
  });
});
