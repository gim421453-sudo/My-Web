import "../../shared/authSecurityState.js";

export type AuthSecurityGate =
  | "SIGNED_OUT"
  | "EMAIL_UNVERIFIED"
  | "IDENTITY_REQUIRED"
  | "IDENTITY_PENDING"
  | "MFA_ENROLL_REQUIRED"
  | "MFA_CHALLENGE_REQUIRED"
  | "PROFILE_BLOCKED"
  | "MEMBERSHIP_PENDING"
  | "MEMBERSHIP_DISABLED"
  | "READY"
  | "UNKNOWN_SECURITY_STATE";

export interface AuthSecurityState {
  resolverVersion: string;
  securitySource: "firebase" | "local-dev";
  primary: { status: "signed_out" | "authenticated" };
  primaryAuthenticated: boolean;
  firebaseAuthenticated: boolean;
  email: { status: "verified" | "unverified" };
  emailVerified: boolean;
  identity: {
    status: "not_configured" | "required" | "pending" | "verified" | "rejected" | "review_required" | "unknown";
    trusted: boolean;
  };
  mfa: {
    required: boolean;
    enrollmentStatus: "not_configured" | "required" | "enrolled" | "unknown";
    challengeStatus: "not_required" | "required" | "satisfied" | "unknown";
    trusted: boolean;
  };
  profile: { status: "loading" | "ready" | "missing" | "permission_denied" | "error" };
  membership: { status: "not_applicable" | "loading" | "active" | "pending" | "missing" | "disabled" | "error" };
  role: { status: "loading" | "ready" | "missing" | "error"; isSystemOwner: boolean };
  assignment: { status: "not_applicable" | "loading" | "ready" | "missing" | "error" };
  reauth: { status: "not_configured" | "satisfied"; trusted: boolean };
  workspaceRequired: boolean;
  workspaceReady: boolean;
  policy: {
    phase: "observe" | "enroll_admins" | "enroll_staff" | "enroll_students" | "enforce_all";
    emailPolicy: "observe" | "warn" | "enforce";
    identityPolicy: "observe" | "warn" | "enforce";
    mfaPolicy: "observe" | "warn" | "enforce";
  };
  authoritySources: Record<string, string>;
  gate: AuthSecurityGate;
  blockReason: string;
  ready: boolean;
  securityReady: boolean;
}

export interface ResolveAuthSecurityStateInput {
  firebaseUser: { emailVerified?: boolean } | null;
  userProfile?: object | null;
  profileStatus?: AuthSecurityState["profile"]["status"];
  systemOwnerRecord?: { exists?: boolean; active?: boolean; status?: string } | null;
  membership?: { status?: string } | null;
  membershipStatus?: AuthSecurityState["membership"]["status"];
  workspaceRequired?: boolean;
  roleStatus?: AuthSecurityState["role"]["status"];
  assignmentStatus?: AuthSecurityState["assignment"]["status"];
  securitySource?: AuthSecurityState["securitySource"];
  policy?: Partial<AuthSecurityState["policy"]>;
}

interface AuthSecurityStateRuntime {
  resolve(input: ResolveAuthSecurityStateInput): AuthSecurityState;
  record(state: AuthSecurityState): object;
}

declare global {
  interface Window {
    PMAuthSecurityState?: AuthSecurityStateRuntime;
    PMAuthSecurityDiagnostics?: { snapshot(): object };
  }
}

function runtime(): AuthSecurityStateRuntime {
  if (!window.PMAuthSecurityState) {
    throw new Error("AUTH_SECURITY_RESOLVER_UNAVAILABLE");
  }
  return window.PMAuthSecurityState;
}

export function resolveAuthSecurityState(
  input: ResolveAuthSecurityStateInput,
): AuthSecurityState {
  return runtime().resolve(input);
}

export function recordAuthSecurityState(state: AuthSecurityState): void {
  runtime().record(state);
}
