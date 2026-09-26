import { randomUUID } from "node:crypto";
import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import { getTrustedAdminAuth } from "../runtime/adminApp.js";
import {
  normalizeVerifiedActorError,
  VerifiedActorError,
} from "./authErrors.js";
import { extractBearerToken, type BearerTokenRequest } from "./bearerToken.js";

export const VERIFIED_ACTOR_CONTRACT_VERSION = "tb02";

export type MfaEvidence = "present" | "absent" | "unknown";

export interface VerifiedActor {
  uid: string;
  auth: Readonly<{
    tokenVerified: true;
    authTime: number | null;
    issuedAt: number | null;
    expiresAt: number | null;
    emailVerified: boolean;
    disabled: false;
    provider: string | null;
    mfaEvidence: MfaEvidence;
  }>;
  authority: Readonly<{
    uidSource: "firebase-auth";
    emailVerifiedSource: "firebase-auth";
    disabledSource: "firebase-auth";
    mfaSource: "firebase-auth-token";
  }>;
  request: Readonly<{
    requestId: string;
  }>;
  authorizationStatus: "unresolved";
}

export interface VerifiedActorOptions {
  requireEmailVerified?: boolean;
}

export interface VerifiedActorAuth {
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
  getUser(uid: string): Promise<UserRecord>;
}

export interface VerifiedActorDependencies {
  getAuth(): VerifiedActorAuth;
  createRequestId(): string;
}

const defaultDependencies: VerifiedActorDependencies = Object.freeze({
  getAuth: () => getTrustedAdminAuth().auth,
  createRequestId: () => randomUUID(),
});

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mfaEvidence(decoded: DecodedIdToken): MfaEvidence {
  if (!decoded.firebase || typeof decoded.firebase !== "object") return "unknown";
  return typeof decoded.firebase.sign_in_second_factor === "string"
    && decoded.firebase.sign_in_second_factor.trim()
    ? "present"
    : "absent";
}

function provider(decoded: DecodedIdToken): string | null {
  const value = decoded.firebase?.sign_in_provider;
  return typeof value === "string" && value.trim() ? value : null;
}

export async function verifyActorFromRequest(
  request: BearerTokenRequest,
  options: VerifiedActorOptions = {},
  dependencies: VerifiedActorDependencies = defaultDependencies,
): Promise<VerifiedActor> {
  const requestId = dependencies.createRequestId();
  const token = extractBearerToken(request, requestId);

  try {
    const auth = dependencies.getAuth();
    const decoded = await auth.verifyIdToken(token, true);
    const uid = typeof decoded.uid === "string" ? decoded.uid.trim() : "";
    if (!uid) throw new VerifiedActorError("AUTH_TOKEN_INVALID", requestId);

    const user = await auth.getUser(uid);
    if (user.disabled) throw new VerifiedActorError("AUTH_ACCOUNT_DISABLED", requestId);
    if (options.requireEmailVerified === true && user.emailVerified !== true) {
      throw new VerifiedActorError("AUTH_EMAIL_UNVERIFIED", requestId);
    }

    return Object.freeze({
      uid,
      auth: Object.freeze({
        tokenVerified: true,
        authTime: finiteNumber(decoded.auth_time),
        issuedAt: finiteNumber(decoded.iat),
        expiresAt: finiteNumber(decoded.exp),
        emailVerified: user.emailVerified === true,
        disabled: false,
        provider: provider(decoded),
        mfaEvidence: mfaEvidence(decoded),
      }),
      authority: Object.freeze({
        uidSource: "firebase-auth",
        emailVerifiedSource: "firebase-auth",
        disabledSource: "firebase-auth",
        mfaSource: "firebase-auth-token",
      }),
      request: Object.freeze({ requestId }),
      authorizationStatus: "unresolved",
    });
  } catch (error) {
    throw normalizeVerifiedActorError(error, requestId);
  }
}
