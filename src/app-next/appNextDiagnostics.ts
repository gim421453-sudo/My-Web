import {
  diagnosticFingerprint,
  type DiagnosticFingerprintNamespace,
} from "../shared/diagnosticFingerprint";

export interface AppNextDiagnosticEvent {
  timestamp: string;
  event: string;
  featureSource?: string;
  phase?: string;
  status?: string;
  requestedPersistence?: "local" | "session";
  effectivePersistence?: "local" | "session" | "unknown";
  persistenceSetSucceeded?: boolean;
  persistenceSetErrorKind?: string;
  signInProvider?: "google" | "email";
  currentOrigin?: string;
  authUserExists?: boolean;
  sessionExists?: boolean;
  providerMountCount?: number;
  listenerCount?: number;
  authStateChangeCount?: number;
  persistenceSetCount?: number;
  explicitSignOutCount?: number;
  automaticSignOutCount?: number;
  lastSignOutReason?: string;
  lastAuthStateReason?: string;
  sessionLoadCount?: number;
  sessionReadCount?: number;
  sessionWriteCount?: number;
  bootstrapAttemptCount?: number;
  bootstrapBlockedCount?: number;
  resourceExhausted?: boolean;
}

export interface AppNextNoticeDiagnosticsSnapshot {
  screen: "workspace-notices";
  phase: string;
  status: string;
  firebaseProjectFingerprint: string;
  authUserFingerprint: string;
  firebaseAppName: string;
  firebaseAppCount: number;
  currentOrigin: string;
  workspacePresent: boolean;
  workspaceRole: string;
  serverCurrentWorkspacePresent: boolean;
  serverCurrentWorkspaceDocumentExists: boolean;
  canonicalMembershipExists: boolean;
  canonicalMembershipStatus: string;
  canonicalMembershipRole: string;
  legacyMembershipExists: boolean;
  legacyMembershipStatus: string;
  legacyMembershipRole: string;
  isSystemOwnerResolved: boolean;
  systemOwnerWorkspaceAccessAllowed: boolean;
  workspaceResolutionFailureKind: string;
  lastRequestedReadMode: string;
  lastCompletedReadMode: string;
  lastErrorKind: string;
  lastReadStartedAt: string;
  lastReadCompletedAt: string;
  rawReadCount: number;
  filteredCount: number;
  displayedCount: number;
  fromCache: string;
  pendingWrites: string;
  currentWorkspaceFingerprint: string;
  appSessionWorkspaceFingerprint: string;
  usersCurrentWorkspaceFingerprint: string;
  usersLegacyWorkspaceFingerprint: string;
  serverUsersDocumentFound: boolean;
  serverUsersReadErrorKind: string;
  serverUsersCurrentWorkspaceFingerprint: string;
  serverUsersLegacyWorkspaceFingerprint: string;
  localStorageWorkspaceFingerprint: string;
  storeWorkspaceFingerprint: string;
  selectedWorkspaceFingerprint: string;
  writeTargetWorkspaceFingerprint: string;
  noticeReadWriteTargetWorkspaceFingerprint: string;
  canonicalSource: string;
  ignoredLegacySourceCount: number;
  workspaceMismatchDetected: boolean;
  workspaceMismatchKind: string;
  databaseIdKind: string;
  noticeCollectionKind: string;
  sameFirebaseProject: string;
  sameAuthUser: string;
  sameServerUsersCurrentWorkspace: string;
  sameResolvedWorkspace: string;
  listenerCount: number;
  writeApiImported: boolean;
  automaticSignOut: string;
}

