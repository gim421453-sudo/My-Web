import type { Auth, UserRecord } from "firebase-admin/auth";
import { getTrustedAdminAuth } from "../runtime/adminApp.js";

export type TrustedAuthAdminErrorCode = "USER_NOT_FOUND" | "AUTH_MUTATION_FAILED";

export class TrustedAuthAdminError extends Error {
  readonly code: TrustedAuthAdminErrorCode;

  constructor(code: TrustedAuthAdminErrorCode) {
    super(code);
    this.name = "TrustedAuthAdminError";
    this.code = code;
  }
}

export interface TrustedAuthUser {
  readonly uid: string;
  readonly disabled: boolean;
}

export interface TrustedAuthAdmin {
  getUser(uid: string): Promise<TrustedAuthUser>;
  setDisabled(uid: string, disabled: boolean): Promise<TrustedAuthUser>;
  revokeRefreshTokens(uid: string): Promise<void>;
  deleteUser(uid: string): Promise<void>;
}

function normalizeUser(user: UserRecord): TrustedAuthUser {
  return Object.freeze({ uid: user.uid, disabled: user.disabled === true });
}

function isMissingUser(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error
    && (error as { code?: unknown }).code === "auth/user-not-found");
}

async function safeAuthCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new TrustedAuthAdminError(isMissingUser(error) ? "USER_NOT_FOUND" : "AUTH_MUTATION_FAILED");
  }
}

export function createTrustedAuthAdmin(auth: Auth): TrustedAuthAdmin {
  return Object.freeze({
    getUser: (uid: string) => safeAuthCall(async () => normalizeUser(await auth.getUser(uid))),
    setDisabled: (uid: string, disabled: boolean) => safeAuthCall(
      async () => normalizeUser(await auth.updateUser(uid, { disabled })),
    ),
    revokeRefreshTokens: (uid: string) => safeAuthCall(() => auth.revokeRefreshTokens(uid)),
    deleteUser: (uid: string) => safeAuthCall(() => auth.deleteUser(uid)),
  });
}

export function getEmulatorTrustedAuthAdmin(): TrustedAuthAdmin {
  return createTrustedAuthAdmin(getTrustedAdminAuth().auth);
}
