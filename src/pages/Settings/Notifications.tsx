import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useAuth,
} from "../../auth/useAuth";
import {
  hasPermission,
} from "../../permissions/permissionService";
import {
  loadCurrentUserNotificationsReadonly,
  loadLocalFallbackNotificationsReadonly,
} from "./notificationsReadonlyService";
import {
  isNotificationsPermissionDeniedError,
  notificationsAccountStatusMessage,
  notificationsPermissionDeniedMessage,
  notificationsPhaseMessage,
  notificationsWorkspaceMissingMessage,
  type NotificationsMessage,
  type SafeNotificationRecord,
} from "./notificationsUtils";

interface NotificationsProps {
  mode?: "legacy-placeholder" | "new-auth";
}

type NotificationSource =
  | "firestore"
  | "local-fallback"
  | "none";

function MessageCard({
  title,
  body,
  tone,
}: NotificationsMessage) {
  return (
    <article className={`notifications-card notifications-${tone}`}>
      <h2>{title}</h2>
      {body.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function sourceLabel(source: NotificationSource): string {
  if (source === "firestore") return "Firestore 알림 데이터";
  if (source === "local-fallback") return "브라우저 임시 알림 데이터";
  return "표시할 알림 데이터 없음";
}

function NotificationCard({
  notification,
}: {
  notification: SafeNotificationRecord;
}) {
  return (
    <article className="notification-item">
      <div className="notification-header">
        <h3>{notification.title}</h3>
        <div className="notification-badges">
          <span className={`notification-badge ${notification.isRead ? "" : "unread"}`}>
            {notification.readLabel}
          </span>
          <span className="notification-badge">{notification.serviceLabel}</span>
          <span className="notification-badge">{notification.createdAt}</span>
        </div>
      </div>
      <p className="notification-message">{notification.messageSummary}</p>
      <dl>
        <dt>알림 유형</dt>
        <dd>{notification.type}</dd>
        <dt>생성 시각</dt>
        <dd>{notification.createdAt}</dd>
        <dt>읽음 상태</dt>
        <dd>{notification.readLabel}</dd>
        <dt>관련 서비스</dt>
        <dd>{notification.serviceLabel}</dd>
      </dl>
    </article>
  );
}

function NotificationsNewAuthView() {
  const {
    phase,
    session,
    error,
    reloadSession,
  } = useAuth();
  const [notifications, setNotifications] = useState<SafeNotificationRecord[]>([]);
  const [notificationSource, setNotificationSource] = useState<NotificationSource>("none");
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] =
    useState<NotificationsMessage | null>(null);
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");

  const isSessionLoading =
    phase === "initializing" ||
    phase === "loading_session";
  const hasWorkspace = Boolean(session?.currentWorkspaceId);
  const canReadNotifications = Boolean(
    session &&
    hasWorkspace &&
    hasPermission(session, "workspace.read"),
  );
  const canLoadNotifications =
    phase === "authenticated" &&
    session?.status === "active" &&
    Boolean(session.uid) &&
    hasWorkspace &&
    canReadNotifications;

  const loadNotifications = useCallback(async () => {
    if (!session?.uid) {
      setNotifications([]);
      setNotificationSource("none");
      return;
    }

    if (session.status !== "active") {
      setNotifications([]);
      setNotificationSource("none");
      return;
    }

    if (!session.currentWorkspaceId) {
      setNotifications([]);
      setNotificationSource("none");
      setNotificationMessage(notificationsWorkspaceMissingMessage());
      return;
    }

    if (!hasPermission(session, "workspace.read")) {
      setNotifications([]);
      setNotificationSource("none");
      setNotificationMessage({
        title: "권한 상태",
        body: "이 화면을 볼 권한이 없습니다.",
        tone: "warning",
      });
      return;
    }

    setLoadingNotifications(true);
    setNotificationMessage(null);

    try {
      const firestoreNotifications = await loadCurrentUserNotificationsReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
      });

      if (firestoreNotifications.length > 0) {
        setNotifications(firestoreNotifications);
        setNotificationSource("firestore");
        return;
      }

      const fallbackNotifications = loadLocalFallbackNotificationsReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
      });

      setNotifications(fallbackNotifications);
      setNotificationSource(fallbackNotifications.length > 0 ? "local-fallback" : "none");
    } catch (loadError) {
      if (isNotificationsPermissionDeniedError(loadError)) {
        setNotificationMessage(notificationsPermissionDeniedMessage());
      } else {
        setNotificationMessage({
          title: "알림 목록",
          body: "알림 목록을 불러오지 못했습니다.\n로그인은 정상적으로 유지되고 있습니다.",
          tone: "error",
        });
      }

      const fallbackNotifications = loadLocalFallbackNotificationsReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
      });

      setNotifications(fallbackNotifications);
      setNotificationSource(fallbackNotifications.length > 0 ? "local-fallback" : "none");
    } finally {
      setLoadingNotifications(false);
    }
  }, [
    session,
  ]);

  useEffect(() => {
    if (canLoadNotifications) {
      void loadNotifications();
      return;
    }

    setNotifications([]);
    setNotificationSource("none");

    if (
      phase === "authenticated" &&
      session?.status === "active" &&
      !session.currentWorkspaceId
    ) {
      setNotificationMessage(notificationsWorkspaceMissingMessage());
      return;
    }

    if (
      phase === "authenticated" &&
      session?.status === "active" &&
      session.currentWorkspaceId &&
      !canReadNotifications
    ) {
      setNotificationMessage({
        title: "권한 상태",
        body: "이 화면을 볼 권한이 없습니다.",
        tone: "warning",
      });
      return;
    }

    setNotificationMessage(null);
  }, [
    canLoadNotifications,
    canReadNotifications,
    loadNotifications,
    phase,
    session?.currentWorkspaceId,
    session?.status,
  ]);

  const handleNotificationsRefresh = useCallback(async () => {
    if (loadingNotifications || !canLoadNotifications) return;
    await loadNotifications();
  }, [
    canLoadNotifications,
    loadNotifications,
    loadingNotifications,
  ]);

  const handleReloadSession = useCallback(async () => {
    if (reloadBusy || isSessionLoading) return;

    setReloadBusy(true);
    setReloadMessage("계정 상태를 다시 확인하고 있습니다.");

    try {
      await reloadSession();
      setReloadMessage("계정 상태를 다시 확인했습니다.");
    } catch {
      setReloadMessage("계정 상태를 다시 불러오지 못했습니다. 로그인은 유지됩니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    isSessionLoading,
    reloadBusy,
    reloadSession,
  ]);

  const phaseMessage = notificationsPhaseMessage(phase);
  const statusMessage = notificationsAccountStatusMessage(session?.status);
  const workspaceMessage = session?.status === "active" && !session.currentWorkspaceId
    ? notificationsWorkspaceMissingMessage()
    : {
      title: "워크스페이스 상태",
      body: session?.currentWorkspaceId
        ? "현재 선택된 워크스페이스 기준으로 본인 알림만 조회합니다."
        : "계정 상태 확인 후 워크스페이스 정보를 표시합니다.",
      tone: session?.currentWorkspaceId ? "success" : "muted",
    } satisfies NotificationsMessage;

  return (
    <main className="notifications-page">
      <header className="notifications-header">
        <div>
          <p className="notifications-eyebrow">읽기 전용 알림</p>
          <h1>알림 상태</h1>
          <p>
            이 화면은 신규 AuthProvider 세션을 사용해 현재 계정과 워크스페이스에 허용된 알림만 읽습니다.
            읽음 처리, 삭제, 설정 저장은 수행하지 않습니다.
          </p>
        </div>
        <section className="notifications-actions" aria-label="알림 새로고침">
          <button
            type="button"
            onClick={handleNotificationsRefresh}
            disabled={loadingNotifications || !canLoadNotifications}
          >
            {loadingNotifications ? "불러오는 중" : "알림 목록 새로고침"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleReloadSession}
            disabled={reloadBusy || isSessionLoading}
          >
            {reloadBusy ? "확인 중" : "계정 상태 다시 확인"}
          </button>
          {reloadMessage ? <p>{reloadMessage}</p> : null}
        </section>
      </header>

      <section className="notifications-card-grid">
        <MessageCard {...phaseMessage} />
        <MessageCard {...statusMessage} />
        <MessageCard {...workspaceMessage} />
        <MessageCard
          title="데이터 소스"
          body={sourceLabel(notificationSource)}
          tone={
            notificationSource === "firestore"
              ? "success"
              : notificationSource === "local-fallback"
                ? "warning"
                : "muted"
          }
        />
      </section>

      <section className="notifications-panel">
        <h2>계정 기준</h2>
        <dl>
          <dt>인증 단계</dt>
          <dd>{phase}</dd>
          <dt>계정 상태</dt>
          <dd>{session?.status ?? "-"}</dd>
          <dt>전역 역할</dt>
          <dd>{session?.globalRole ?? "-"}</dd>
          <dt>시스템 오너</dt>
          <dd>{session?.isSystemOwner ? "예" : "아니요"}</dd>
          <dt>워크스페이스 선택</dt>
          <dd>{session?.currentWorkspaceId ? "있음" : "없음"}</dd>
          <dt>워크스페이스 역할</dt>
          <dd>{session?.currentWorkspaceRole ?? "-"}</dd>
          <dt>세션 오류</dt>
          <dd>{error?.code ?? "-"}</dd>
        </dl>
      </section>

      {notificationMessage ? <MessageCard {...notificationMessage} /> : null}

      <section className="notifications-panel">
        <div className="notifications-refresh-row">
          <h2>최근 알림</h2>
          <p>
            {loadingNotifications
              ? "알림 목록을 불러오고 있습니다."
              : `${notifications.length}개 표시 중`}
          </p>
        </div>

        {notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.notificationId}
                notification={notification}
              />
            ))}
          </div>
        ) : (
          <div className="notifications-empty">
            {loadingNotifications ? "불러오는 중입니다." : "표시할 알림이 없습니다."}
          </div>
        )}
      </section>
    </main>
  );
}

export function Notifications({
  mode = "legacy-placeholder",
}: NotificationsProps = {}) {
  if (mode !== "new-auth") {
    return null;
  }

  return <NotificationsNewAuthView />;
}