const MAX_APP_NEXT_DIAGNOSTIC_EVENTS = 30;
const diagnosticEvents: AppNextDiagnosticEvent[] = [];
const APP_NEXT_LAST_STATE_KEY = "pm-app-next-last-state-v1";
const APP_NEXT_PAGE_STATE_KEY = "pm-app-next-page-state-v2";
const APP_NEXT_CONTEXT_DIAGNOSTIC_KEY = "pm:diag:app-next-context-v1";
const OPERATIONAL_CONTEXT_DIAGNOSTIC_KEY = "pm:diag:operational-context-v1";
let authStateChangeCount = 0;
let persistenceSetCount = 0;
let persistenceSetSucceeded = false;
let persistenceSetFailedCount = 0;
let persistenceSetErrorKind = "none";
let explicitSignOutCount = 0;
let automaticSignOutCount = 0;
let lastSignOutReason = "none";
let lastAuthStateReason = "not-started";
let requestedPersistence: "local" | "session" = "local";
let effectivePersistence: "local" | "session" | "unknown" = "unknown";
let signInProvider: "google" | "email" | "-" = "-";
let previousPageHadAuthenticatedUser = false;
let previousPageWasAuthenticated = false;
let previousRequestedPersistence = "unknown";
let previousEffectivePersistence = "unknown";
let previousExplicitSignOutCount = 0;
let previousExplicitSignOutAt = "";
let previousAutomaticSignOutAt = "";
let lastPageClosedAt = "";
let firebaseAppInitializedAt = "";
let authInstanceCreatedAt = "";
let firebaseAppName = "";
let firebaseAppCount = 0;
let firebaseProjectFingerprint = "";
let firebaseAuthDomainPresent = false;
let authUserFingerprint = "-";
let authObserverAttachedAt = "";
let firstAuthCallbackAt = "";
let firstAuthCallbackHadUser: boolean | null = null;
let persistenceRestoreWaitStartedAt = "";
let persistenceRestoreWaitCompletedAt = "";
let persistenceRestoreResult = "unknown";
let crossTabAuthChangeCount = 0;
let crossTabSignedOutCount = 0;
let lastCrossTabAuthReason = "none";
let noticeDiagnostics: AppNextNoticeDiagnosticsSnapshot = {
  screen: "workspace-notices",
  phase: "unknown",
  status: "unknown",
  firebaseProjectFingerprint: "-",
  authUserFingerprint: "-",
  firebaseAppName: "-",
  firebaseAppCount: 0,
  currentOrigin: "",
  workspacePresent: false,
  workspaceRole: "-",
  serverCurrentWorkspacePresent: false,
  serverCurrentWorkspaceDocumentExists: false,
  canonicalMembershipExists: false,
  canonicalMembershipStatus: "-",
  canonicalMembershipRole: "-",
  legacyMembershipExists: false,
  legacyMembershipStatus: "-",
  legacyMembershipRole: "-",
  isSystemOwnerResolved: false,
  systemOwnerWorkspaceAccessAllowed: false,
  workspaceResolutionFailureKind: "unknown",
  lastRequestedReadMode: "none",
  lastCompletedReadMode: "none",
  lastErrorKind: "none",
  lastReadStartedAt: "",
  lastReadCompletedAt: "",
  rawReadCount: 0,
  filteredCount: 0,
  displayedCount: 0,
  fromCache: "-",
  pendingWrites: "-",
  currentWorkspaceFingerprint: "-",
  appSessionWorkspaceFingerprint: "-",
  usersCurrentWorkspaceFingerprint: "-",
  usersLegacyWorkspaceFingerprint: "-",
  serverUsersDocumentFound: false,
  serverUsersReadErrorKind: "none",
  serverUsersCurrentWorkspaceFingerprint: "-",
  serverUsersLegacyWorkspaceFingerprint: "-",
  localStorageWorkspaceFingerprint: "-",
  storeWorkspaceFingerprint: "-",
  selectedWorkspaceFingerprint: "-",
  writeTargetWorkspaceFingerprint: "-",
  noticeReadWriteTargetWorkspaceFingerprint: "-",
  canonicalSource: "AppSession.currentWorkspaceId",
  ignoredLegacySourceCount: 0,
  workspaceMismatchDetected: false,
  workspaceMismatchKind: "none",
  databaseIdKind: "default",
  noticeCollectionKind: "workspace-notices",
  sameFirebaseProject: "unknown",
  sameAuthUser: "unknown",
  sameServerUsersCurrentWorkspace: "unknown",
  sameResolvedWorkspace: "unknown",
  listenerCount: 0,
  writeApiImported: false,
  automaticSignOut: "none",
};

