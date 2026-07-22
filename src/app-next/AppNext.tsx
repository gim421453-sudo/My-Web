import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  sendEmailVerification,
} from "firebase/auth";
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
} from "./appNextDiagnostics";
import {
  appNextAccountState,
  appNextStateMessage,
  maskAppNextEmail,
  type ResolvedAppNextAuthFlag,
  safeEmailVerificationErrorMessage,
  verificationStatusLabel,
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
import RequireAuth from "../components/guards/RequireAuth";
import {
  currentSearchFromDocument,
  resolveNewAuthRequireAuthFlag,
  type RequireAuthBridgeSnapshot,
} from "../auth/legacy/guards/requireAuthBridgeUtils";
import {
  getAppNextRouteDiagnostics,
  recordAppNextRouteDiagnostics,
} from "./appNextDiagnostics";
import {
  appNextRouteHash,
  resolveAppNextRoute,
  type AppNextRoute,
} from "./appNextRouteUtils";

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
  | "account"
  | "devices"
  | "notifications"
  | "workspace-notices";

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
    reloadSession,
  } = useAuth();
  const legacyAdapter = useLegacyAuthAdapter();
  const [sendBusy, setSendBusy] = useState(false);
  const [reloadBusy, setReloadBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hashRoute, setHashRoute] = useState(() => (
    typeof window === "undefined" ? "#/dashboard" : window.location.hash
  ));

  const emailVerified = session?.emailVerified ?? firebaseUser?.emailVerified;
  const state = appNextAccountState({
    phase,
    session,
    hasError: Boolean(error),
    errorCode: error?.code ?? null,
  });
  const stateMessage = appNextStateMessage(state);
  const maskedEmail = maskAppNextEmail(session?.email ?? firebaseUser?.email);
  const isLoading = state === "loading";
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
    routeDecision.currentRoute === "devices"
      ? "devices"
      : routeDecision.currentRoute === "notifications"
        ? "notifications"
        : routeDecision.currentRoute === "notices"
          ? "workspace-notices"
          : "account";
  const showMainNavigation = ![
    "login",
    "pending",
    "rejected",
    "disabled",
    "error",
  ].includes(routeDecision.currentRoute);
  const requireAuthEnabled = resolveNewAuthRequireAuthFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH,
    isDev: import.meta.env.DEV,
  });

  const warningCount = useMemo(
    () => session?.warnings.length ?? 0,
    [session],
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
      requireAuthConsumerMounted: routeDecision.currentRoute === "notices" && requireAuthEnabled,
      lastBlockedReason: routeDecision.currentRoute === "notices" && !requireAuthEnabled
        ? "require-auth-flag-off"
        : "none",
    });
  }, [
    requireAuthEnabled,
    routeDecision.currentRoute,
    routeDecision.fallbackReason,
    routeDecision.requestedRoute,
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

  const handleSendVerification = useCallback(async () => {
    if (sendBusy || !firebaseUser) return;

    if (firebaseUser.emailVerified) {
      setMessage("이미 이메일 인증이 완료된 계정입니다.");
      return;
    }

    setSendBusy(true);
    setMessage("");

    try {
      await sendEmailVerification(firebaseUser);
      setMessage("인증 메일을 보냈습니다. 메일함을 확인해 주세요.");
    } catch (sendError) {
      setMessage(safeEmailVerificationErrorMessage(sendError));
    } finally {
      setSendBusy(false);
    }
  }, [
    firebaseUser,
    sendBusy,
  ]);

  const handleReload = useCallback(async () => {
    if (reloadBusy) return;

    setReloadBusy(true);
    setMessage("");

    try {
      await firebaseUser?.reload();
      await reloadSession();
      setMessage("계정 상태를 다시 확인했습니다.");
    } catch {
      setMessage("계정 상태를 다시 확인하지 못했습니다. 로그인 세션은 유지됩니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    firebaseUser,
    reloadBusy,
    reloadSession,
  ]);

  return (
    <main className="app-next-shell">
      <header className="app-next-header">
        <p>App Next 읽기 전용</p>
        <h1>계정 상태 및 이메일 인증</h1>
        <span className={`app-next-badge app-next-${stateMessage.tone}`}>
          {stateMessage.title}
        </span>
      </header>

      {showMainNavigation ? (
        <nav className="app-next-tabs" aria-label="App Next 화면">
          <button
            type="button"
            className={activeTab === "account" ? "active" : "secondary"}
            onClick={() => handleRoute("dashboard")}
          >
            계정 상태
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
      ) : activeTab === "account" ? (
        <>
          <section className="app-next-panel">
            <h2>계정 상태</h2>
            <dl>
              <ValueRow label="phase" value={phase} />
              <ValueRow label="status" value={valueOrDash(session?.status)} />
              <ValueRow label="globalRole" value={valueOrDash(session?.globalRole)} />
              <ValueRow label="isSystemOwner" value={booleanLabel(session?.isSystemOwner)} />
              <ValueRow label="workspace 존재 여부" value={booleanLabel(Boolean(session?.currentWorkspaceId))} />
              <ValueRow label="currentWorkspaceRole" value={valueOrDash(session?.currentWorkspaceRole)} />
              <ValueRow label="warnings 개수" value={String(warningCount)} />
              <ValueRow label="emailVerified" value={verificationStatusLabel(emailVerified)} />
              <ValueRow label="이메일" value={maskedEmail} />
              <ValueRow label="error" value={valueOrDash(error?.code)} />
            </dl>
          </section>

          <section className="app-next-panel">
            <h2>이메일 인증</h2>
            <p>이 화면은 명시적으로 버튼을 누를 때만 Firebase Auth 인증 메일 발송과 현재 사용자 reload를 실행합니다.</p>
            <div className="app-next-actions">
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={sendBusy || isLoading || !firebaseUser || emailVerified === true}
              >
                {sendBusy ? "발송 중" : "인증 메일 발송"}
              </button>
              <button
                type="button"
                onClick={handleReload}
                disabled={reloadBusy || isLoading || !firebaseUser}
              >
                {reloadBusy ? "확인 중" : "인증 상태 다시 확인"}
              </button>
            </div>
            {message ? <p className="app-next-message">{message}</p> : null}
          </section>
        </>
      ) : activeTab === "devices" ? (
        <AppNextLoginDevices />
      ) : activeTab === "notifications" ? (
        <AppNextNotifications />
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
            <ValueRow label="currentRoute" value={getAppNextRouteDiagnostics().currentRoute} />
            <ValueRow label="requestedRoute" value={getAppNextRouteDiagnostics().requestedRoute} />
            <ValueRow label="fallbackReason" value={getAppNextRouteDiagnostics().fallbackReason} />
            <ValueRow label="requireAuthConsumerMounted" value={booleanLabel(getAppNextRouteDiagnostics().requireAuthConsumerMounted)} />
            <ValueRow label="protectedRouteRenderCount" value={String(getAppNextRouteDiagnostics().protectedRouteRenderCount)} />
          </dl>
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
