import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  getAuthProviderDiagnosticsSnapshot,
} from "../auth/AuthProvider";
import {
  useLegacyAuthAdapter,
} from "../auth/legacy/LegacyAuthAdapter";
import {
  addAppNextDiagnosticEvent,
  getAppNextAuthDiagnostics,
  getAppNextNoticeDiagnostics,
  appNextAuthDiagnosticsText,
  appNextWorkspaceNoticeDiagnosticsText,
  getAppNextDiagnosticEvents,
  getAppNextAuthRouteMatrixDiagnostics,
  getAppNextDashboardDiagnostics,
  getAppNextAccountDiagnostics,
  getAppNextSettingsReadOnlyDiagnostics,
  getAppNextTimetableDiagnostics,
  recordAppNextAuthRouteMatrixDiagnostics,
} from "./appNextDiagnostics";
import {
  appNextAccountState,
  appNextStateMessage,
  type ResolvedAppNextAuthFlag,
} from "./appNextUtils";
import {
  AppNextLogin,
} from "./AppNextLogin";
import {
  AppNextLoginDevices,
} from "./AppNextLoginDevices";
import {
  AppNextNotifications,
} from "./AppNextNotifications";
import {
  AppNextWorkspaceNotices,
} from "./AppNextWorkspaceNotices";
import {
  AppNextDashboardReadOnly,
} from "./AppNextDashboardReadOnly";
import {
  AppNextTimetableReadOnly,
} from "./AppNextTimetableReadOnly";
import {
  AppNextAccountReadOnly,
} from "./AppNextAccountReadOnly";
import {
  AppNextWorkspaceAccessPreview,
} from "./AppNextWorkspaceAccessPreview";
import {
  AppNextAdminAccessPreview,
} from "./AppNextAdminAccessPreview";
import RequireAuth from "../components/guards/RequireAuth";
import RequireWorkspaceRole from "../components/guards/RequireWorkspaceRole";
import {
  ProtectedRoute,
} from "../components/ProtectedRoute";
import {
  currentSearchFromDocument,
  resolveNewAuthRequireAuthFlag,
  type RequireAuthBridgeSnapshot,
} from "../auth/legacy/guards/requireAuthBridgeUtils";
import {
  resolveNewAuthProtectedRouteFlag,
  type ProtectedRouteBridgeSnapshot,
} from "../auth/legacy/guards/protectedRouteBridgeUtils";
import {
  resolveNewAuthRequireWorkspaceRoleFlag,
  type RequireWorkspaceRoleBridgeSnapshot,
} from "../auth/legacy/guards/workspaceRoleBridgeUtils";
import {
  WORKSPACE_ROLES,
} from "../constants/roles";
import {
  getAppNextRouteDiagnostics,
  recordAppNextRouteDiagnostics,
} from "./appNextDiagnostics";
import {
  appNextRouteHash,
  appNextAuthRouteMatrixSnapshot,
  canShowAppNextAdminPreview,
  canShowAppNextWorkspacePreview,
  resolveAppNextRoute,
  type AppNextRoute,
} from "./appNextRouteUtils";

const APP_NEXT_WORKSPACE_PREVIEW_ALLOWED_ROLES = [
  WORKSPACE_ROLES.SUPER_MANAGER,
  WORKSPACE_ROLES.MANAGER,
  WORKSPACE_ROLES.TEACHER,
] as const;

function ValueRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function booleanLabel(value: boolean | null | undefined): string {
  if (value === true) return "예";
  if (value === false) return "아니오";
  return "-";
}