export type AppNextDiagnosticFingerprintNamespace = DiagnosticFingerprintNamespace;

export async function appNextDiagnosticFingerprint(
  namespace: AppNextDiagnosticFingerprintNamespace,
  value: string | null | undefined,
): Promise<string> {
  return diagnosticFingerprint(namespace, value);
}

function sameDiagnosticValue(left: string, right: string): string {
  if (!left || !right || left === "-" || right === "-" || left === "unavailable" || right === "unavailable") {
    return "unknown";
  }
  return left === right ? "true" : "false";
}

function readDiagnosticContext(key: string): Record<string, unknown> | null {
  if (typeof window === "undefined" || !import.meta.env.DEV) return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null") as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function writeAppNextDiagnosticContext(payload: {
  firebaseProjectFingerprint?: string;
  authUserFingerprint?: string;
  serverUsersCurrentWorkspaceFingerprint?: string;
  resolvedWorkspaceFingerprint?: string;
}): void {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  try {
    window.localStorage.setItem(APP_NEXT_CONTEXT_DIAGNOSTIC_KEY, JSON.stringify({
      firebaseProjectFingerprint,
      authUserFingerprint,
      ...payload,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Development diagnostics only.
  }
}

function contextComparison(next: Partial<AppNextNoticeDiagnosticsSnapshot>) {
  const operational = readDiagnosticContext(OPERATIONAL_CONTEXT_DIAGNOSTIC_KEY);
  if (!operational) {
    return {
      sameFirebaseProject: "unknown",
      sameAuthUser: "unknown",
      sameServerUsersCurrentWorkspace: "unknown",
      sameResolvedWorkspace: "unknown",
    };
  }

  const resolved = next.appSessionWorkspaceFingerprint
    || next.currentWorkspaceFingerprint
    || noticeDiagnostics.appSessionWorkspaceFingerprint;

  return {
    sameFirebaseProject: sameDiagnosticValue(
      String(next.firebaseProjectFingerprint || firebaseProjectFingerprint || ""),
      String(operational.firebaseProjectFingerprint || ""),
    ),
    sameAuthUser: sameDiagnosticValue(
      String(next.authUserFingerprint || authUserFingerprint || ""),
      String(operational.authUserFingerprint || ""),
    ),
    sameServerUsersCurrentWorkspace: sameDiagnosticValue(
      String(next.serverUsersCurrentWorkspaceFingerprint || noticeDiagnostics.serverUsersCurrentWorkspaceFingerprint || ""),
      String(operational.serverUsersCurrentWorkspaceFingerprint || ""),
    ),
    sameResolvedWorkspace: sameDiagnosticValue(
      String(resolved || ""),
      String(operational.resolvedWorkspaceFingerprint || ""),
    ),
  };
}

function isComparableFingerprint(value: string | null | undefined): boolean {
  return Boolean(value && value !== "-" && value !== "unavailable");
}

function workspaceMismatch(next: Partial<AppNextNoticeDiagnosticsSnapshot>) {
  const serverReadErrorKind = String(
    next.serverUsersReadErrorKind
      || noticeDiagnostics.serverUsersReadErrorKind
      || "none",
  );
  if (serverReadErrorKind !== "none") {
    return {
      workspaceMismatchDetected: false,
      workspaceMismatchKind: "none",
    };
  }

  const appSessionWorkspace = String(
    next.appSessionWorkspaceFingerprint
      || next.currentWorkspaceFingerprint
      || noticeDiagnostics.appSessionWorkspaceFingerprint
      || noticeDiagnostics.currentWorkspaceFingerprint
      || "",
  );
  const serverWorkspace = String(
    next.serverUsersCurrentWorkspaceFingerprint
      || next.usersCurrentWorkspaceFingerprint
      || noticeDiagnostics.serverUsersCurrentWorkspaceFingerprint
      || noticeDiagnostics.usersCurrentWorkspaceFingerprint
      || "",
  );

  if (isComparableFingerprint(appSessionWorkspace) && isComparableFingerprint(serverWorkspace)) {
    return {
      workspaceMismatchDetected: appSessionWorkspace !== serverWorkspace,
      workspaceMismatchKind: appSessionWorkspace === serverWorkspace
        ? "none"
        : "server-workspace-rejected",
    };
  }

  if (isComparableFingerprint(serverWorkspace) && !isComparableFingerprint(appSessionWorkspace)) {
    const failureKind = String(next.workspaceResolutionFailureKind
      || noticeDiagnostics.workspaceResolutionFailureKind
      || "unknown");
    const mismatchKind = failureKind === "workspace-document-missing"
      ? "workspace-document-missing"
      : ["canonical-membership-missing", "membership-inactive", "membership-role-missing"].includes(failureKind)
        ? "membership-inaccessible"
        : failureKind === "system-owner-membership-required"
          ? "system-owner-validation-error"
          : "server-workspace-rejected";
    return {
      workspaceMismatchDetected: true,
      workspaceMismatchKind: mismatchKind,
    };
  }

  if (isComparableFingerprint(appSessionWorkspace) && !isComparableFingerprint(serverWorkspace)) {
    return {
      workspaceMismatchDetected: true,
      workspaceMismatchKind: "missing-server-current-workspace",
    };
  }

  return {
    workspaceMismatchDetected: false,
    workspaceMismatchKind: "none",
  };
}

function safeReadLastState(): void {
  if (typeof window === "undefined") return;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_NEXT_PAGE_STATE_KEY)
      || window.sessionStorage.getItem(APP_NEXT_LAST_STATE_KEY)
      || "{}");
    previousPageHadAuthenticatedUser = Boolean(parsed.previousPageHadAuthenticatedUser ?? parsed.previousPageWasAuthenticated);
    previousPageWasAuthenticated = Boolean(parsed.previousPageWasAuthenticated ?? parsed.previousPageHadAuthenticatedUser);
    previousRequestedPersistence = String(parsed.previousRequestedPersistence || "unknown");
    previousEffectivePersistence = String(parsed.previousEffectivePersistence || "unknown");
    previousExplicitSignOutCount = Number(parsed.previousExplicitSignOutCount || 0);
    previousExplicitSignOutAt = String(parsed.previousExplicitSignOutAt || "");
    previousAutomaticSignOutAt = String(parsed.previousAutomaticSignOutAt || "");
    lastPageClosedAt = String(parsed.previousPageClosedAt || parsed.lastPageClosedAt || "");
  } catch {
    previousPageHadAuthenticatedUser = false;
    previousPageWasAuthenticated = false;
  }
}

