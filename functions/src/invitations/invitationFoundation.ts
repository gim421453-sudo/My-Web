import { createHash, createHmac, randomBytes } from "node:crypto";

export const AUTHORITY_INVITATIONS_COLLECTION = "authorityInvitations";
export const INVITATION_CODE_INDEX_COLLECTION = "invitationCodeIndex";

export interface CanonicalInvitationRecord {
  readonly schemaVersion: 1;
  readonly invitationId: string;
  readonly codeHash: string;
  readonly workspaceId: string;
  readonly targetRole: string;
  readonly status: "active" | "consumed" | "revoked";
  readonly createdByUid: string;
  readonly secretVersion: string;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly expiresAt: unknown;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly revokedAt?: unknown;
  readonly revokedByUid?: string;
  readonly lastRedeemedAt?: unknown;
}

export interface InvitationCodeIndexRecord {
  readonly schemaVersion: 1;
  readonly invitationId: string;
}

export interface InvitationSecretMaterial {
  readonly rawCode: string;
  readonly codeHash: string;
}

export function generateInvitationSecret(): InvitationSecretMaterial {
  const rawCode = randomBytes(24).toString("base64url");
  return Object.freeze({
    rawCode,
    codeHash: hashHighEntropyInvitationCode(rawCode),
  });
}

export function hashHighEntropyInvitationCode(rawCode: string): string {
  if (!/^[A-Za-z0-9_-]{32}$/.test(rawCode)) {
    throw new TypeError("INVITATION_CODE_ENTROPY_REQUIRED");
  }
  return createHash("sha256").update(rawCode, "utf8").digest("hex");
}

export interface InvitationSecretProvider {
  readonly currentVersion: string;
  derive(version: string, operationIdHash: string): InvitationSecretMaterial;
}

export function createHmacInvitationSecretProvider(
  secrets: Readonly<Record<string, string>>,
  currentVersion: string,
): InvitationSecretProvider {
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(currentVersion)) {
    throw new TypeError("INVITATION_SECRET_VERSION_INVALID");
  }
  const entries = Object.entries(secrets);
  if (entries.length === 0 || entries.some(([version, secret]) => (
    !/^[A-Za-z0-9._-]{1,32}$/.test(version)
    || new TextEncoder().encode(secret).length < 32
  ))) {
    throw new TypeError("INVITATION_DERIVATION_SECRET_REQUIRED");
  }
  const keyByVersion = new Map(entries);
  if (!keyByVersion.has(currentVersion)) {
    throw new TypeError("INVITATION_SECRET_VERSION_UNAVAILABLE");
  }
  return Object.freeze({
    currentVersion,
    derive(version: string, operationIdHash: string): InvitationSecretMaterial {
      const secret = keyByVersion.get(version);
      if (!secret || !/^[a-f0-9]{64}$/.test(operationIdHash)) {
        throw new TypeError("INVITATION_SECRET_DERIVATION_FAILED");
      }
      const rawCode = createHmac("sha256", secret)
        .update(`myweb-invitation-v1:${operationIdHash}`, "utf8")
        .digest()
        .subarray(0, 24)
        .toString("base64url");
      return Object.freeze({
        rawCode,
        codeHash: hashHighEntropyInvitationCode(rawCode),
      });
    },
  });
}

export function getEmulatorInvitationSecretProvider(): InvitationSecretProvider {
  const projectId = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "");
  if (!process.env.FIRESTORE_EMULATOR_HOST || !projectId.startsWith("demo-")) {
    throw new TypeError("INVITATION_SECRET_EMULATOR_ONLY");
  }
  const secret = process.env.MYWEB_INVITATION_DERIVATION_SECRET || "";
  return createHmacInvitationSecretProvider({ emulator_v1: secret }, "emulator_v1");
}