function valueOrDash(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function AppNextDiagnostics({
  adapterPresent,
  featureSource,
  phase,
  status,
  authUserExists,
  sessionExists,
}: {
  adapterPresent: boolean;
  featureSource: ResolvedAppNextAuthFlag["source"];
  phase: string;
  status: string;
  authUserExists: boolean;
  sessionExists: boolean;
}) {
  if (!import.meta.env.DEV) return null;
  const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
  const appNextAuthDiagnostics = getAppNextAuthDiagnostics();
  const noticeDiagnostics = getAppNextNoticeDiagnostics();
  const authRouteMatrixDiagnostics = getAppNextAuthRouteMatrixDiagnostics();
  const dashboardDiagnostics = getAppNextDashboardDiagnostics();
  const accountDiagnostics = getAppNextAccountDiagnostics();
  const settingsDiagnostics = getAppNextSettingsReadOnlyDiagnostics();
  const timetableDiagnostics = getAppNextTimetableDiagnostics();
  const recentEvents = getAppNextDiagnosticEvents();

  return (
    <section className="app-next-panel app-next-diagnostics">
      <h2>개발 전용 진단</h2>
      <dl>
        <ValueRow label="entry" value="app-next" />
        <ValueRow label="provider" value="new" />
        <ValueRow label="auth mode" value="new-default" />
        <ValueRow label="feature source" value={featureSource} />
        <ValueRow label="legacy AuthContext mounted" value="false" />
        <ValueRow label="LegacyAuthAdapter mounted" value={booleanLabel(adapterPresent)} />
        <ValueRow label="Firestore write" value="none" />
        <ValueRow label="automatic signOut" value="none" />
        <ValueRow label="operational static app" value="unchanged" />
        <ValueRow label="requestedPersistence" value={appNextAuthDiagnostics.requestedPersistence} />
        <ValueRow label="effectivePersistence" value={appNextAuthDiagnostics.effectivePersistence} />
        <ValueRow label="persistenceSetSucceeded" value={booleanLabel(appNextAuthDiagnostics.persistenceSetSucceeded)} />
        <ValueRow label="persistenceSetCount" value={String(appNextAuthDiagnostics.persistenceSetCount)} />
        <ValueRow label="persistenceSetFailedCount" value={String(appNextAuthDiagnostics.persistenceSetFailedCount)} />
        <ValueRow label="persistenceSetErrorKind" value={appNextAuthDiagnostics.persistenceSetErrorKind} />
        <ValueRow label="signInProvider" value={appNextAuthDiagnostics.signInProvider} />
        <ValueRow label="authStateChangeCount" value={String(appNextAuthDiagnostics.authStateChangeCount)} />
        <ValueRow label="explicitSignOutCount" value={String(appNextAuthDiagnostics.explicitSignOutCount)} />
        <ValueRow label="automaticSignOutCount" value={String(appNextAuthDiagnostics.automaticSignOutCount)} />
        <ValueRow label="lastSignOutReason" value={appNextAuthDiagnostics.lastSignOutReason} />
        <ValueRow label="lastAuthStateReason" value={appNextAuthDiagnostics.lastAuthStateReason} />
        <ValueRow label="currentOrigin" value={appNextAuthDiagnostics.currentOrigin} />
        <ValueRow label="firebaseAppInitializedAt" value={valueOrDash(appNextAuthDiagnostics.firebaseAppInitializedAt)} />
        <ValueRow label="authInstanceCreatedAt" value={valueOrDash(appNextAuthDiagnostics.authInstanceCreatedAt)} />
        <ValueRow label="firebaseAppName" value={valueOrDash(appNextAuthDiagnostics.firebaseAppName)} />
        <ValueRow label="firebaseAppCount" value={String(appNextAuthDiagnostics.firebaseAppCount)} />
        <ValueRow label="firebaseProjectFingerprint" value={valueOrDash(appNextAuthDiagnostics.firebaseProjectFingerprint)} />
        <ValueRow label="firebaseAuthDomainPresent" value={booleanLabel(appNextAuthDiagnostics.firebaseAuthDomainPresent)} />
        <ValueRow label="authObserverAttachedAt" value={valueOrDash(appNextAuthDiagnostics.authObserverAttachedAt)} />
        <ValueRow label="firstAuthCallbackAt" value={valueOrDash(appNextAuthDiagnostics.firstAuthCallbackAt)} />
        <ValueRow label="firstAuthCallbackHadUser" value={booleanLabel(appNextAuthDiagnostics.firstAuthCallbackHadUser)} />
        <ValueRow label="persistenceRestoreWaitStartedAt" value={valueOrDash(appNextAuthDiagnostics.persistenceRestoreWaitStartedAt)} />
        <ValueRow label="persistenceRestoreWaitCompletedAt" value={valueOrDash(appNextAuthDiagnostics.persistenceRestoreWaitCompletedAt)} />
        <ValueRow label="persistenceRestoreResult" value={appNextAuthDiagnostics.persistenceRestoreResult} />
        <ValueRow label="previousPageHadAuthenticatedUser" value={booleanLabel(appNextAuthDiagnostics.previousPageHadAuthenticatedUser)} />
        <ValueRow label="previousPageWasAuthenticated" value={booleanLabel(appNextAuthDiagnostics.previousPageWasAuthenticated)} />
        <ValueRow label="previousRequestedPersistence" value={appNextAuthDiagnostics.previousRequestedPersistence} />
        <ValueRow label="previousEffectivePersistence" value={appNextAuthDiagnostics.previousEffectivePersistence} />
        <ValueRow label="previousExplicitSignOutCount" value={String(appNextAuthDiagnostics.previousExplicitSignOutCount)} />
        <ValueRow label="previousExplicitSignOutAt" value={valueOrDash(appNextAuthDiagnostics.previousExplicitSignOutAt)} />
        <ValueRow label="previousAutomaticSignOutAt" value={valueOrDash(appNextAuthDiagnostics.previousAutomaticSignOutAt)} />
        <ValueRow label="lastPageClosedAt" value={valueOrDash(appNextAuthDiagnostics.lastPageClosedAt)} />
        <ValueRow label="crossTabAuthChangeCount" value={String(appNextAuthDiagnostics.crossTabAuthChangeCount)} />
        <ValueRow label="crossTabSignedOutCount" value={String(appNextAuthDiagnostics.crossTabSignedOutCount)} />
        <ValueRow label="lastCrossTabAuthReason" value={appNextAuthDiagnostics.lastCrossTabAuthReason} />
        <ValueRow label="phase" value={phase} />
        <ValueRow label="status" value={status} />
        <ValueRow label="auth user exists" value={booleanLabel(authUserExists)} />
        <ValueRow label="session exists" value={booleanLabel(sessionExists)} />
        <ValueRow label="provider mount count" value={String(authDiagnostics.authProviderMountCount)} />
        <ValueRow label="listener count" value={String(authDiagnostics.authStateListenerCount)} />
        <ValueRow label="session load count" value={String(authDiagnostics.sessionLoadCount)} />
        <ValueRow label="session read count" value={String(authDiagnostics.sessionReadCount)} />
        <ValueRow label="session write count" value={String(authDiagnostics.sessionWriteCount)} />
        <ValueRow label="bootstrap attempt count" value={String(authDiagnostics.bootstrapAttemptCount)} />
        <ValueRow label="bootstrap blocked count" value={String(authDiagnostics.bootstrapBlockedCount)} />
        <ValueRow label="resource exhausted" value={booleanLabel(authDiagnostics.resourceExhausted)} />
        <ValueRow label="routeMatrix.currentRoute" value={authRouteMatrixDiagnostics.currentRoute} />
        <ValueRow label="routeMatrix.requestedRoute" value={authRouteMatrixDiagnostics.requestedRoute} />
        <ValueRow label="routeMatrix.requireAuthDecision" value={authRouteMatrixDiagnostics.requireAuthDecision} />
        <ValueRow label="routeMatrix.protectedRouteDecision" value={authRouteMatrixDiagnostics.protectedRouteDecision} />
        <ValueRow label="routeMatrix.requireWorkspaceRoleDecision" value={authRouteMatrixDiagnostics.requireWorkspaceRoleDecision} />
        <ValueRow label="routeMatrix.finalDecision" value={authRouteMatrixDiagnostics.finalDecision} />
        <ValueRow label="routeMatrix.policyMismatchDetected" value={booleanLabel(authRouteMatrixDiagnostics.policyMismatchDetected)} />
        <ValueRow label="routeMatrix.firestoreReadCount" value={String(authRouteMatrixDiagnostics.firestoreReadCount)} />
        <ValueRow label="routeMatrix.firestoreWriteAttemptCount" value={String(authRouteMatrixDiagnostics.firestoreWriteAttemptCount)} />
        <ValueRow label="routeMatrix.workspaceListenerCount" value={String(authRouteMatrixDiagnostics.workspaceListenerCount)} />
        <ValueRow label="dashboard.loading" value={booleanLabel(dashboardDiagnostics.loading)} />
        <ValueRow label="dashboard.errorCode" value={dashboardDiagnostics.errorCode} />
        <ValueRow label="dashboard.renderCount" value={String(dashboardDiagnostics.dashboardRenderCount)} />
        <ValueRow label="dashboard.readCount" value={String(dashboardDiagnostics.dashboardReadCount)} />
        <ValueRow label="dashboard.writeAttemptCount" value={String(dashboardDiagnostics.dashboardWriteAttemptCount)} />
        <ValueRow label="dashboard.activeListenerCount" value={String(dashboardDiagnostics.dashboardActiveListenerCount)} />
        <ValueRow label="dashboard.noticeSummaryLoadCount" value={String(dashboardDiagnostics.noticeSummaryLoadCount)} />
        <ValueRow label="dashboard.noticeFetchedCount" value={String(dashboardDiagnostics.noticeFetchedCount)} />
        <ValueRow label="dashboard.noticeVisibleCount" value={String(dashboardDiagnostics.noticeVisibleCount)} />
        <ValueRow label="dashboard.noticeSummaryCount" value={String(dashboardDiagnostics.noticeSummaryCount)} />
        <ValueRow label="dashboard.duplicateNoticeLoadDetected" value={booleanLabel(dashboardDiagnostics.duplicateNoticeLoadDetected)} />
        <ValueRow label="account.accountReadCount" value={String(accountDiagnostics.accountReadCount)} />
        <ValueRow label="account.accountWriteAttemptCount" value={String(accountDiagnostics.accountWriteAttemptCount)} />
        <ValueRow label="account.accountActiveListenerCount" value={String(accountDiagnostics.accountActiveListenerCount)} />
        <ValueRow label="account.providerCategory" value={accountDiagnostics.providerCategory} />
        <ValueRow label="account.persistenceMode" value={accountDiagnostics.persistenceMode} />
        <ValueRow label="account.sensitiveValueDetected" value={booleanLabel(accountDiagnostics.sensitiveValueDetected)} />
        <ValueRow label="settings.readOnlyMode" value={booleanLabel(settingsDiagnostics.readOnlyMode)} />
        <ValueRow label="settings.writeControlCount" value={String(settingsDiagnostics.writeControlCount)} />
        <ValueRow label="settings.writeAttemptCount" value={String(settingsDiagnostics.writeAttemptCount)} />
        <ValueRow label="settings.sensitiveValueDetected" value={booleanLabel(settingsDiagnostics.sensitiveValueDetected)} />
        <ValueRow label="timetable.timetableReadCount" value={String(timetableDiagnostics.timetableReadCount)} />
        <ValueRow label="timetable.timetableWriteAttemptCount" value={String(timetableDiagnostics.timetableWriteAttemptCount)} />
        <ValueRow label="timetable.timetableActiveListenerCount" value={String(timetableDiagnostics.timetableActiveListenerCount)} />
        <ValueRow label="timetable.duplicateCellGroupCount" value={String(timetableDiagnostics.duplicateCellGroupCount)} />
        <ValueRow label="timetable.sensitiveValueDetected" value={booleanLabel(timetableDiagnostics.sensitiveValueDetected)} />
        <ValueRow label="notice.lastRequestedReadMode" value={noticeDiagnostics.lastRequestedReadMode} />
        <ValueRow label="notice.lastCompletedReadMode" value={noticeDiagnostics.lastCompletedReadMode} />
        <ValueRow label="notice.lastErrorKind" value={noticeDiagnostics.lastErrorKind} />
        <ValueRow label="notice.workspacePresent" value={booleanLabel(noticeDiagnostics.workspacePresent)} />
        <ValueRow label="notice.workspaceRole" value={noticeDiagnostics.workspaceRole} />
        <ValueRow label="notice.rawReadCount" value={String(noticeDiagnostics.rawReadCount)} />
        <ValueRow label="notice.filteredCount" value={String(noticeDiagnostics.filteredCount)} />
        <ValueRow label="notice.displayedCount" value={String(noticeDiagnostics.displayedCount)} />
        <ValueRow label="notice.fromCache" value={noticeDiagnostics.fromCache} />
        <ValueRow label="notice.pendingWrites" value={noticeDiagnostics.pendingWrites} />
        <ValueRow label="notice.currentWorkspaceFingerprint" value={noticeDiagnostics.currentWorkspaceFingerprint} />
        <ValueRow label="notice.appSessionWorkspaceFingerprint" value={noticeDiagnostics.appSessionWorkspaceFingerprint} />
        <ValueRow label="notice.serverUsersDocumentFound" value={booleanLabel(noticeDiagnostics.serverUsersDocumentFound)} />
        <ValueRow label="notice.serverUsersReadErrorKind" value={noticeDiagnostics.serverUsersReadErrorKind} />
        <ValueRow label="notice.serverUsersCurrentWorkspaceFingerprint" value={noticeDiagnostics.serverUsersCurrentWorkspaceFingerprint} />
        <ValueRow label="notice.noticeReadWriteTargetWorkspaceFingerprint" value={noticeDiagnostics.noticeReadWriteTargetWorkspaceFingerprint} />
        <ValueRow label="notice.canonicalSource" value={noticeDiagnostics.canonicalSource} />
        <ValueRow label="notice.workspaceMismatchDetected" value={booleanLabel(noticeDiagnostics.workspaceMismatchDetected)} />
        <ValueRow label="notice.workspaceMismatchKind" value={noticeDiagnostics.workspaceMismatchKind} />
        <ValueRow label="notice.databaseIdKind" value={noticeDiagnostics.databaseIdKind} />
        <ValueRow label="notice.noticeCollectionKind" value={noticeDiagnostics.noticeCollectionKind} />
        <ValueRow label="notice.sameFirebaseProject" value={noticeDiagnostics.sameFirebaseProject} />
        <ValueRow label="notice.sameAuthUser" value={noticeDiagnostics.sameAuthUser} />
        <ValueRow label="notice.sameServerUsersCurrentWorkspace" value={noticeDiagnostics.sameServerUsersCurrentWorkspace} />
        <ValueRow label="notice.sameResolvedWorkspace" value={noticeDiagnostics.sameResolvedWorkspace} />
        <ValueRow label="notice.listenerCount" value={String(noticeDiagnostics.listenerCount)} />
        <ValueRow label="notice.writeApiImported" value={booleanLabel(noticeDiagnostics.writeApiImported)} />
        <ValueRow label="notice.automaticSignOut" value={noticeDiagnostics.automaticSignOut} />
        <ValueRow label="build marker" value="app-next-auth-default-v1" />
      </dl>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          void navigator.clipboard?.writeText(appNextAuthDiagnosticsText({
            phase,
            status,
            authUserExists,
            sessionExists,
          }));
        }}
      >
        인증 진단 복사
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          void navigator.clipboard?.writeText(appNextWorkspaceNoticeDiagnosticsText({
            phase,
            status,
            workspacePresent: noticeDiagnostics.workspacePresent,
            workspaceRole: noticeDiagnostics.workspaceRole,
            automaticSignOut: "none",
          }));
        }}
      >
        공지 진단 복사
      </button>
      <p>최근 진단 이벤트 {recentEvents.length}개가 민감정보 없이 메모리에 보관됩니다.</p>
    </section>
  );
}