function safeWriteLastState(): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      previousPageHadAuthenticatedUser,
      previousPageWasAuthenticated,
      previousRequestedPersistence: requestedPersistence,
      previousEffectivePersistence: effectivePersistence,
      previousExplicitSignOutCount: explicitSignOutCount,
      previousExplicitSignOutAt,
      previousAutomaticSignOutAt,
      previousPageClosedAt: new Date().toISOString(),
      lastPageClosedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(APP_NEXT_PAGE_STATE_KEY, payload);
    window.sessionStorage.setItem(APP_NEXT_LAST_STATE_KEY, payload);
  } catch {
    // Diagnostics storage is best-effort only.
  }
}

safeReadLastState();
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", safeWriteLastState);
}

export function recordAppNextAuthStateChange(reason: string): void {
  authStateChangeCount += 1;
  lastAuthStateReason = reason;
  previousPageHadAuthenticatedUser = reason === "auth-user-present";
  previousPageWasAuthenticated = reason === "auth-user-present";
}

export function recordAppNextAuthUser(uid: string | null | undefined): void {
  void appNextDiagnosticFingerprint("auth-user", uid)
    .then((nextFingerprint) => {
      authUserFingerprint = nextFingerprint;
      writeAppNextDiagnosticContext({
        authUserFingerprint: nextFingerprint,
      });
    })
    .catch(() => {
      authUserFingerprint = "unavailable";
    });
}

