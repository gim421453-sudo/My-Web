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
  loadAppNextCurrentUserNotificationsReadonly,
} from "./appNextNotificationsService";
import {
  appNextNotificationReadPolicy,
  isAppNextNotificationIndexError,
  isAppNextNotificationPermissionDenied,
  type AppNextNotificationRecord,
  type AppNextNotificationSource,
} from "./appNextNotificationsUtils";

function sourceLabel(source: AppNextNotificationSource): string {
  if (source === "firestore") return "Firestore notifications";
  if (source === "local-fallback") return "브라우저 로컬 fallback";
  if (source === "permission-denied") return "권한으로 조회 불가";
  if (source === "index-required") return "인덱스 필요";
  if (source === "error") return "조회 오류";
  return "데이터 없음";
}

function policyMessage(reason: ReturnType<typeof appNextNotificationReadPolicy>["reason"]): string {
  if (reason === "loading") return "계정 상태를 확인하는 중입니다.";
  if (reason === "signed-out") return "로그인 후 알림 목록을 확인할 수 있습니다.";
  if (reason === "account-action-required") return "승인 대기, 거절, 비활성 계정에서는 알림 조회를 실행하지 않습니다.";
  if (reason === "error") return "계정 상태 오류가 있어 알림 조회를 실행하지 않습니다. 자동 로그아웃은 하지 않습니다.";
  return "";
}

function scopeLabel(scope: string): string {
  if (scope === "workspace") return "워크스페이스";
  if (scope === "system") return "시스템";
  return "개인";
}

function NotificationCard({
  notification,
}: {
  notification: AppNextNotificationRecord;
}) {
  return (
    <article className="app-next-notification-card">
      <div className="app-next-notification-head">
        <div>
          <h3>{notification.title}</h3>
          <p>{notification.messageSummary}</p>
        </div>
        <span className={notification.isRead ? "" : "unread"}>
          {notification.readLabel}
        </span>
      </div>
      <dl>
        <dt>알림 종류</dt>
        <dd>{notification.typeLabel}</dd>
        <dt>생성 시각</dt>
        <dd>{notification.createdAt}</dd>
        <dt>구분</dt>
        <dd>{scopeLabel(notification.scopeLabel)}</dd>
        <dt>읽음 상태</dt>
        <dd>{notification.readLabel}</dd>
      </dl>
    </article>
  );
}

export function AppNextNotifications() {
  const {
    phase,
    session,
  } = useAuth();
  const [notifications, setNotifications] = useState<AppNextNotificationRecord[]>([]);
  const [source, setSource] = useState<AppNextNotificationSource>("none");
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const readPolicy = useMemo(
    () => appNextNotificationReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );

  const loadNotifications = useCallback(async () => {
    if (!readPolicy.canRead || !session?.uid) {
      setNotifications([]);
      setSource("none");
      setReadCount(0);
      setMessage(policyMessage(readPolicy.reason));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await loadAppNextCurrentUserNotificationsReadonly({
        uid: session.uid,
        currentWorkspaceId: session.currentWorkspaceId,
        maxCount: 50,
      });

      setNotifications(result.notifications);
      setSource(result.source);
      setReadCount(result.readCount);
      setMessage(result.notifications.length ? "" : "표시할 알림이 없습니다.");
    } catch (error) {
      if (isAppNextNotificationPermissionDenied(error)) {
        setSource("permission-denied");
        setMessage("알림을 불러올 권한이 없습니다.");
      } else if (isAppNextNotificationIndexError(error)) {
        setSource("index-required");
        setMessage("현재 조회에 필요한 인덱스가 준비되지 않았습니다.");
      } else {
        setSource("error");
        setMessage("알림 목록을 불러오지 못했습니다. 로그인 세션은 유지됩니다.");
      }

      setNotifications([]);
      setReadCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    readPolicy.canRead,
    readPolicy.reason,
    session?.currentWorkspaceId,
    session?.uid,
  ]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <section className="app-next-panel">
      <div className="app-next-section-head">
        <div>
          <h2>알림</h2>
          <p>현재 사용자 본인에게 허용된 `notifications` 문서만 1회 조회합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadNotifications()}
          disabled={loading || !readPolicy.canRead}
        >
          {loading ? "불러오는 중" : "알림 새로고침"}
        </button>
      </div>

      <dl className="app-next-device-summary">
        <dt>데이터 source</dt>
        <dd>{sourceLabel(source)}</dd>
        <dt>조회 범위</dt>
        <dd>{readPolicy.queryScope}</dd>
        <dt>읽은 문서 수</dt>
        <dd>{String(readCount)}</dd>
        <dt>최대 표시 개수</dt>
        <dd>50</dd>
      </dl>

      {message ? <p className="app-next-message">{message}</p> : null}

      {notifications.length > 0 ? (
        <div className="app-next-notification-list">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.notificationKey}
              notification={notification}
            />
          ))}
        </div>
      ) : null}

      {import.meta.env.DEV ? (
        <section className="app-next-diagnostics app-next-device-diagnostics">
          <h3>개발 전용 진단</h3>
          <dl>
            <dt>entry</dt>
            <dd>app-next</dd>
            <dt>screen</dt>
            <dd>notifications</dd>
            <dt>provider</dt>
            <dd>new</dd>
            <dt>legacy AuthContext mounted</dt>
            <dd>false</dd>
            <dt>notification data source</dt>
            <dd>{sourceLabel(source)}</dd>
            <dt>query scope</dt>
            <dd>{readPolicy.queryScope}</dd>
            <dt>read count</dt>
            <dd>{String(readCount)}</dd>
            <dt>listener count</dt>
            <dd>0</dd>
            <dt>write API imported</dt>
            <dd>false</dd>
            <dt>automatic signOut</dt>
            <dd>none</dd>
          </dl>
        </section>
      ) : null}
    </section>
  );
}