function AppNextDiagnosticsDrawer({
  adapterPresent,
  featureSource,
  phase,
  status,
  authUserExists,
  sessionExists,
}: {
  adapterPresent: boolean;
  featureSource: ResolvedAppNextAuthFlag["source"];
  phase: string;
  status: string;
  authUserExists: boolean;
  sessionExists: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <button
        type="button"
        className="app-next-diagnostics-toggle"
        onClick={() => setOpen(true)}
      >
        개발 진단 열기
      </button>
      {open ? (
        <div className="app-next-diagnostics-drawer" role="dialog" aria-modal="true" aria-label="개발 진단">
          <div className="app-next-diagnostics-drawer-head">
            <strong>개발 진단</strong>
            <button type="button" className="secondary" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
          <AppNextDiagnostics
            adapterPresent={adapterPresent}
            featureSource={featureSource}
            phase={phase}
            status={status}
            authUserExists={authUserExists}
            sessionExists={sessionExists}
          />
        </div>
      ) : null}
    </>
  );
}

type AppNextTab =
  | "dashboard"
  | "account"
  | "settings-readonly"
  | "timetable-readonly"
  | "devices"
  | "notifications"
  | "workspace-notices"
  | "admin-preview"
  | "workspace-preview"
  | "workspace-required"
  | "access-denied";

function AppNextRouteOnlyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="app-next-panel">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

export function AppNext({
  featureSource = "default",
}: {
  featureSource?: ResolvedAppNextAuthFlag["source"];
}) {
  const {
    phase,
    firebaseUser,
    session,
    error,
  } = useAuth();
  const legacyAdapter = useLegacyAuthAdapter();
  const [hashRoute, setHashRoute] = useState(() => (
    typeof window === "undefined" ? "#/dashboard" : window.location.hash
  ));
  const [routeDiagnosticsView, setRouteDiagnosticsView] = useState(() => getAppNextRouteDiagnostics());

  const state = appNextAccountState({
    phase,
    session,
    hasError: Boolean(error),
    errorCode: error?.code ?? null,
  });
  const stateMessage = appNextStateMessage(state);
  const routeDecision = useMemo(
    () => resolveAppNextRoute({
      hash: hashRoute,
      state,
    }),
    [
      hashRoute,
      state,
    ],
  );
  const activeTab: AppNextTab =
    routeDecision.currentRoute === "dashboard"
      ? "dashboard"
      : routeDecision.currentRoute === "account"
        ? "account"
      : routeDecision.currentRoute === "settings-readonly"
        ? "settings-readonly"
        : routeDecision.currentRoute === "timetable-readonly"
          ? "timetable-readonly"
        : routeDecision.currentRoute === "devices"
      ? "devices"
      : routeDecision.currentRoute === "notifications"
        ? "notifications"
        : routeDecision.currentRoute === "notices"
          ? "workspace-notices"
          : routeDecision.currentRoute === "admin-preview"
            ? "admin-preview"
            : routeDecision.currentRoute === "workspace-preview"
              ? "workspace-preview"
              : routeDecision.currentRoute === "workspace-required"
                ? "workspace-required"
                : routeDecision.currentRoute === "access-denied"
                  ? "access-denied"
          : "account";
  const showMainNavigation = ![
    "login",
    "pending",
    "rejected",
    "disabled",
    "error",
  ].includes(routeDecision.currentRoute);
  const pageTitle = activeTab === "dashboard"
    ? "메인 대시보드"
    : activeTab === "timetable-readonly"
      ? "시간표 조회"
      : "계정·설정";
  const requireAuthEnabled = resolveNewAuthRequireAuthFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH,
    isDev: import.meta.env.DEV,
  });
  const protectedRouteEnabled = resolveNewAuthProtectedRouteFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE,
    isDev: import.meta.env.DEV,
    defaultEnabled: true,
  });
  const requireWorkspaceRoleEnabled = resolveNewAuthRequireWorkspaceRoleFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE,
    isDev: import.meta.env.DEV,
    defaultEnabled: true,
  });
  const adminPreviewMenuVisible = canShowAppNextAdminPreview(session);
  const workspacePreviewMenuVisible = canShowAppNextWorkspacePreview(session);
  const routeMatrix = useMemo(
    () => appNextAuthRouteMatrixSnapshot({
      requestedRoute: routeDecision.requestedRoute,
      currentRoute: routeDecision.currentRoute,
      state,
      session,
      requireAuthEnabled,
      protectedRouteEnabled,
      requireWorkspaceRoleEnabled,
    }),
    [
      protectedRouteEnabled,
      requireAuthEnabled,
      requireWorkspaceRoleEnabled,
      routeDecision.currentRoute,
      routeDecision.requestedRoute,
      session,
      state,
    ],
  );

  useEffect(() => {
    const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
    addAppNextDiagnosticEvent({
      event: "app-next-state",
      phase,
      status: session?.status ?? error?.code ?? state,
      featureSource,
      authUserExists: Boolean(firebaseUser),
      sessionExists: Boolean(session),
      providerMountCount: authDiagnostics.authProviderMountCount,
      listenerCount: authDiagnostics.authStateListenerCount,
      sessionLoadCount: authDiagnostics.sessionLoadCount,
      sessionReadCount: authDiagnostics.sessionReadCount,
      sessionWriteCount: authDiagnostics.sessionWriteCount,
      bootstrapAttemptCount: authDiagnostics.bootstrapAttemptCount,
      bootstrapBlockedCount: authDiagnostics.bootstrapBlockedCount,
      resourceExhausted: authDiagnostics.resourceExhausted,
    });
  }, [
    error?.code,
    firebaseUser,
    featureSource,
    phase,
    session,
    state,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    recordAppNextRouteDiagnostics({
      routeRestoreAttemptCount: 1,
      routeRestoreSuccessCount: 1,
    });
    const handleHashChange = () => {
      setHashRoute(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    recordAppNextRouteDiagnostics({
      requestedRoute: routeDecision.requestedRoute,
      currentRoute: routeDecision.currentRoute,
      fallbackReason: routeDecision.fallbackReason,
      routeRenderDelta: 1,
      requireAuthConsumerMounted: (
        (routeDecision.currentRoute === "dashboard" && requireAuthEnabled) ||
        (routeDecision.currentRoute === "account" && requireAuthEnabled) ||
        (routeDecision.currentRoute === "settings-readonly" && requireAuthEnabled) ||
        (routeDecision.currentRoute === "timetable-readonly" && requireAuthEnabled) ||
        (routeDecision.currentRoute === "notices" && requireAuthEnabled) ||
        (routeDecision.currentRoute === "admin-preview" && protectedRouteEnabled) ||
        (routeDecision.currentRoute === "workspace-preview" && protectedRouteEnabled && requireWorkspaceRoleEnabled)
      ),
      lastBlockedReason: routeDecision.currentRoute === "notices" && !requireAuthEnabled
        ? "require-auth-flag-off"
        : routeDecision.currentRoute === "dashboard" && !requireAuthEnabled
          ? "require-auth-flag-off"
        : routeDecision.currentRoute === "account" && !requireAuthEnabled
          ? "require-auth-flag-off"
        : routeDecision.currentRoute === "settings-readonly" && !requireAuthEnabled
          ? "require-auth-flag-off"
        : routeDecision.currentRoute === "timetable-readonly" && !requireAuthEnabled
          ? "require-auth-flag-off"
        : routeDecision.currentRoute === "admin-preview" && !protectedRouteEnabled
          ? "protected-route-flag-off"
          : routeDecision.currentRoute === "workspace-preview" && !requireWorkspaceRoleEnabled
            ? "require-workspace-role-flag-off"
          : "none",
    });
    setRouteDiagnosticsView(getAppNextRouteDiagnostics());
  }, [
    protectedRouteEnabled,
    requireAuthEnabled,
    requireWorkspaceRoleEnabled,
    routeDecision.currentRoute,
    routeDecision.fallbackReason,
    routeDecision.requestedRoute,
  ]);

  useEffect(() => {
    const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
    recordAppNextAuthRouteMatrixDiagnostics({
      ...routeMatrix,
      accountPhase: phase,
      authListenerCount: authDiagnostics.authStateListenerCount,
      redirectCount: getAppNextRouteDiagnostics().routeRedirectCount,
      protectedChildRenderCount: getAppNextRouteDiagnostics().protectedRouteRenderCount,
      firestoreReadCount: 0,
      firestoreWriteAttemptCount: 0,
      workspaceListenerCount: 0,
      restoreConflictDetected: false,
    });
  }, [
    phase,
    routeMatrix,
  ]);

  const handleRoute = useCallback((route: AppNextRoute) => {
    if (typeof window === "undefined") return;
    const nextHash = appNextRouteHash(route);
    if (window.location.hash === nextHash) {
      setHashRoute(nextHash);
      return;
    }
    window.location.hash = nextHash;
  }, []);

  const handleRequireAuthSnapshot = useCallback((snapshot: RequireAuthBridgeSnapshot) => {
    recordAppNextRouteDiagnostics({
      requestedRoute: routeDecision.requestedRoute,
      currentRoute: routeDecision.currentRoute,
      protectedRouteRenderDelta: 1,
      requireAuthConsumerMounted: true,
      lastBlockedReason: snapshot.childrenRendered ? "none" : snapshot.decision.reason,
    });
  }, [
    routeDecision.currentRoute,
    routeDecision.requestedRoute,
  ]);

  const handleProtectedRouteSnapshot = useCallback((snapshot: ProtectedRouteBridgeSnapshot) => {
    recordAppNextRouteDiagnostics({
      requestedRoute: routeDecision.requestedRoute,
      currentRoute: routeDecision.currentRoute,
      protectedRouteRenderDelta: 1,
      lastBlockedReason: snapshot.childrenRendered ? "none" : snapshot.decision.reason,
    });
  }, [
    routeDecision.currentRoute,
    routeDecision.requestedRoute,
  ]);

  const handleRequireWorkspaceRoleSnapshot = useCallback((snapshot: RequireWorkspaceRoleBridgeSnapshot) => {
    recordAppNextRouteDiagnostics({
      requestedRoute: routeDecision.requestedRoute,
      currentRoute: routeDecision.currentRoute,
      lastBlockedReason: snapshot.childrenRendered ? "none" : snapshot.decision.reason,
    });
  }, [
    routeDecision.currentRoute,
    routeDecision.requestedRoute,
  ]);

  const handleRefreshRouteDiagnostics = useCallback(() => {
    setRouteDiagnosticsView(getAppNextRouteDiagnostics());
  }, []);

  return (
    <main className="app-next-shell">
      <header className="app-next-header">
        <p>App Next 읽기 전용</p>
        <h1>{pageTitle}</h1>
        <span className={`app-next-badge app-next-${stateMessage.tone}`}>
          {stateMessage.title}
        </span>
      </header>

      {showMainNavigation ? (
        <nav className="app-next-tabs" aria-label="App Next 화면">
          <button
            type="button"
            className={activeTab === "dashboard" ? "active" : "secondary"}
            onClick={() => handleRoute("dashboard")}
          >
            대시보드
          </button>
          <button
            type="button"
            className={activeTab === "account" ? "active" : "secondary"}
            onClick={() => handleRoute("account")}
          >
            계정 상태
          </button>
          <button
            type="button"
            className={activeTab === "settings-readonly" ? "active" : "secondary"}
            onClick={() => handleRoute("settings-readonly")}
          >
            설정 요약
          </button>
          <button
            type="button"
            className={activeTab === "timetable-readonly" ? "active" : "secondary"}
            onClick={() => handleRoute("timetable-readonly")}
          >
            시간표 조회
          </button>
          <button
            type="button"
            className={activeTab === "devices" ? "active" : "secondary"}
            onClick={() => handleRoute("devices")}
          >
            로그인 기기
          </button>
          <button
            type="button"
            className={activeTab === "notifications" ? "active" : "secondary"}
            onClick={() => handleRoute("notifications")}
          >
            알림
          </button>
          <button
            type="button"
            className={activeTab === "workspace-notices" ? "active" : "secondary"}
            onClick={() => handleRoute("notices")}
          >
            워크스페이스 공지
          </button>
          {adminPreviewMenuVisible ? (
            <button
              type="button"
              className={activeTab === "admin-preview" ? "active" : "secondary"}
              onClick={() => handleRoute("admin-preview")}
            >
              Admin Preview
            </button>
          ) : null}
          {workspacePreviewMenuVisible ? (
            <button
              type="button"
              className={activeTab === "workspace-preview" ? "active" : "secondary"}
              onClick={() => handleRoute("workspace-preview")}
            >
              Workspace Preview
            </button>
          ) : null}
        </nav>
      ) : null}

      <section className={`app-next-card app-next-${stateMessage.tone}`}>
        <h2>{stateMessage.title}</h2>
        <p>{stateMessage.body}</p>
      </section>

      {routeDecision.currentRoute === "login" ? (
        state === "loading" ? (
          <AppNextRouteOnlyPanel title={stateMessage.title} body={stateMessage.body} />
        ) : (
          <AppNextLogin />
        )
      ) : routeDecision.currentRoute === "pending" ||
        routeDecision.currentRoute === "rejected" ||
        routeDecision.currentRoute === "disabled" ||
        routeDecision.currentRoute === "error" ? (
        <AppNextRouteOnlyPanel title={stateMessage.title} body={stateMessage.body} />
      ) : activeTab === "dashboard" ? (
        requireAuthEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <AppNextDashboardReadOnly onNavigate={handleRoute} />
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="RequireAuth rollback mode"
            body="The app-next dashboard pilot is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH or ?newAuthRequireAuth=off."
          />
        )
      ) : activeTab === "account" ? (
        requireAuthEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <AppNextAccountReadOnly
              screen="account"
              currentRoute={routeDecision.currentRoute}
              requestedRoute={routeDecision.requestedRoute}
              requireAuthMode="new"
              protectedRouteMode={protectedRouteEnabled ? "new" : "legacy"}
              requireWorkspaceRoleMode={requireWorkspaceRoleEnabled ? "new" : "legacy"}
              onNavigate={(route) => handleRoute(route)}
            />
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="RequireAuth rollback mode"
            body="The app-next account pilot is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH or ?newAuthRequireAuth=off."
          />
        )
      ) : activeTab === "settings-readonly" ? (
        requireAuthEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <AppNextAccountReadOnly
              screen="settings-readonly"
              currentRoute={routeDecision.currentRoute}
              requestedRoute={routeDecision.requestedRoute}
              requireAuthMode="new"
              protectedRouteMode={protectedRouteEnabled ? "new" : "legacy"}
              requireWorkspaceRoleMode={requireWorkspaceRoleEnabled ? "new" : "legacy"}
              onNavigate={(route) => handleRoute(route)}
            />
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="RequireAuth rollback mode"
            body="The app-next settings read-only pilot is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH or ?newAuthRequireAuth=off."
          />
        )
      ) : activeTab === "timetable-readonly" ? (
        requireAuthEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <AppNextTimetableReadOnly
              currentRoute={routeDecision.currentRoute}
              requestedRoute={routeDecision.requestedRoute}
              onNavigate={(route) => handleRoute(route)}
            />
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="RequireAuth rollback mode"
            body="The app-next timetable read-only pilot is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH or ?newAuthRequireAuth=off."
          />
        )
      ) : activeTab === "devices" ? (
        <AppNextLoginDevices />
      ) : activeTab === "notifications" ? (
        <AppNextNotifications />
      ) : activeTab === "admin-preview" ? (
        protectedRouteEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <ProtectedRoute
              menuKey="admin"
              previewMode
              useExistingAuthProvider
              defaultNewAuth
              currentRoute={routeDecision.currentRoute}
              requestedRoute={routeDecision.requestedRoute}
              requiredPolicy="admin"
              onSnapshot={handleProtectedRouteSnapshot}
            >
              <AppNextAdminAccessPreview />
            </ProtectedRoute>
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="ProtectedRoute rollback mode"
            body="The app-next admin preview route is disabled by VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE or ?newAuthProtectedRoute=off."
          />
        )
      ) : activeTab === "workspace-preview" ? (
        requireWorkspaceRoleEnabled ? (
          <RequireAuth
            previewMode
            useExistingAuthProvider
            onSnapshot={handleRequireAuthSnapshot}
          >
            <ProtectedRoute
              previewMode
              useExistingAuthProvider
              defaultNewAuth
              currentRoute={routeDecision.currentRoute}
              requestedRoute={routeDecision.requestedRoute}
              requiredPolicy="workspace-preview"
              onSnapshot={handleProtectedRouteSnapshot}
            >
              <RequireWorkspaceRole
                allowedRoles={APP_NEXT_WORKSPACE_PREVIEW_ALLOWED_ROLES}
                allowSystemOwnerBypass
                requireWorkspace
                previewMode
                useExistingAuthProvider
                defaultNewAuth
                currentRoute={routeDecision.currentRoute}
                requestedRoute={routeDecision.requestedRoute}
                menuVisible={workspacePreviewMenuVisible}
                onSnapshot={handleRequireWorkspaceRoleSnapshot}
              >
                <AppNextWorkspaceAccessPreview />
              </RequireWorkspaceRole>
            </ProtectedRoute>
          </RequireAuth>
        ) : (
          <AppNextRouteOnlyPanel
            title="RequireWorkspaceRole rollback mode"
            body="The app-next workspace preview route is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE or ?newAuthRequireWorkspaceRole=off."
          />
        )
      ) : activeTab === "workspace-required" ? (
        <AppNextRouteOnlyPanel
          title="Workspace required"
          body="A selected workspace is required for this read-only pilot. Your login session is kept."
        />
      ) : activeTab === "access-denied" ? (
        <AppNextRouteOnlyPanel
          title="Access denied"
          body="You do not have permission to view this app-next route. Your login session is kept."
        />
      ) : requireAuthEnabled ? (
        <RequireAuth
          previewMode
          useExistingAuthProvider
          onSnapshot={handleRequireAuthSnapshot}
        >
          <AppNextWorkspaceNotices />
        </RequireAuth>
      ) : (
        <AppNextRouteOnlyPanel
          title="RequireAuth rollback mode"
          body="The protected workspace notices pilot is disabled by VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH or ?newAuthRequireAuth=off."
        />
      )}

      {import.meta.env.DEV ? (
        <section className="app-next-panel app-next-diagnostics">
          <h2>App Next Route Diagnostics</h2>
          <dl>
            <ValueRow label="currentRoute" value={routeDiagnosticsView.currentRoute} />
            <ValueRow label="requestedRoute" value={routeDiagnosticsView.requestedRoute} />
            <ValueRow label="fallbackReason" value={routeDiagnosticsView.fallbackReason} />
            <ValueRow label="requireAuthConsumerMounted" value={booleanLabel(routeDiagnosticsView.requireAuthConsumerMounted)} />
            <ValueRow label="protectedRouteRenderCount" value={String(routeDiagnosticsView.protectedRouteRenderCount)} />
          </dl>
          <button
            type="button"
            className="secondary"
            onClick={handleRefreshRouteDiagnostics}
          >
            진단 새로고침
          </button>
        </section>
      ) : null}

      <AppNextDiagnosticsDrawer
        adapterPresent={Boolean(legacyAdapter)}
        featureSource={featureSource}
        phase={phase}
        status={session?.status ?? error?.code ?? state}
        authUserExists={Boolean(firebaseUser)}
        sessionExists={Boolean(session)}
      />
    </main>
  );
}
