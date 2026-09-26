import type { VerifiedActor } from "../../src/auth/verifiedActor.js";
import type {
  AuthorityDocumentReader,
  AuthorityDocumentSnapshot,
  MembershipSource,
  SystemOwnerSource,
  WorkspaceRole,
} from "../../src/authz/authorizationTypes.js";

export const FIXTURE_UID = "fixture-actor";
export const FIXTURE_WORKSPACE = "fixture-workspace";

export function fixtureActor(uid = FIXTURE_UID): VerifiedActor {
  return Object.freeze({
    uid,
    auth: Object.freeze({
      tokenVerified: true,
      authTime: 1,
      issuedAt: 1,
      expiresAt: 2,
      emailVerified: true,
      disabled: false,
      provider: "password",
      mfaEvidence: "absent",
    }),
    authority: Object.freeze({
      uidSource: "firebase-auth",
      emailVerifiedSource: "firebase-auth",
      disabledSource: "firebase-auth",
      mfaSource: "firebase-auth-token",
    }),
    request: Object.freeze({ requestId: "fixture-request" }),
    authorizationStatus: "unresolved",
  });
}

export function ownerV1(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    status: "active",
    source: "system_bootstrap" satisfies SystemOwnerSource,
    ...overrides,
  };
}

export function membershipV1(
  role: WorkspaceRole = "manager",
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    uid: FIXTURE_UID,
    workspaceId: FIXTURE_WORKSPACE,
    role,
    status: "active",
    disabled: false,
    active: true,
    source: "system_bootstrap" satisfies MembershipSource,
    ...overrides,
  };
}

export function readerFixture(
  snapshot: AuthorityDocumentSnapshot,
  onRead: (path: readonly string[]) => void = () => undefined,
): AuthorityDocumentReader {
  return Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      onRead(pathSegments);
      return snapshot;
    },
  });
}

export function throwingReader(onRead: () => void = () => undefined): AuthorityDocumentReader {
  return Object.freeze({
    async getDocument() {
      onRead();
      throw new Error("fixture-read-failure");
    },
  });
}
