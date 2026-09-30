import type { User } from "firebase/auth";
import { AuthSessionError, toAuthSessionError } from "./authErrors";
import {
  normalizeAccountStatus,
  normalizeStringOrNull,
  resolveCurrentWorkspaceId,
  resolveGlobalRole,
} from "./authNormalization";
import type {
  AppSession,
  PostLoginTask,
  SessionWarning,
  WorkspaceResolutionDiagnostics,
  WorkspaceResolutionFailureKind,
} from "./authTypes";
import type { AuthRepository } from "./authRepository";
import { GLOBAL_ROLES } from "../permissions/roles";
import {
  isUsableMembershipStatus,
  normalizeWorkspaceMembership,
} from "../workspace/membershipService";
import { isWorkspaceDeletedLike } from "../workspace/workspaceTypes";
import { isWorkspaceRole } from "../permissions/roles";

let sessionLoadGeneration = 0;
const SESSION_QUOTA_BACKOFF_MS = 60 * 60 * 1000;

interface InFlightSessionLoad {
  generation: number;
  promise: Promise<AppSession>;
}

interface SessionLoaderDiagnostics {
  sessionLoadCount: number;
  sessionReadCount: number;
  sessionWriteCount: number;
  bootstrapAttemptCount: number;
  bootstrapBlockedCount: number;
  inFlightCount: number;
  quotaBlockedCount: number;
  lastErrorCode: string | null;
}

const inFlightSessionLoadsByUid = new Map<string, InFlightSessionLoad>();
const quotaBlockedUntilByUid = new Map<string, number>();
const diagnostics: SessionLoaderDiagnostics = {
  sessionLoadCount: 0,
  sessionReadCount: 0,
  sessionWriteCount: 0,
  bootstrapAttemptCount: 0,
  bootstrapBlockedCount: 0,
  inFlightCount: 0,
  quotaBlockedCount: 0,
  lastErrorCode: null,
};

export function invalidateSessionLoads(): void {
  sessionLoadGeneration += 1;
  inFlightSessionLoadsByUid.clear();
}

export function getSessionLoadGeneration(): number {
  return sessionLoadGeneration;
}

export function getSessionLoaderDiagnostics(): SessionLoaderDiagnostics {
  return {
    ...diagnostics,
    inFlightCount: inFlightSessionLoadsByUid.size,
    quotaBlockedCount: quotaBlockedUntilByUid.size,
  };
}

export function resetSessionLoaderDiagnosticsForTests(): void {
  inFlightSessionLoadsByUid.clear();
  quotaBlockedUntilByUid.clear();
  diagnostics.sessionLoadCount = 0;
  diagnostics.sessionReadCount = 0;
  diagnostics.sessionWriteCount = 0;
  diagnostics.bootstrapAttemptCount = 0;
  diagnostics.bootstrapBlockedCount = 0;
  diagnostics.inFlightCount = 0;
  diagnostics.quotaBlockedCount = 0;
  diagnostics.lastErrorCode = null;
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code?: unknown }).code) === "resource-exhausted"
  );
}

function quotaError(cause?: unknown): AuthSessionError {
  return new AuthSessionError(
    "SESSION_READ_QUOTA_EXCEEDED",
    "현재 데이터 조회 한도가 초과되어 계정 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
    { cause },
  );
}

function appendWarnings(
  target: SessionWarning[],
  warnings: readonly SessionWarning[],
): void {
  target.push(...warnings);
}

function emptyWorkspaceResolutionDiagnostics(
  serverCurrentWorkspacePresent: boolean,
  isSystemOwnerResolved: boolean,
): WorkspaceResolutionDiagnostics {
  return {
    serverCurrentWorkspacePresent,
    serverCurrentWorkspaceDocumentExists: false,
    canonicalMembershipExists: false,
    canonicalMembershipStatus: null,
    canonicalMembershipRole: null,
    legacyMembershipExists: false,
    legacyMembershipStatus: null,
    legacyMembershipRole: null,
    isSystemOwnerResolved,
    systemOwnerWorkspaceAccessAllowed: false,
    workspaceResolutionFailureKind: serverCurrentWorkspacePresent
      ? "unknown"
      : "server-current-workspace-missing",
  };
}

function updateWorkspaceResolutionFailure(
  resolution: WorkspaceResolutionDiagnostics,
  failureKind: WorkspaceResolutionFailureKind,
): WorkspaceResolutionDiagnostics {
  return {
    ...resolution,
    workspaceResolutionFailureKind: failureKind,
  };
}

