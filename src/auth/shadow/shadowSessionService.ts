import type { User } from "firebase/auth";
import type { AuthRepository } from "../authRepository";
import { buildAppSession } from "../sessionService";
import type { AppSession } from "../authTypes";
import {
  compareShadowSessions,
  createShadowLoggerPayload,
  shouldEmitShadowLog,
} from "./shadowSessionComparator";
import type {
  LegacySessionSnapshot,
  ShadowLoggerPayload,
  ShadowSessionDiagnostic,
} from "./shadowTypes";

const LEGACY_AUTH_STATE_KEY = "pm-auth-v31";
const LEGACY_SESSION_USER_KEY = "pm-current-user";

type UnknownRecord = Record<string, unknown>;

interface StorageLike {
  getItem(key: string): string | null;
}

interface WindowLike extends UnknownRecord {
  localStorage?: StorageLike;
  sessionStorage?: StorageLike;
}

export interface LegacySnapshotReadOptions {
  firebaseUser?: Pick<User, "uid" | "email" | "displayName"> | null;
  windowLike?: WindowLike | null;
}

export type LegacySnapshotProvider = (
  options?: LegacySnapshotReadOptions,
) => LegacySessionSnapshot | null;

export interface RunShadowSessionOptions {
  firebaseUser: User | null;
  repository: AuthRepository;
  legacySession?: LegacySessionSnapshot | null;
  legacySnapshotProvider?: LegacySnapshotProvider;
  enableLogging?: boolean;
  logger?: (payload: ShadowLoggerPayload) => void;
  onDiagnostic?: (diagnostic: ShadowSessionDiagnostic) => void;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function pickString(record: UnknownRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = normalizeString(record[key]);
    if (value) return value;
  }
  return null;
}

function inferStatus(record: UnknownRecord): string | null {
  const explicitStatus = normalizeString(record.status);
  if (explicitStatus) return explicitStatus;

  const disabled = normalizeBoolean(record.disabled);
  if (disabled === true) return "disabled";
  if (disabled === false && record.active !== false) return "active";
  if (record.active === false) return "disabled";
  if (record.active === true) return "active";
  return null;
}

function isLegacySystemOwner(record: UnknownRecord): boolean | null {
  const explicit = normalizeBoolean(record.isSystemOwner);
  if (explicit !== null) return explicit;

  const roleValues = [
    record.globalRole,
    record.role,
    record.currentRole,
    record.workspaceRole,
  ].map((value) => normalizeString(value));

  return roleValues.some((value) => value === "system_owner") ? true : null;
}