export function recordAppNextPersistence(
  requested: "local" | "session",
  effective: "local" | "session" | "unknown",
  provider: "google" | "email",
  succeeded = true,
  errorKind = "none",
): void {
  persistenceSetCount += 1;
  requestedPersistence = requested;
  effectivePersistence = effective;
  signInProvider = provider;
  persistenceSetSucceeded = succeeded;
  persistenceSetErrorKind = errorKind;
  if (!succeeded) persistenceSetFailedCount += 1;
}

export function recordAppNextExplicitSignOut(reason = "user-requested"): void {
  explicitSignOutCount += 1;
  lastSignOutReason = reason;
  previousExplicitSignOutAt = new Date().toISOString();
  safeWriteLastState();
}

export function recordAppNextAutomaticSignOut(reason: string): void {
  automaticSignOutCount += 1;
  lastSignOutReason = reason;
  previousAutomaticSignOutAt = new Date().toISOString();
  safeWriteLastState();
}

export function recordAppNextFirebaseInit(details: {
  appName: string;
  appCount: number;
  projectId?: string;
  authDomain?: string;
}): void {
  firebaseAppInitializedAt ||= new Date().toISOString();
  firebaseAppName = details.appName || "";
  firebaseAppCount = details.appCount;
  void appNextDiagnosticFingerprint("firebase-project", details.projectId || "")
    .then((nextFingerprint) => {
      firebaseProjectFingerprint = nextFingerprint;
      writeAppNextDiagnosticContext({
        firebaseProjectFingerprint: nextFingerprint,
      });
    })
    .catch(() => {
      firebaseProjectFingerprint = "unavailable";
    });
  firebaseAuthDomainPresent = Boolean(details.authDomain);
}

export function recordAppNextAuthInstanceCreated(): void {
  authInstanceCreatedAt ||= new Date().toISOString();
}

export function recordAppNextAuthObserverAttached(): void {
  authObserverAttachedAt = new Date().toISOString();
  persistenceRestoreWaitStartedAt = authObserverAttachedAt;
}

export function recordAppNextAuthCallback(hasUser: boolean): void {
  const now = new Date().toISOString();
  if (!firstAuthCallbackAt) {
    firstAuthCallbackAt = now;
    firstAuthCallbackHadUser = hasUser;
    persistenceRestoreWaitCompletedAt = now;
    if (hasUser) {
      persistenceRestoreResult = "restored";
    } else if (
      previousRequestedPersistence === "local" &&
      previousEffectivePersistence === "local" &&
      previousPageWasAuthenticated &&
      !previousExplicitSignOutAt
    ) {
      persistenceRestoreResult = "no-user";
    } else if (previousExplicitSignOutAt) {
      persistenceRestoreResult = "explicit-signout";
    } else {
      persistenceRestoreResult = "unknown";
    }
  }
}

export function recordAppNextCrossTabSignOut(reason = "cross-tab-signout"): void {
  const explicitAt = previousExplicitSignOutAt ? new Date(previousExplicitSignOutAt).getTime() : 0;
  if (explicitAt && Date.now() - explicitAt < 5000) {
    lastCrossTabAuthReason = "same-tab-explicit-signout";
    return;
  }
  crossTabAuthChangeCount += 1;
  crossTabSignedOutCount += 1;
  lastCrossTabAuthReason = reason;
}

