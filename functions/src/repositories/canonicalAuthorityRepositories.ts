import type { VerifiedActor } from "../auth/verifiedActor.js";
import type {
  AuthorizationContext,
  AuthorityDocumentReader,
  AuthorityDocumentSnapshot,
  SystemOwnerResolution,
  WorkspaceMembershipResolution,
} from "../authz/authorizationTypes.js";
import {
  buildGlobalAuthorizationContext,
  buildWorkspaceAuthorizationContextWithOwnerOverride,
} from "../authz/authorizationContext.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { resolveSystemOwner } from "../authz/systemOwnerResolver.js";
import { resolveWorkspaceMembership } from "../authz/workspaceMembershipResolver.js";
import { OperationError } from "../operations/operationErrors.js";
import type { TrustedTransaction } from "./trustedTransaction.js";

function requireId(value: string, requestId: string): string {
  if (!isValidDocumentId(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  return value;
}

export interface SystemOwnerRepository {
  resolve(actor: Pick<VerifiedActor, "uid">): Promise<SystemOwnerResolution>;
  buildAuthorizationContext(actor: VerifiedActor, operation: string): Promise<AuthorizationContext>;
  buildWorkspaceAuthorizationContext(
    actor: VerifiedActor,
    operation: string,
    workspaceId: string,
  ): Promise<AuthorizationContext>;
  listByStatus(status: string): Promise<readonly AuthorityDocumentSnapshot[]>;
  update(uid: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
}

export interface WorkspaceMembershipRepository {
  resolve(
    actor: Pick<VerifiedActor, "uid">,
    workspaceId: string,
  ): Promise<WorkspaceMembershipResolution>;
  create(
    workspaceId: string,
    uid: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  get(
    workspaceId: string,
    uid: string,
    requestId: string,
  ): Promise<AuthorityDocumentSnapshot>;
  listByRole(
    workspaceId: string,
    role: string,
    requestId: string,
  ): Promise<readonly AuthorityDocumentSnapshot[]>;
  update(
    workspaceId: string,
    uid: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
}

export interface WorkspaceRepository {
  get(workspaceId: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(workspaceId: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
  update(workspaceId: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
}

export interface WorkspaceBootstrapRepository {
  get(key: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(key: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
}

export interface UserRepository {
  get(uid: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(uid: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
  update(uid: string, data: Readonly<Record<string, unknown>>, requestId: string): void;
}

export interface WorkspaceJoinRequestRepository {
  get(requestIdValue: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(
    requestIdValue: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  update(
    requestIdValue: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  getUniqueness(key: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  createUniqueness(
    key: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  updateUniqueness(
    key: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
}

export interface AdminApplicationRepository {
  get(applicationId: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(
    applicationId: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  update(
    applicationId: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  getUniqueness(key: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  createUniqueness(
    key: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  updateUniqueness(
    key: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
}

export interface InvitationRepository {
  get(invitationId: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  create(
    invitationId: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  update(
    invitationId: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  getCodeIndex(codeHash: string, requestId: string): Promise<AuthorityDocumentSnapshot>;
  createCodeIndex(
    codeHash: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
  getRedemption(
    invitationId: string,
    uid: string,
    requestId: string,
  ): Promise<AuthorityDocumentSnapshot>;
  createRedemption(
    invitationId: string,
    uid: string,
    data: Readonly<Record<string, unknown>>,
    requestId: string,
  ): void;
}

export interface CanonicalAuthorityRepositories {
  readonly now: unknown;
  readonly systemOwners: SystemOwnerRepository;
  readonly workspaceMemberships: WorkspaceMembershipRepository;
  readonly workspaces: WorkspaceRepository;
  readonly users: UserRepository;
  readonly workspaceJoinRequests: WorkspaceJoinRequestRepository;
  readonly adminApplications: AdminApplicationRepository;
  readonly invitations: InvitationRepository;
  readonly workspaceBootstraps: WorkspaceBootstrapRepository;
}

export function createCanonicalAuthorityRepositories(
  transaction: TrustedTransaction,
): CanonicalAuthorityRepositories {
  const reader: AuthorityDocumentReader = Object.freeze({
    getDocument: (pathSegments: readonly string[]) => transaction.get(pathSegments),
  });

  return Object.freeze({
    now: transaction.now,
    systemOwners: Object.freeze({
      resolve: (actor: Pick<VerifiedActor, "uid">) => resolveSystemOwner(actor, { reader }),
      buildAuthorizationContext: (actor: VerifiedActor, operation: string) => (
        buildGlobalAuthorizationContext(actor, operation, { reader })
      ),
      buildWorkspaceAuthorizationContext: (
        actor: VerifiedActor,
        operation: string,
        workspaceId: string,
      ) => buildWorkspaceAuthorizationContextWithOwnerOverride(actor, operation, workspaceId, { reader }),
      listByStatus: (status: string) => transaction.queryEqual(["systemOwners"], "status", status),
      update(uid: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.update(["systemOwners", requireId(uid, requestId)], data);
      },
    }),
    workspaceMemberships: Object.freeze({
      resolve: (actor: Pick<VerifiedActor, "uid">, workspaceId: string) => (
        resolveWorkspaceMembership(actor, workspaceId, { reader })
      ),
      create(
        workspaceId: string,
        uid: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create([
          "workspaces",
          requireId(workspaceId, requestId),
          "members",
          requireId(uid, requestId),
        ], data);
      },
      get(workspaceId: string, uid: string, requestId: string) {
        return transaction.get([
          "workspaces",
          requireId(workspaceId, requestId),
          "members",
          requireId(uid, requestId),
        ]);
      },
      listByRole(workspaceId: string, role: string, requestId: string) {
        return transaction.queryEqual([
          "workspaces",
          requireId(workspaceId, requestId),
          "members",
        ], "role", role);
      },
      update(
        workspaceId: string,
        uid: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update([
          "workspaces",
          requireId(workspaceId, requestId),
          "members",
          requireId(uid, requestId),
        ], data);
      },
    }),
    workspaces: Object.freeze({
      get(workspaceId: string, requestId: string) {
        return transaction.get(["workspaces", requireId(workspaceId, requestId)]);
      },
      create(workspaceId: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.create(["workspaces", requireId(workspaceId, requestId)], data);
      },
      update(workspaceId: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.update(["workspaces", requireId(workspaceId, requestId)], data);
      },
    }),
    users: Object.freeze({
      get(uid: string, requestId: string) {
        return transaction.get(["users", requireId(uid, requestId)]);
      },
      create(uid: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.create(["users", requireId(uid, requestId)], data);
      },
      update(uid: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.update(["users", requireId(uid, requestId)], data);
      },
    }),
    workspaceJoinRequests: Object.freeze({
      get(requestIdValue: string, requestId: string) {
        return transaction.get(["workspaceJoinRequests", requireId(requestIdValue, requestId)]);
      },
      create(
        requestIdValue: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["workspaceJoinRequests", requireId(requestIdValue, requestId)], data);
      },
      update(
        requestIdValue: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update(["workspaceJoinRequests", requireId(requestIdValue, requestId)], data);
      },
      getUniqueness(key: string, requestId: string) {
        return transaction.get(["workspaceJoinRequestPendingKeys", requireId(key, requestId)]);
      },
      createUniqueness(
        key: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["workspaceJoinRequestPendingKeys", requireId(key, requestId)], data);
      },
      updateUniqueness(
        key: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update(["workspaceJoinRequestPendingKeys", requireId(key, requestId)], data);
      },
    }),
    adminApplications: Object.freeze({
      get(applicationId: string, requestId: string) {
        return transaction.get(["adminApplications", requireId(applicationId, requestId)]);
      },
      create(
        applicationId: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["adminApplications", requireId(applicationId, requestId)], data);
      },
      update(
        applicationId: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update(["adminApplications", requireId(applicationId, requestId)], data);
      },
      getUniqueness(key: string, requestId: string) {
        return transaction.get(["adminApplicationPendingKeys", requireId(key, requestId)]);
      },
      createUniqueness(
        key: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["adminApplicationPendingKeys", requireId(key, requestId)], data);
      },
      updateUniqueness(
        key: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update(["adminApplicationPendingKeys", requireId(key, requestId)], data);
      },
    }),
    invitations: Object.freeze({
      get(invitationId: string, requestId: string) {
        return transaction.get(["authorityInvitations", requireId(invitationId, requestId)]);
      },
      create(
        invitationId: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["authorityInvitations", requireId(invitationId, requestId)], data);
      },
      update(
        invitationId: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.update(["authorityInvitations", requireId(invitationId, requestId)], data);
      },
      getCodeIndex(codeHash: string, requestId: string) {
        return transaction.get(["invitationCodeIndex", requireId(codeHash, requestId)]);
      },
      createCodeIndex(
        codeHash: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create(["invitationCodeIndex", requireId(codeHash, requestId)], data);
      },
      getRedemption(invitationId: string, uid: string, requestId: string) {
        return transaction.get([
          "authorityInvitations",
          requireId(invitationId, requestId),
          "redemptions",
          requireId(uid, requestId),
        ]);
      },
      createRedemption(
        invitationId: string,
        uid: string,
        data: Readonly<Record<string, unknown>>,
        requestId: string,
      ) {
        transaction.create([
          "authorityInvitations",
          requireId(invitationId, requestId),
          "redemptions",
          requireId(uid, requestId),
        ], data);
      },
    }),
    workspaceBootstraps: Object.freeze({
      get(key: string, requestId: string) {
        return transaction.get(["workspaceBootstrapKeys", requireId(key, requestId)]);
      },
      create(key: string, data: Readonly<Record<string, unknown>>, requestId: string) {
        transaction.create(["workspaceBootstrapKeys", requireId(key, requestId)], data);
      },
    }),
  });
}
