import type { UserRecord } from "firebase-admin/auth";
import type { VerifiedActor } from "../auth/verifiedActor.js";
import { getTrustedAdminAuth } from "../runtime/adminApp.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import {
  requiredString,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
} from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import {
  executeIdempotentAuthorityOperation,
  type AuthorityOperationExecutionResult,
} from "../operations/operationExecutor.js";
import { securityAuditMutation } from "../operations/securityAuditRepository.js";
import {
  getEmulatorTransactionRunner,
  type TrustedTransactionRunner,
} from "../repositories/trustedTransaction.js";

interface CreateProfilePayload extends CanonicalObject {
  readonly displayName: string | null;
}

export interface UserProfileOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
  readonly getAuthUser?: (uid: string) => Promise<Pick<
    UserRecord,
    "uid" | "email" | "displayName" | "emailVerified" | "disabled"
  >>;
}

const PAYLOAD_KEYS = new Set(["displayName"]);
const SPECIFICATION: OperationSpecification<CreateProfilePayload> = Object.freeze({
  operation: "user_profile.create",
  targetKind: "user_profile",
  payloadKeys: PAYLOAD_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, PAYLOAD_KEYS, requestId);
    const displayName = payload.displayName === undefined || payload.displayName === null
      ? null
      : requiredString(payload.displayName, requestId, { maxLength: 120 });
    return Object.freeze({ displayName });
  },
});

function normalizeFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

function requireAuthenticatedActor(actor: VerifiedActor): void {
  if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
    throw new OperationError("UNAUTHENTICATED", actor.request.requestId);
  }
}

export async function trustedCreateUserProfile(
  actor: VerifiedActor,
  input: unknown,
  dependencies: UserProfileOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, SPECIFICATION);
    requestId = operation.requestId;
    if (operation.target.id !== "self" || operation.target.workspaceId !== null) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }

    const getAuthUser = dependencies.getAuthUser
      ?? ((uid: string) => getTrustedAdminAuth().auth.getUser(uid));
    const authUser = await getAuthUser(actor.uid);
    if (authUser.uid !== actor.uid || authUser.disabled === true) {
      throw new OperationError("FAILED_PRECONDITION", requestId);
    }
    const email = typeof authUser.email === "string" ? authUser.email.trim() : "";
    const displayName = operation.payload.displayName
      ?? (typeof authUser.displayName === "string" ? authUser.displayName.trim() : "")
      ?? "";
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();

    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const existing = await repositories.users.get(actor.uid, requestId);
      if (existing.exists) {
        if (!isPlainRecord(existing.data) || existing.data.uid !== actor.uid) {
          throw new OperationError("FAILED_PRECONDITION", requestId);
        }
        return Object.freeze({
          result: Object.freeze({ status: "completed", exists: true, created: false }),
          audit: securityAuditMutation(
            { exists: true },
            { exists: true },
            requestId,
            { eventType: "USER_PROFILE_CREATE_REPLAY", targetUid: actor.uid },
          ),
        });
      }

      const now = repositories.now;
      repositories.users.create(actor.uid, Object.freeze({
        schemaVersion: 1,
        uid: actor.uid,
        email,
        displayName,
        emailVerified: authUser.emailVerified === true,
        status: "pending",
        disabled: false,
        currentWorkspaceId: null,
        pendingWorkspaceId: null,
        pendingInviteCodeId: null,
        source: "trusted_profile_ingress",
        createdAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          exists: true,
          created: true,
          schemaVersion: 1,
        }),
        audit: securityAuditMutation(
          { exists: false },
          { exists: true, created: true, schemaVersion: 1 },
          requestId,
          { eventType: "USER_PROFILE_CREATED", targetUid: actor.uid },
        ),
      });
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