export function getAppNextAuthDiagnostics() {
  return {
    requestedPersistence,
    effectivePersistence,
    persistenceSetSucceeded,
    persistenceSetCount,
    persistenceSetFailedCount,
    persistenceSetErrorKind,
    signInProvider,
    authStateChangeCount,
    explicitSignOutCount,
    automaticSignOutCount,
    lastSignOutReason,
    lastAuthStateReason,
    currentOrigin: typeof window === "undefined" ? "" : window.location.origin,
    firebaseAppInitializedAt,
    authInstanceCreatedAt,
    firebaseAppName,
    firebaseAppCount,
    firebaseProjectFingerprint,
    firebaseAuthDomainPresent,
    authObserverAttachedAt,
    firstAuthCallbackAt,
    firstAuthCallbackHadUser,
    persistenceRestoreWaitStartedAt,
    persistenceRestoreWaitCompletedAt,
    persistenceRestoreResult,
    previousPageHadAuthenticatedUser,
    previousPageWasAuthenticated,
    previousRequestedPersistence,
    previousEffectivePersistence,
    previousExplicitSignOutCount,
    previousExplicitSignOutAt,
    previousAutomaticSignOutAt,
    lastPageClosedAt,
    crossTabAuthChangeCount,
    crossTabSignedOutCount,
    lastCrossTabAuthReason,
  };
}

export function recordAppNextNoticeDiagnostics(
  next: Partial<AppNextNoticeDiagnosticsSnapshot>,
): void {
  const comparison = contextComparison(next);
  const mismatch = workspaceMismatch(next);
  noticeDiagnostics = {
    ...noticeDiagnostics,
    firebaseProjectFingerprint: firebaseProjectFingerprint || "-",
    authUserFingerprint: authUserFingerprint || "-",
    firebaseAppName: firebaseAppName || "-",
    firebaseAppCount,
    currentOrigin: typeof window === "undefined" ? "" : window.location.origin,
    ...next,
    ...mismatch,
    ...comparison,
  };
  writeAppNextDiagnosticContext({
    firebaseProjectFingerprint: noticeDiagnostics.firebaseProjectFingerprint,
    authUserFingerprint: noticeDiagnostics.authUserFingerprint,
    serverUsersCurrentWorkspaceFingerprint: noticeDiagnostics.serverUsersCurrentWorkspaceFingerprint,
    resolvedWorkspaceFingerprint: noticeDiagnostics.appSessionWorkspaceFingerprint,
  });
}

export function getAppNextNoticeDiagnostics(): AppNextNoticeDiagnosticsSnapshot {
  return { ...noticeDiagnostics };
}

export function appNextAuthDiagnosticsText(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    channel: "appNextAuthDiagnostics",
    ...getAppNextAuthDiagnostics(),
    ...extra,
  }, null, 2);
}

export function appNextWorkspaceNoticeDiagnosticsText(
  extra: Partial<AppNextNoticeDiagnosticsSnapshot> = {},
): string {
  return JSON.stringify({
    channel: "appNextWorkspaceNoticeDiagnostics",
    ...noticeDiagnostics,
    ...extra,
  }, null, 2);
}

export function addAppNextDiagnosticEvent(
  event: Omit<AppNextDiagnosticEvent, "timestamp">,
): void {
  if (!import.meta.env.DEV) return;

  diagnosticEvents.push({
    ...event,
    timestamp: new Date().toISOString(),
  });

  while (diagnosticEvents.length > MAX_APP_NEXT_DIAGNOSTIC_EVENTS) {
    diagnosticEvents.shift();
  }
}

export function getAppNextDiagnosticEvents(): AppNextDiagnosticEvent[] {
  return diagnosticEvents.map((event) => ({ ...event }));
}

export function appNextDiagnosticsText(): string {
  return JSON.stringify(getAppNextDiagnosticEvents(), null, 2);
}
