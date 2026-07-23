import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAuthProviderDiagnosticsSnapshot,
} from "../auth/AuthProvider";
import {
  useAuth,
} from "../auth/useAuth";
import {
  getAppNextAuthRouteMatrixDiagnostics,
  recordAppNextDashboardDiagnostics,
} from "./appNextDiagnostics";
import {
  loadAppNextWorkspaceNoticesReadonly,
} from "./appNextWorkspaceNoticesService";
import {
  appNextWorkspaceNoticeReadPolicy,
  isAppNextWorkspaceNoticeIndexError,
  isAppNextWorkspaceNoticeNetworkError,
  isAppNextWorkspaceNoticePermissionDenied,
  isAppNextWorkspaceNoticeQuotaExceeded,
  type AppNextWorkspaceNoticeRecord,
} from "./appNextWorkspaceNoticesUtils";
import {
  appNextDashboardPolicy,
  summarizeAppNextDashboardNotices,
} from "./appNextDashboardUtils";

type DashboardErrorCode =
  | "none"
  | "workspace-missing"
  | "permission-denied"
  | "resource-exhausted"
  | "index-required"
  | "unavailable"
  | "unknown";

type DashboardNoticeLoadResult = Awaited<ReturnType<typeof loadAppNextWorkspaceNoticesReadonly>>;

const noticeSummaryCache = new Map<string, {
  fetchedCount: number;
  visibleCount: number;
  notices: AppNextWorkspaceNoticeRecord[];
}>();
const noticeSummaryInFlight = new Map<string, Promise<DashboardNoticeLoadResult>>();

let dashboardRenderCount = 0;
let dashboardReadCount = 0;
let noticeSummaryLoadCount = 0;

function booleanLabel(value: boolean): string {
  return value ? "예" : "아니오";
}

function classifyDashboardNoticeError(error: unknown): DashboardErrorCode {
  if (isAppNextWorkspaceNoticePermissionDenied(error)) return "permission-denied";
  if (isAppNextWorkspaceNoticeQuotaExceeded(error)) return "resource-exhausted";
  if (isAppNextWorkspaceNoticeIndexError(error)) return "index-required";
  if (isAppNextWorkspaceNoticeNetworkError(error)) return "unavailable";
  return "unknown";
}

function errorMessage(errorCode: DashboardErrorCode): string {
  if (errorCode === "workspace-missing") return "워크스페이스가 선택되지 않아 워크스페이스 기반 요약은 표시하지 않습니다.";
  if (errorCode === "permission-denied") return "공지 요약을 읽을 권한을 확인해 주세요.";
  if (errorCode === "resource-exhausted") return "현재 Firestore 조회 한도를 초과했습니다.";
  if (errorCode === "index-required") return "공지 요약 조회에 필요한 인덱스가 준비되지 않았습니다.";
  if (errorCode === "unavailable") return "네트워크 연결을 확인해 주세요.";
  if (errorCode === "unknown") return "공지 요약을 불러오지 못했습니다.";
  return "";
}