export async function buildAppSession(
  firebaseUser: User,
  repository: AuthRepository,
): Promise<AppSession> {
  const userResult = await repository.getUserDocument(firebaseUser.uid);
  if (!userResult.exists || !userResult.data) {
    throw new AuthSessionError(
      "USER_DOCUMENT_MISSING",
      "Firestore users 문서가 없습니다.",
    );
  }

  const userData = userResult.data;
  const warnings: SessionWarning[] = [];
  const normalizedStatus = normalizeAccountStatus(userData);
  appendWarnings(warnings, normalizedStatus.warnings);

  const systemOwnerExists = await repository.hasSystemOwnerDocument(firebaseUser.uid);
  const normalizedGlobalRole = resolveGlobalRole({
    systemOwnerExists,
    usersGlobalRole: userData.globalRole,
    legacyRole: userData.role,
    legacyCurrentRole: userData.currentRole,
    legacyWorkspaceRole: userData.workspaceRole,
  });
  appendWarnings(warnings, normalizedGlobalRole.warnings);

  const currentWorkspaceId = resolveCurrentWorkspaceId(userData);
  const isSystemOwnerResolved = normalizedGlobalRole.globalRole === GLOBAL_ROLES.SYSTEM_OWNER;
  let workspaceResolution = emptyWorkspaceResolutionDiagnostics(
    Boolean(currentWorkspaceId),
    isSystemOwnerResolved,
  );
  const baseSession: AppSession = {
    uid: firebaseUser.uid,
    email: normalizeStringOrNull(userData.email) ?? firebaseUser.email,
    displayName: normalizeStringOrNull(userData.displayName) ?? firebaseUser.displayName,
    emailVerified: firebaseUser.emailVerified,
    status: normalizedStatus.status,
    globalRole: normalizedGlobalRole.globalRole,
    currentWorkspaceId: null,
    currentWorkspaceRole: null,
    isSystemOwner: isSystemOwnerResolved,
    isAuthenticated: true,
    warnings,
    workspaceResolution,
  };

  if (normalizedStatus.status !== "active") {
    return baseSession;
  }

  if (!currentWorkspaceId) {
    return {
      ...baseSession,
      workspaceResolution,
    };
  }

  const workspaceResult = await repository.getWorkspace(currentWorkspaceId);
  if (
    !workspaceResult.exists ||
    !workspaceResult.workspace ||
    isWorkspaceDeletedLike(workspaceResult.workspace)
  ) {
    workspaceResolution = updateWorkspaceResolutionFailure(
      workspaceResolution,
      "workspace-document-missing",
    );
    warnings.push({
      code: "WORKSPACE_NOT_FOUND",
      message: "currentWorkspaceId points to a missing or deleted workspace.",
      details: { currentWorkspaceId },
    });
    warnings.push({
      code: "CURRENT_WORKSPACE_NOT_ACCESSIBLE",
      message: "Server users.currentWorkspaceId is not accessible.",
      details: { reason: "workspace-not-found" },
    });
    return {
      ...baseSession,
      workspaceResolution,
    };
  }

  let legacyMembershipDiagnosticsDenied = false;
  const [membershipResult, legacyMemberships] = await Promise.all([
    repository.getNestedMembership(currentWorkspaceId, firebaseUser.uid),
    repository.getLegacyMembershipDiagnostics(currentWorkspaceId, firebaseUser.uid)
      .catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          String((error as { code?: unknown }).code) === "permission-denied"
        ) {
          legacyMembershipDiagnosticsDenied = true;
          return [];
        }
        throw error;
      }),
  ]);
  const firstLegacyMembership = legacyMemberships.find((item) => item.exists) ?? null;
  workspaceResolution = {
    ...workspaceResolution,
    serverCurrentWorkspaceDocumentExists: true,
    canonicalMembershipExists: membershipResult.exists,
    canonicalMembershipStatus: membershipResult.membership?.status ? String(membershipResult.membership.status) : null,
    canonicalMembershipRole: membershipResult.membership?.role ? String(membershipResult.membership.role) : null,
    legacyMembershipExists: Boolean(firstLegacyMembership),
    legacyMembershipStatus: firstLegacyMembership?.status ? String(firstLegacyMembership.status) : null,
    legacyMembershipRole: firstLegacyMembership?.role ? String(firstLegacyMembership.role) : null,
    systemOwnerWorkspaceAccessAllowed: isSystemOwnerResolved,
    workspaceResolutionFailureKind: "none",
  };

  if (legacyMemberships.some((item) => item.exists)) {
    warnings.push({
      code: "LEGACY_MEMBERSHIP_PRESENT",
      message: "Legacy membership exists and is ignored for authority decisions.",
      details: { currentWorkspaceId },
    });
  }
  if (legacyMembershipDiagnosticsDenied) {
    warnings.push({
      code: "LEGACY_MEMBERSHIP_DIAGNOSTIC_DENIED",
      message: "Legacy membership diagnostics were denied; canonical nested membership remains authoritative.",
      details: { currentWorkspaceId },
    });
  }

  if (!membershipResult.exists) {
    warnings.push({
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Nested membership is missing for currentWorkspaceId.",
      details: { currentWorkspaceId },
    });

    if (isSystemOwnerResolved) {
      return {
        ...baseSession,
        currentWorkspaceId,
        currentWorkspaceRole: null,
        workspaceResolution,
      };
    }

    workspaceResolution = updateWorkspaceResolutionFailure(
      workspaceResolution,
      "canonical-membership-missing",
    );
    warnings.push({
      code: "CURRENT_WORKSPACE_NOT_ACCESSIBLE",
      message: "Server users.currentWorkspaceId is not accessible.",
      details: { reason: "membership-not-found" },
    });
    return {
      ...baseSession,
      workspaceResolution,
    };
  }

  const normalizedMembership = normalizeWorkspaceMembership(membershipResult.membership);
  appendWarnings(warnings, normalizedMembership.warnings);

  if (!normalizedMembership.isUsable || !normalizedMembership.role) {
    const statusUsable = isUsableMembershipStatus(membershipResult.membership?.status);
    const roleUsable = isWorkspaceRole(membershipResult.membership?.role);
    const failureKind: WorkspaceResolutionFailureKind = !statusUsable
      ? "membership-inactive"
      : !roleUsable
        ? "membership-role-missing"
        : "unknown";

    if (isSystemOwnerResolved) {
      return {
        ...baseSession,
        currentWorkspaceId,
        currentWorkspaceRole: null,
        workspaceResolution: {
          ...workspaceResolution,
          workspaceResolutionFailureKind: "none",
        },
      };
    }

    workspaceResolution = updateWorkspaceResolutionFailure(workspaceResolution, failureKind);
    warnings.push({
      code: "CURRENT_WORKSPACE_NOT_ACCESSIBLE",
      message: "Server users.currentWorkspaceId is not accessible.",
      details: { reason: "membership-not-usable" },
    });
    return {
      ...baseSession,
      workspaceResolution,
    };
  }

  return {
    ...baseSession,
    currentWorkspaceId,
    currentWorkspaceRole: normalizedMembership.role,
    workspaceResolution,
  };
}