function snapshotFromRecord(
  record: UnknownRecord,
  fallback?: Pick<User, "uid" | "email" | "displayName"> | null,
): LegacySessionSnapshot {
  const currentWorkspaceId = pickString(record, [
    "currentWorkspaceId",
    "pmWorkspaceId",
    "workspace_id",
  ]);
  const workspaceId = pickString(record, [
    "workspaceId",
    "workspace_id",
    "pmWorkspaceId",
  ]);

  return {
    uid: pickString(record, ["uid", "id", "userId"]) ?? fallback?.uid ?? null,
    email: pickString(record, ["email"]) ?? fallback?.email ?? null,
    status: inferStatus(record),
    role: pickString(record, ["role"]),
    currentRole: pickString(record, ["currentRole"]),
    globalRole: pickString(record, ["globalRole"]),
    workspaceRole: pickString(record, ["workspaceRole"]),
    currentWorkspaceId,
    workspaceId,
    isSystemOwner: isLegacySystemOwner(record),
    isAuthenticated: true,
  };
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function safeGetItem(storage: StorageLike | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function getBrowserWindow(): WindowLike | null {
  if (typeof window === "undefined") return null;
  return window as unknown as WindowLike;
}

function readExplicitWindowSnapshot(
  windowLike: WindowLike,
  firebaseUser?: Pick<User, "uid" | "email" | "displayName"> | null,
): LegacySessionSnapshot | null {
  const explicit = windowLike.PM_AUTH_SHADOW_LEGACY_SNAPSHOT ??
    windowLike.PMAuthLegacySession ??
    windowLike.PM_CURRENT_USER;

  return isRecord(explicit) ? snapshotFromRecord(explicit, firebaseUser) : null;
}

function readAuthServiceState(windowLike: WindowLike): unknown {
  const authService = windowLike.PMAuthService;
  if (!isRecord(authService) || typeof authService.loadAuthState !== "function") {
    return null;
  }

  try {
    return authService.loadAuthState();
  } catch {
    return null;
  }
}

function findLegacyUserFromAuthState(
  authState: unknown,
  sessionValue: string | null,
  firebaseUser?: Pick<User, "uid" | "email" | "displayName"> | null,
): UnknownRecord | null {
  if (!isRecord(authState) || !Array.isArray(authState.users)) return null;

  const authInfo = isRecord(authState.auth) ? authState.auth : {};
  const currentUserId = normalizeString(authInfo.currentUserId);
  const firebaseUid = firebaseUser?.uid ?? null;
  const firebaseEmail = firebaseUser?.email?.toLowerCase() ?? null;
  const sessionEmailOrId = sessionValue?.toLowerCase() ?? null;

  return authState.users.find((candidate: unknown) => {
    if (!isRecord(candidate)) return false;
    const uid = pickString(candidate, ["uid", "id", "userId"]);
    const email = pickString(candidate, ["email"])?.toLowerCase() ?? null;
    return Boolean(
      (currentUserId && uid === currentUserId) ||
      (sessionValue && uid === sessionValue) ||
      (firebaseUid && uid === firebaseUid) ||
      (firebaseEmail && email === firebaseEmail) ||
      (sessionEmailOrId && email === sessionEmailOrId),
    );
  }) as UnknownRecord | undefined ?? null;
}

function readLegacyAuthStateSnapshot(
  windowLike: WindowLike,
  firebaseUser?: Pick<User, "uid" | "email" | "displayName"> | null,
): LegacySessionSnapshot | null {
  const sessionValue = safeGetItem(windowLike.sessionStorage, LEGACY_SESSION_USER_KEY);
  const authState = readAuthServiceState(windowLike) ??
    parseJson(safeGetItem(windowLike.localStorage, LEGACY_AUTH_STATE_KEY));
  const user = findLegacyUserFromAuthState(authState, sessionValue, firebaseUser);

  return user ? snapshotFromRecord(user, firebaseUser) : null;
}

function readCompatFirebaseSnapshot(
  windowLike: WindowLike,
): LegacySessionSnapshot | null {
  const firebaseGlobal = windowLike.firebase;
  if (!isRecord(firebaseGlobal) || typeof firebaseGlobal.auth !== "function") {
    return null;
  }

  try {
    const authResult = firebaseGlobal.auth();
    if (!isRecord(authResult) || !isRecord(authResult.currentUser)) return null;
    return snapshotFromRecord(authResult.currentUser);
  } catch {
    return null;
  }
}

export function readLegacySessionSnapshot(
  options: LegacySnapshotReadOptions = {},
): LegacySessionSnapshot | null {
  const windowLike = options.windowLike ?? getBrowserWindow();
  if (!windowLike) return null;

  return readExplicitWindowSnapshot(windowLike, options.firebaseUser) ??
    readLegacyAuthStateSnapshot(windowLike, options.firebaseUser) ??
    readCompatFirebaseSnapshot(windowLike);
}

export async function runShadowSessionComparison(
  options: RunShadowSessionOptions,
): Promise<ShadowSessionDiagnostic> {
  const timestamp = new Date().toISOString();
  const legacySession = options.legacySession ??
    options.legacySnapshotProvider?.({ firebaseUser: options.firebaseUser }) ??
    readLegacySessionSnapshot({ firebaseUser: options.firebaseUser });

  let shadowSession: AppSession | null = null;
  if (options.firebaseUser) {
    try {
      shadowSession = await buildAppSession(options.firebaseUser, options.repository);
    } catch {
      shadowSession = null;
    }
  }

  const comparison = compareShadowSessions(legacySession, shadowSession);
  const diagnostic: ShadowSessionDiagnostic = {
    legacySession,
    shadowSession,
    comparison,
    timestamp,
  };

  if (shouldEmitShadowLog(options.enableLogging === true)) {
    const payload = createShadowLoggerPayload({
      legacy: legacySession,
      shadow: shadowSession,
      comparison,
      timestamp,
    });
    options.logger?.(payload);
  }

  options.onDiagnostic?.(diagnostic);
  return diagnostic;
}