function DashboardValue({
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

export function AppNextDashboardReadOnly({
  onNavigate,
}: {
  onNavigate(route: "notices" | "admin-preview" | "workspace-preview"): void;
}) {
  const {
    phase,
    session,
    error,
  } = useAuth();
  const renderCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<DashboardErrorCode>("none");
  const [noticeFetchedCount, setNoticeFetchedCount] = useState(0);
  const [noticeVisibleCount, setNoticeVisibleCount] = useState(0);
  const [noticeSummary, setNoticeSummary] = useState<AppNextWorkspaceNoticeRecord[]>([]);
  const [duplicateNoticeLoadDetected, setDuplicateNoticeLoadDetected] = useState(false);

  renderCountRef.current += 1;
  dashboardRenderCount += 1;

  const policy = useMemo(
    () => appNextDashboardPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );
  const noticePolicy = useMemo(
    () => appNextWorkspaceNoticeReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );

  const updateDiagnostics = useCallback((next: Partial<Parameters<typeof recordAppNextDashboardDiagnostics>[0]> = {}) => {
    const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
    recordAppNextDashboardDiagnostics({
      loading,
      errorCode,
      dashboardRenderCount,
      dashboardReadCount,
      dashboardWriteAttemptCount: 0,
      dashboardListenerStartCount: 0,
      dashboardActiveListenerCount: 0,
      noticeSummaryLoadCount,
      noticeFetchedCount,
      noticeVisibleCount,
      noticeSummaryCount: noticeSummary.length,
      duplicateNoticeLoadDetected,
      hasWorkspace: policy.hasWorkspace,
      globalRoleCategory: policy.globalRoleCategory,
      workspaceRoleCategory: policy.workspaceRoleCategory,
      isSystemOwner: policy.isSystemOwner,
      currentRoute: "dashboard",
      requestedRoute: "dashboard",
      firestoreReadCount: dashboardReadCount,
      firestoreWriteAttemptCount: 0,
      authListenerCount: authDiagnostics.authStateListenerCount,
      workspaceListenerCount: 0,
      restoreConflictDetected: getAppNextAuthRouteMatrixDiagnostics().restoreConflictDetected,
      ...next,
    });
  }, [
    duplicateNoticeLoadDetected,
    errorCode,
    loading,
    noticeFetchedCount,
    noticeSummary.length,
    noticeVisibleCount,
    policy.globalRoleCategory,
    policy.hasWorkspace,
    policy.isSystemOwner,
    policy.workspaceRoleCategory,
  ]);

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    if (!policy.routeAllowed) {
      setLoading(false);
      setErrorCode(policy.reason === "loading" ? "none" : "unknown");
      setNoticeFetchedCount(0);
      setNoticeVisibleCount(0);
      setNoticeSummary([]);
      updateDiagnostics({
        loading: false,
        errorCode: policy.reason === "loading" ? "none" : "unknown",
        noticeFetchedCount: 0,
        noticeVisibleCount: 0,
        noticeSummaryCount: 0,
      });
      return;
    }

    if (!policy.noticeSummaryAllowed || !session?.currentWorkspaceId || !noticePolicy.canRead) {
      setLoading(false);
      setErrorCode("workspace-missing");
      setNoticeFetchedCount(0);
      setNoticeVisibleCount(0);
      setNoticeSummary([]);
      updateDiagnostics({
        loading: false,
        errorCode: "workspace-missing",
        noticeFetchedCount: 0,
        noticeVisibleCount: 0,
        noticeSummaryCount: 0,
      });
      return;
    }

    const existingRequest = noticeSummaryInFlight.get(session.currentWorkspaceId);
    if ((inFlightRef.current || existingRequest) && !forceRefresh) {
      setDuplicateNoticeLoadDetected(true);
      setLoading(true);
      updateDiagnostics({
        duplicateNoticeLoadDetected: true,
        loading: true,
      });
      if (existingRequest) {
        try {
          const result = await existingRequest;
          const summary = summarizeAppNextDashboardNotices(result.notices, 3);
          setNoticeFetchedCount(result.readCount);
          setNoticeVisibleCount(summary.visibleCount);
          setNoticeSummary(summary.recent);
          setErrorCode("none");
          updateDiagnostics({
            loading: false,
            errorCode: "none",
            noticeFetchedCount: result.readCount,
            noticeVisibleCount: summary.visibleCount,
            noticeSummaryCount: summary.summaryCount,
            duplicateNoticeLoadDetected: true,
          });
        } catch (loadError) {
          const nextErrorCode = classifyDashboardNoticeError(loadError);
          setNoticeFetchedCount(0);
          setNoticeVisibleCount(0);
          setNoticeSummary([]);
          setErrorCode(nextErrorCode);
          updateDiagnostics({
            loading: false,
            errorCode: nextErrorCode,
            noticeFetchedCount: 0,
            noticeVisibleCount: 0,
            noticeSummaryCount: 0,
            duplicateNoticeLoadDetected: true,
          });
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    const cacheKey = session.currentWorkspaceId;
    const cached = forceRefresh ? null : noticeSummaryCache.get(cacheKey);
    if (cached) {
      const summary = summarizeAppNextDashboardNotices(cached.notices, 3);
      setLoading(false);
      setErrorCode("none");
      setNoticeFetchedCount(cached.fetchedCount);
      setNoticeVisibleCount(summary.visibleCount);
      setNoticeSummary(summary.recent);
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        noticeFetchedCount: cached.fetchedCount,
        noticeVisibleCount: summary.visibleCount,
        noticeSummaryCount: summary.summaryCount,
      });
      return;
    }

    inFlightRef.current = true;
    const request = loadAppNextWorkspaceNoticesReadonly({
      workspaceId: session.currentWorkspaceId,
    });
    noticeSummaryInFlight.set(cacheKey, request);
    dashboardReadCount += 1;
    noticeSummaryLoadCount += 1;
    setLoading(true);
    setErrorCode("none");
    updateDiagnostics({
      loading: true,
      errorCode: "none",
      dashboardReadCount,
      noticeSummaryLoadCount,
      firestoreReadCount: dashboardReadCount,
    });

    try {
      const result = await request;
      const summary = summarizeAppNextDashboardNotices(result.notices, 3);
      noticeSummaryCache.set(cacheKey, {
        fetchedCount: result.readCount,
        visibleCount: summary.visibleCount,
        notices: result.notices,
      });
      setNoticeFetchedCount(result.readCount);
      setNoticeVisibleCount(summary.visibleCount);
      setNoticeSummary(summary.recent);
      setErrorCode("none");
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        noticeFetchedCount: result.readCount,
        noticeVisibleCount: summary.visibleCount,
        noticeSummaryCount: summary.summaryCount,
      });
    } catch (loadError) {
      const nextErrorCode = classifyDashboardNoticeError(loadError);
      setNoticeFetchedCount(0);
      setNoticeVisibleCount(0);
      setNoticeSummary([]);
      setErrorCode(nextErrorCode);
      updateDiagnostics({
        loading: false,
        errorCode: nextErrorCode,
        noticeFetchedCount: 0,
        noticeVisibleCount: 0,
        noticeSummaryCount: 0,
      });
    } finally {
      if (noticeSummaryInFlight.get(cacheKey) === request) {
        noticeSummaryInFlight.delete(cacheKey);
      }
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [
    noticePolicy.canRead,
    policy.noticeSummaryAllowed,
    policy.reason,
    policy.routeAllowed,
    session?.currentWorkspaceId,
    updateDiagnostics,
  ]);

  useEffect(() => {
    void loadDashboard(false);
    // Keep this effect keyed to auth/workspace state only. Diagnostic state changes
    // must not schedule another Firestore read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    noticePolicy.canRead,
    phase,
    policy.noticeSummaryAllowed,
    policy.routeAllowed,
    session?.currentWorkspaceId,
  ]);

  useEffect(() => {
    updateDiagnostics();
  }, [
    updateDiagnostics,
  ]);

  return (
    <>
      <section className="app-next-panel app-next-dashboard-hero">
        <div>
          <p className="app-next-muted-label">App Next 읽기 전용 Dashboard Pilot</p>
          <h2>메인 대시보드</h2>
          <p>
            운영 정적 앱은 그대로 두고, app-next에서 같은 워크스페이스 기준 데이터를 읽기 전용으로 비교합니다.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => void loadDashboard(true)}
          disabled={loading || !policy.routeAllowed}
        >
          {loading ? "조회 중" : "새로고침"}
        </button>
      </section>

      <div className="app-next-dashboard-grid">
        <section className="app-next-panel">
          <h2>계정 상태 요약</h2>
          <dl>
            <DashboardValue label="status" value={session?.status ?? phase} />
            <DashboardValue label="global role" value={policy.globalRoleCategory} />
            <DashboardValue label="workspace role" value={policy.workspaceRoleCategory} />
            <DashboardValue label="workspace 존재" value={booleanLabel(policy.hasWorkspace)} />
            <DashboardValue label="system_owner" value={booleanLabel(policy.isSystemOwner)} />
            <DashboardValue label="error" value={error?.code ?? "-"} />
          </dl>
        </section>

        <section className="app-next-panel">
          <h2>워크스페이스 요약</h2>
          <dl>
            <DashboardValue label="선택 상태" value={policy.hasWorkspace ? "선택됨" : "선택되지 않음"} />
            <DashboardValue label="표시명" value="이번 파일럿에서는 추가 workspace 문서 조회 없이 표시하지 않음" />
            <DashboardValue label="역할" value={policy.workspaceRoleCategory} />
          </dl>
          {!policy.hasWorkspace ? (
            <p className="app-next-message">워크스페이스가 선택되지 않았습니다. 대시보드는 유지하고 workspace 기반 카드만 비활성화합니다.</p>
          ) : null}
        </section>

        <section className="app-next-panel">
          <div className="app-next-section-head">
            <div>
              <h2>공지 요약</h2>
              <p>최근 공지 최대 3건을 같은 정규화 서비스로 표시합니다.</p>
            </div>
            <button type="button" className="secondary" onClick={() => onNavigate("notices")}>
              공지 보기
            </button>
          </div>
          <dl className="app-next-device-summary">
            <DashboardValue label="visible count" value={String(noticeVisibleCount)} />
            <DashboardValue label="recent count" value={String(noticeSummary.length)} />
            <DashboardValue label="read status" value={loading ? "loading" : errorCode} />
          </dl>
          {errorCode !== "none" && !loading ? (
            <p className="app-next-message">{errorMessage(errorCode)}</p>
          ) : null}
          {loading ? <p className="app-next-message">공지 요약을 불러오고 있습니다.</p> : null}
          {!loading && errorCode === "none" && noticeSummary.length === 0 ? (
            <p className="app-next-message">등록된 워크스페이스 공지가 없습니다.</p>
          ) : null}
          {noticeSummary.length > 0 ? (
            <div className="app-next-notice-list">
              {noticeSummary.map((notice) => (
                <article className="app-next-notice-card" key={notice.noticeKey}>
                  <div className="app-next-notice-head">
                    <div>
                      <h3>{notice.title}</h3>
                      <p>{notice.summary}</p>
                    </div>
                    {notice.isPinned ? <span>고정</span> : null}
                  </div>
                  <dl>
                    <DashboardValue label="게시 시각" value={notice.publishedAt} />
                    <DashboardValue label="분류" value={notice.categoryLabel} />
                    <DashboardValue label="중요도" value={notice.priorityLabel} />
                  </dl>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="app-next-panel">
          <h2>인증·권한 Pilot 상태</h2>
          <dl>
            <DashboardValue label="RequireAuth" value="app-next dashboard consumer" />
            <DashboardValue label="ProtectedRoute" value="admin-preview pilot" />
            <DashboardValue label="RequireWorkspaceRole" value="workspace-preview pilot" />
            <DashboardValue label="write attempt" value="0" />
            <DashboardValue label="listener" value="0" />
          </dl>
          <div className="app-next-actions">
            <button type="button" className="secondary" onClick={() => onNavigate("admin-preview")}>
              Admin Preview
            </button>
            <button type="button" className="secondary" onClick={() => onNavigate("workspace-preview")}>
              Workspace Preview
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