export async function loadSessionReadOnlySafely(
  firebaseUser: User,
  repository: AuthRepository,
): Promise<AppSession> {
  const uid = firebaseUser.uid;
  const quotaBlockedUntil = quotaBlockedUntilByUid.get(uid) ?? 0;
  if (quotaBlockedUntil > Date.now()) {
    diagnostics.bootstrapBlockedCount += 1;
    diagnostics.lastErrorCode = "SESSION_READ_QUOTA_EXCEEDED";
    throw quotaError();
  }

  const inFlight = inFlightSessionLoadsByUid.get(uid);
  if (inFlight) {
    return inFlight.promise;
  }

  const generation = ++sessionLoadGeneration;
  diagnostics.sessionLoadCount += 1;

  const promise = (async () => {
    try {
      diagnostics.sessionReadCount += 1;
      const session = await buildAppSession(firebaseUser, repository);

      if (generation !== sessionLoadGeneration) {
        throw new AuthSessionError(
          "SESSION_SUPERSEDED",
          "이전 세션 로드 결과가 최신 요청보다 늦게 도착했습니다.",
        );
      }

      return session;
    } catch (error) {
      if (isQuotaExceededError(error)) {
        quotaBlockedUntilByUid.set(uid, Date.now() + SESSION_QUOTA_BACKOFF_MS);
        diagnostics.lastErrorCode = "SESSION_READ_QUOTA_EXCEEDED";
        throw quotaError(error);
      }

      if (generation !== sessionLoadGeneration) {
        throw new AuthSessionError(
          "SESSION_SUPERSEDED",
          "이전 세션 로드 결과가 최신 요청보다 늦게 도착했습니다.",
          { cause: error },
        );
      }

      const sessionError = toAuthSessionError(error);
      diagnostics.lastErrorCode = sessionError.code;
      throw sessionError;
    } finally {
      const current = inFlightSessionLoadsByUid.get(uid);
      if (current?.generation === generation) {
        inFlightSessionLoadsByUid.delete(uid);
      }
    }
  })();

  inFlightSessionLoadsByUid.set(uid, {
    generation,
    promise,
  });

  return promise;
}

export async function loadSessionSafely(
  firebaseUser: User,
  repository: AuthRepository,
): Promise<AppSession> {
  return loadSessionReadOnlySafely(firebaseUser, repository);
}

export async function runPostLoginTasks(
  session: AppSession,
  tasks: readonly PostLoginTask[],
): Promise<void> {
  await Promise.allSettled(
    tasks.map(async (task) => {
      try {
        await task.run(session);
      } catch (error) {
        console.warn(`[PostLoginTask:${task.name}] failed`, error);
      }
    }),
  );
}
