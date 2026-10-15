import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  doc,
  getDocFromServer,
} from "firebase/firestore";
import {
  useAuth,
} from "../auth/useAuth";
import {
  getFirebaseDb,
} from "../services/firebaseProvider";
import {
  loadAppNextWorkspaceNoticesReadonly,
  type LoadAppNextWorkspaceNoticesInput,
} from "./appNextWorkspaceNoticesService";
import {
  appNextWorkspaceNoticeReadPolicy,
  isAppNextWorkspaceNoticeIndexError,
  isAppNextWorkspaceNoticeNetworkError,
  isAppNextWorkspaceNoticePermissionDenied,
  isAppNextWorkspaceNoticeQuotaExceeded,
  type AppNextWorkspaceNoticeRecord,
  type AppNextWorkspaceNoticeSchemaKind,
  type AppNextWorkspaceNoticeSchemaSequenceItem,
  type AppNextWorkspaceNoticeSource,
} from "./appNextWorkspaceNoticesUtils";
import {
  appNextWorkspaceNoticeWritePolicy,
  APP_NEXT_NOTICE_WRITE_ROLES,
  type AppNextWorkspaceNoticeManagementRecord,
} from "./appNextWorkspaceNoticeCrudUtils";
import {
  AppNextWorkspaceNoticeCrud,
} from "./AppNextWorkspaceNoticeCrud";
import RequireWorkspaceRole from "../components/guards/RequireWorkspaceRole";
import {
  appNextDiagnosticFingerprint,
  getAppNextNoticeRouteDiagnostics,
  recordAppNextNoticeDiagnostics,
} from "./appNextDiagnostics";

type NoticeRequestMode = NonNullable<LoadAppNextWorkspaceNoticesInput["requestMode"]>;
type NoticeCompletedReadMode = "none" | "default" | "server" | "server-failed";
type NoticeErrorKind = "none" | "unavailable" | "permission-denied" | "resource-exhausted" | "index-required" | "unknown";

const EMPTY_SCHEMA_COUNTS: Record<AppNextWorkspaceNoticeSchemaKind, number> = {
  modern_workspace_notice: 0,
  legacy_general_notice: 0,
  legacy_school_notice: 0,
  legacy_academy_notice: 0,
  system_notice_reference: 0,
  unknown_notice_schema: 0,
};

function sourceLabel(source: AppNextWorkspaceNoticeSource): string {
  if (source === "firestore") return "Firestore default read";
  if (source === "firestore-server") return "Firestore server read";
  if (source === "server-failed") return "Firestore server read failed";
  if (source === "permission-denied") return "Permission denied";
  if (source === "quota-exceeded") return "Quota exceeded";
  if (source === "index-required") return "Index required";
  if (source === "network-error") return "Network unavailable";
  if (source === "error") return "Read error";
  return "No data";
}

function policyMessage(reason: ReturnType<typeof appNextWorkspaceNoticeReadPolicy>["reason"]): string {
  if (reason === "loading") return "계정 정보를 확인하고 있습니다.";
  if (reason === "signed-out") return "로그인이 필요합니다.";
  if (reason === "workspace-missing") return "선택된 워크스페이스가 없어 공지사항을 조회할 수 없습니다.";
  if (reason === "pending") return "계정 승인 대기 중에는 공지사항을 조회하지 않습니다.";
  if (reason === "rejected") return "승인 거절 상태에서는 공지사항을 조회하지 않습니다.";
  if (reason === "disabled") return "비활성 계정에서는 공지사항을 조회하지 않습니다.";
  if (reason === "error") return "계정 상태 오류가 있어 공지사항을 조회하지 않습니다. 자동 로그아웃은 하지 않습니다.";
  return "";
}

function classifyNoticeError(error: unknown): NoticeErrorKind {
  if (isAppNextWorkspaceNoticePermissionDenied(error)) return "permission-denied";
  if (isAppNextWorkspaceNoticeQuotaExceeded(error)) return "resource-exhausted";
  if (isAppNextWorkspaceNoticeIndexError(error)) return "index-required";
  if (isAppNextWorkspaceNoticeNetworkError(error)) return "unavailable";
  return "unknown";
}

function errorSource(kind: NoticeErrorKind, requestMode: NoticeRequestMode): AppNextWorkspaceNoticeSource {
  if (requestMode === "server" || requestMode === "clear-memory-and-server") return "server-failed";
  if (kind === "permission-denied") return "permission-denied";
  if (kind === "resource-exhausted") return "quota-exceeded";
  if (kind === "index-required") return "index-required";
  if (kind === "unavailable") return "network-error";
  return "error";
}

function errorMessage(kind: NoticeErrorKind, requestMode: NoticeRequestMode): string {
  const prefix = requestMode === "server" || requestMode === "clear-memory-and-server"
    ? "서버 강제 조회에 실패했습니다."
    : "공지사항을 불러오지 못했습니다.";

  if (kind === "permission-denied") return `${prefix} 권한을 확인해 주세요.`;
  if (kind === "resource-exhausted") return `${prefix} 현재 Firestore 조회 한도를 초과했습니다.`;
  if (kind === "index-required") return `${prefix} 필요한 인덱스가 준비되지 않았습니다.`;
  if (kind === "unavailable") return `${prefix} 네트워크 연결을 확인해 주세요.`;
  return `${prefix} 원인을 알 수 없는 오류입니다.`;
}

function formatDiagnosticTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function comparableDiagnosticFingerprint(value: string): boolean {
  return Boolean(value && value !== "-" && value !== "unavailable");
}

async function workspaceFingerprint(workspaceId: string | null | undefined): Promise<string> {
  return appNextDiagnosticFingerprint("workspace", workspaceId);
}

function classifyServerUserReadError(error: unknown): string {
  const code = String((error as { code?: string })?.code || "").replace(/^firestore\//, "");
  if (code.includes("permission-denied")) return "permission-denied";
  if (code.includes("resource-exhausted")) return "resource-exhausted";
  if (code.includes("unavailable") || code.includes("network")) return "unavailable";
  if (code.includes("not-found")) return "not-found";
  return "unknown";
}

function NoticeCard({
  notice,
  expanded,
  onToggle,
}: {
  notice: AppNextWorkspaceNoticeRecord;
  expanded: boolean;
  onToggle(): void;
}) {
  return (
    <article className="app-next-notice-card">
      <div className="app-next-notice-head">
        <div>
          <h3>{notice.title}</h3>
          <p>{notice.summary}</p>
        </div>
        {notice.isPinned ? <span>고정</span> : null}
      </div>
      {expanded ? (
        <div className="app-next-notice-detail">
          <strong>상세 내용</strong>
          <dl>
            {notice.detailItems.map((item) => (
              <div key={`${notice.noticeKey}-${item.label}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <dl>
        <dt>분류</dt>
        <dd>{notice.categoryLabel}</dd>
        <dt>범위</dt>
        <dd>{notice.scopeLabel}</dd>
        <dt>게시 시각</dt>
        <dd>{notice.publishedAt}</dd>
        <dt>중요도</dt>
        <dd>{notice.priorityLabel}</dd>
        <dt>고정 여부</dt>
        <dd>{notice.pinnedLabel}</dd>
        {notice.authorLabel ? (
          <>
            <dt>작성자</dt>
            <dd>{notice.authorLabel}</dd>
          </>
        ) : null}
        <dt>첨부</dt>
        <dd>{notice.hasAttachments ? "있음" : "없음"}</dd>
        <dt>외부 링크</dt>
        <dd>{notice.hasExternalLink ? "있음" : "없음"}</dd>
      </dl>
      <button
        type="button"
        className="secondary app-next-inline-action"
        onClick={onToggle}
      >
        {expanded ? "닫기" : "상세 보기"}
      </button>
    </article>
  );
}

export function AppNextWorkspaceNotices() {
  const {
    phase,
    session,
    reloadSession,
  } = useAuth();
  const [notices, setNotices] = useState<AppNextWorkspaceNoticeRecord[]>([]);
  const [managedNotices, setManagedNotices] = useState<AppNextWorkspaceNoticeManagementRecord[]>([]);
  const [source, setSource] = useState<AppNextWorkspaceNoticeSource>("none");
  const [readCount, setReadCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [excludedCount, setExcludedCount] = useState(0);
  const [excludedReasons, setExcludedReasons] = useState<Record<string, number>>({});
  const [sortFieldUsed, setSortFieldUsed] = useState("-");
  const [sortPolicy, setSortPolicy] = useState("-");
  const [authorFieldUsed, setAuthorFieldUsed] = useState("-");
  const [contentFieldUsed, setContentFieldUsed] = useState("-");
  const [schemaKindCounts, setSchemaKindCounts] = useState<Record<AppNextWorkspaceNoticeSchemaKind, number>>(EMPTY_SCHEMA_COUNTS);
  const [unknownSchemaCount, setUnknownSchemaCount] = useState(0);
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
  const [contentMappingBySchema, setContentMappingBySchema] = useState<Record<string, string>>({});
  const [authorMappingBySchema, setAuthorMappingBySchema] = useState<Record<string, string>>({});
  const [dateMappingBySchema, setDateMappingBySchema] = useState<Record<string, string>>({});
  const [categoryMappingBySchema, setCategoryMappingBySchema] = useState<Record<string, string>>({});
  const [schemaSequence, setSchemaSequence] = useState<AppNextWorkspaceNoticeSchemaSequenceItem[]>([]);
  const [lastRequestedReadMode, setLastRequestedReadMode] = useState<NoticeRequestMode>("default");
  const [lastCompletedReadMode, setLastCompletedReadMode] = useState<NoticeCompletedReadMode>("none");
  const [lastReadStartedAt, setLastReadStartedAt] = useState("");
  const [lastReadCompletedAt, setLastReadCompletedAt] = useState("");
  const [fromCache, setFromCache] = useState<boolean | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean | null>(null);
  const [lastErrorKind, setLastErrorKind] = useState<NoticeErrorKind>("none");
  const [currentWorkspaceFingerprint, setCurrentWorkspaceFingerprint] = useState("-");
  const [serverUsersCurrentWorkspaceFingerprint, setServerUsersCurrentWorkspaceFingerprint] = useState("-");
  const [loading, setLoading] = useState(false);
  const [sessionRefreshBusy, setSessionRefreshBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedNoticeKey, setExpandedNoticeKey] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const readPolicy = useMemo(
    () => appNextWorkspaceNoticeReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );
  const writePolicy = useMemo(
    () => appNextWorkspaceNoticeWritePolicy({ phase, session }),
    [phase, session],
  );
  const workspaceResolutionDiagnostics = useMemo(() => {
    const resolution = session?.workspaceResolution;
    return {
      serverCurrentWorkspacePresent: Boolean(resolution?.serverCurrentWorkspacePresent),
      serverCurrentWorkspaceDocumentExists: Boolean(resolution?.serverCurrentWorkspaceDocumentExists),
      canonicalMembershipExists: Boolean(resolution?.canonicalMembershipExists),
      canonicalMembershipStatus: resolution?.canonicalMembershipStatus || "-",
      canonicalMembershipRole: resolution?.canonicalMembershipRole || "-",
      legacyMembershipExists: Boolean(resolution?.legacyMembershipExists),
      legacyMembershipStatus: resolution?.legacyMembershipStatus || "-",
      legacyMembershipRole: resolution?.legacyMembershipRole || "-",
      isSystemOwnerResolved: Boolean(resolution?.isSystemOwnerResolved ?? session?.isSystemOwner),
      systemOwnerWorkspaceAccessAllowed: Boolean(resolution?.systemOwnerWorkspaceAccessAllowed),
      workspaceResolutionFailureKind: resolution?.workspaceResolutionFailureKind || "unknown",
    };
  }, [
    session?.isSystemOwner,
    session?.workspaceResolution,
  ]);
  const writeDiagnostics = getAppNextNoticeRouteDiagnostics();

  const resetNoticeState = useCallback(() => {
    setNotices([]);
    setManagedNotices([]);
    setSource("none");
    setReadCount(0);
    setFilteredCount(0);
    setExcludedCount(0);
    setExcludedReasons({});
    setSortFieldUsed("-");
    setSortPolicy("-");
    setAuthorFieldUsed("-");
    setContentFieldUsed("-");
    setSchemaKindCounts({ ...EMPTY_SCHEMA_COUNTS });
    setUnknownSchemaCount(0);
    setSourceCounts({});
    setContentMappingBySchema({});
    setAuthorMappingBySchema({});
    setDateMappingBySchema({});
    setCategoryMappingBySchema({});
    setSchemaSequence([]);
    setFromCache(null);
    setHasPendingWrites(null);
    setExpandedNoticeKey(null);
  }, []);

  const loadWorkspaceNotices = useCallback(async (
    requestMode: NoticeRequestMode = "default",
  ): Promise<boolean> => {
    if (inFlightRef.current) return false;

    const startedAt = new Date().toISOString();
    setLastRequestedReadMode(requestMode);
    setLastReadStartedAt(startedAt);
    setLastReadCompletedAt("");
    setLastErrorKind("none");
    recordAppNextNoticeDiagnostics({
      screen: "workspace-notices",
      phase,
      status: session?.status || "unknown",
      workspacePresent: Boolean(session?.currentWorkspaceId),
      workspaceRole: session?.currentWorkspaceRole || "-",
      ...workspaceResolutionDiagnostics,
      lastRequestedReadMode: requestMode,
      lastCompletedReadMode: "none",
      lastErrorKind: "none",
      lastReadStartedAt: startedAt,
      listenerCount: 0,
      writeApiImported: true,
      automaticSignOut: "none",
    });

    if (requestMode === "clear-memory-and-server") {
      resetNoticeState();
    }

    if (!readPolicy.canRead || !session?.currentWorkspaceId) {
      resetNoticeState();
      setLastCompletedReadMode("none");
      setMessage(policyMessage(readPolicy.reason));
      recordAppNextNoticeDiagnostics({
        screen: "workspace-notices",
        phase,
        status: session?.status || readPolicy.reason,
        workspacePresent: Boolean(session?.currentWorkspaceId),
        workspaceRole: readPolicy.workspaceRole,
        ...workspaceResolutionDiagnostics,
        lastCompletedReadMode: "none",
        lastErrorKind: readPolicy.reason,
        rawReadCount: 0,
        filteredCount: 0,
        displayedCount: 0,
        currentWorkspaceFingerprint,
        listenerCount: 0,
        writeApiImported: true,
        automaticSignOut: "none",
      });
      return false;
    }

    inFlightRef.current = true;
    setLoading(true);
    setMessage(`${requestMode} 조회를 실행하고 있습니다.`);

    try {
      const result = await loadAppNextWorkspaceNoticesReadonly({
        workspaceId: session.currentWorkspaceId,
        requestMode,
      });

      setNotices(result.notices);
      setManagedNotices(result.managedNotices);
      setSource(result.source);
      setReadCount(result.readCount);
      setFilteredCount(result.filteredCount);
      setExcludedCount(result.excludedCount);
      setExcludedReasons(result.excludedReasons);
      setSortFieldUsed(result.sortFieldUsed);
      setSortPolicy(result.sortPolicy);
      setAuthorFieldUsed(result.authorFieldUsed);
      setContentFieldUsed(result.contentFieldUsed);
      setSchemaKindCounts(result.schemaKindCounts);
      setUnknownSchemaCount(result.unknownSchemaCount);
      setSourceCounts(result.sourceCounts);
      setContentMappingBySchema(result.contentMappingBySchema);
      setAuthorMappingBySchema(result.authorMappingBySchema);
      setDateMappingBySchema(result.dateMappingBySchema);
      setCategoryMappingBySchema(result.categoryMappingBySchema);
      setSchemaSequence(result.schemaSequence);
      setLastCompletedReadMode(result.completedReadMode);
      setFromCache(result.fromCache);
      setHasPendingWrites(result.hasPendingWrites);
      setExpandedNoticeKey(null);
      recordAppNextNoticeDiagnostics({
        screen: "workspace-notices",
        phase,
        status: session?.status || "unknown",
        workspacePresent: true,
        workspaceRole: readPolicy.workspaceRole,
        ...workspaceResolutionDiagnostics,
        lastCompletedReadMode: result.completedReadMode,
        lastErrorKind: "none",
        rawReadCount: result.readCount,
        filteredCount: result.filteredCount,
        displayedCount: result.notices.length,
        fromCache: String(result.fromCache),
        pendingWrites: String(result.hasPendingWrites),
        currentWorkspaceFingerprint,
        listenerCount: 0,
        writeApiImported: true,
        automaticSignOut: "none",
      });
      setMessage(result.notices.length ? "" : "등록된 워크스페이스 공지사항이 없습니다.");
      return true;
    } catch (error) {
      const kind = classifyNoticeError(error);
      resetNoticeState();
      setSource(errorSource(kind, requestMode));
      setLastCompletedReadMode(
        requestMode === "server" || requestMode === "clear-memory-and-server"
          ? "server-failed"
          : "none",
      );
      setLastErrorKind(kind);
      recordAppNextNoticeDiagnostics({
        screen: "workspace-notices",
        phase,
        status: session?.status || "unknown",
        workspacePresent: Boolean(session?.currentWorkspaceId),
        workspaceRole: readPolicy.workspaceRole,
        ...workspaceResolutionDiagnostics,
        lastCompletedReadMode: requestMode === "server" || requestMode === "clear-memory-and-server"
          ? "server-failed"
          : "none",
        lastErrorKind: kind,
        rawReadCount: 0,
        filteredCount: 0,
        displayedCount: 0,
        fromCache: "-",
        pendingWrites: "-",
        currentWorkspaceFingerprint,
        listenerCount: 0,
        writeApiImported: true,
        automaticSignOut: "none",
      });
      setMessage(errorMessage(kind, requestMode));
      return false;
    } finally {
      const completedAt = new Date().toISOString();
      setLastReadCompletedAt(completedAt);
      recordAppNextNoticeDiagnostics({
        lastReadCompletedAt: completedAt,
      });
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [
    currentWorkspaceFingerprint,
    readPolicy.canRead,
    readPolicy.reason,
    readPolicy.workspaceRole,
    writePolicy.canCreate,
    resetNoticeState,
    phase,
    session?.status,
    session?.currentWorkspaceId,
    workspaceResolutionDiagnostics,
  ]);

  const handleServerUserSessionRefresh = useCallback(async () => {
    if (sessionRefreshBusy) return;
    setSessionRefreshBusy(true);
    setMessage("");
    try {
      await reloadSession();
      setMessage("서버 사용자 문서 기준으로 세션을 다시 확인했습니다.");
    } catch {
      setMessage("서버 사용자 문서 기준 세션 확인에 실패했습니다. 로그인 세션은 유지됩니다.");
    } finally {
      setSessionRefreshBusy(false);
    }
  }, [
    reloadSession,
    sessionRefreshBusy,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const appSessionFingerprint = await workspaceFingerprint(session?.currentWorkspaceId);
      let serverUsersDocumentFound = false;
      let serverUsersReadErrorKind = "none";
      let serverUsersCurrentWorkspaceFingerprint = "-";
      let serverUsersLegacyWorkspaceFingerprint = "-";

      if (session?.uid) {
        try {
          const snap = await getDocFromServer(doc(getFirebaseDb(), "users", session.uid));
          serverUsersDocumentFound = snap.exists();
          const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
          serverUsersCurrentWorkspaceFingerprint = await workspaceFingerprint(String(data.currentWorkspaceId || ""));
          serverUsersLegacyWorkspaceFingerprint = await workspaceFingerprint(String(data.workspaceId || data.workspace_id || ""));
        } catch (error) {
          serverUsersReadErrorKind = classifyServerUserReadError(error);
        }
      }

      return {
        appSessionFingerprint,
        serverUsersDocumentFound,
        serverUsersReadErrorKind,
        serverUsersCurrentWorkspaceFingerprint,
        serverUsersLegacyWorkspaceFingerprint,
      };
    })()
      .then((diagnostics) => {
        if (!cancelled) {
          setCurrentWorkspaceFingerprint(diagnostics.appSessionFingerprint);
          setServerUsersCurrentWorkspaceFingerprint(diagnostics.serverUsersCurrentWorkspaceFingerprint);
          recordAppNextNoticeDiagnostics({
            screen: "workspace-notices",
            currentWorkspaceFingerprint: diagnostics.appSessionFingerprint,
            appSessionWorkspaceFingerprint: diagnostics.appSessionFingerprint,
            usersCurrentWorkspaceFingerprint: diagnostics.serverUsersCurrentWorkspaceFingerprint,
            usersLegacyWorkspaceFingerprint: "-",
            serverUsersDocumentFound: diagnostics.serverUsersDocumentFound,
            serverUsersReadErrorKind: diagnostics.serverUsersReadErrorKind,
            serverUsersCurrentWorkspaceFingerprint: diagnostics.serverUsersCurrentWorkspaceFingerprint,
            serverUsersLegacyWorkspaceFingerprint: diagnostics.serverUsersLegacyWorkspaceFingerprint,
            ...workspaceResolutionDiagnostics,
            localStorageWorkspaceFingerprint: "-",
            storeWorkspaceFingerprint: "-",
            selectedWorkspaceFingerprint: "-",
            writeTargetWorkspaceFingerprint: diagnostics.appSessionFingerprint,
            noticeReadWriteTargetWorkspaceFingerprint: diagnostics.appSessionFingerprint,
            canonicalSource: "AppSession.currentWorkspaceId",
            ignoredLegacySourceCount: 0,
            databaseIdKind: "default",
            noticeCollectionKind: "workspace-notices",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentWorkspaceFingerprint("unavailable");
          setServerUsersCurrentWorkspaceFingerprint("unavailable");
          recordAppNextNoticeDiagnostics({
            screen: "workspace-notices",
            currentWorkspaceFingerprint: "unavailable",
            appSessionWorkspaceFingerprint: "unavailable",
            usersCurrentWorkspaceFingerprint: "unavailable",
            serverUsersReadErrorKind: "unknown",
            serverUsersCurrentWorkspaceFingerprint: "unavailable",
            canonicalSource: "AppSession.currentWorkspaceId",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    session?.currentWorkspaceId,
    session?.uid,
    workspaceResolutionDiagnostics,
  ]);

  useEffect(() => {
    void loadWorkspaceNotices("default");
  }, [loadWorkspaceNotices]);

  return (
    <section className="app-next-panel">
      <div className="app-next-section-head">
        <div>
          <h2>워크스페이스 공지</h2>
          <p>
            현재 선택된 워크스페이스의 <code>{"workspaces/{workspace}/notices"}</code>를 조회합니다. App Next에서 만든 공지만 기존 권한에 따라 관리할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadWorkspaceNotices("default")}
          disabled={loading || !readPolicy.canRead}
        >
          {loading && lastRequestedReadMode === "default" ? "조회 중" : "기본 조회"}
        </button>
        {import.meta.env.DEV ? (
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadWorkspaceNotices("server")}
              disabled={loading || !readPolicy.canRead}
            >
              {loading && lastRequestedReadMode === "server" ? "서버 조회 중" : "서버 강제 조회"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadWorkspaceNotices("clear-memory-and-server")}
              disabled={loading || !readPolicy.canRead}
            >
              {loading && lastRequestedReadMode === "clear-memory-and-server" ? "초기화 후 조회 중" : "메모리 비우고 서버 조회"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleServerUserSessionRefresh()}
              disabled={sessionRefreshBusy}
            >
              {sessionRefreshBusy ? "세션 확인 중" : "서버 사용자 기준 세션 다시 확인"}
            </button>
          </>
        ) : null}
      </div>

      <dl className="app-next-device-summary">
        <dt>데이터 source</dt>
        <dd>{sourceLabel(source)}</dd>
        <dt>lastRequestedReadMode</dt>
        <dd>{lastRequestedReadMode}</dd>
        <dt>lastCompletedReadMode</dt>
        <dd>{lastCompletedReadMode}</dd>
        <dt>rawReadCount</dt>
        <dd>{String(readCount)}</dd>
        <dt>displayedCount</dt>
        <dd>{String(notices.length)}</dd>
        <dt>fromCache</dt>
        <dd>{fromCache === null ? "-" : String(fromCache)}</dd>
        <dt>pendingWrites</dt>
        <dd>{hasPendingWrites === null ? "-" : String(hasPendingWrites)}</dd>
        <dt>workspace fingerprint</dt>
        <dd>{currentWorkspaceFingerprint}</dd>
        <dt>workspace role</dt>
        <dd>{readPolicy.workspaceRole}</dd>
      </dl>

      {readPolicy.canRead && writePolicy.canCreate && session?.currentWorkspaceId ? (
        <RequireWorkspaceRole
          allowedRoles={APP_NEXT_NOTICE_WRITE_ROLES}
          allowSystemOwnerBypass
          requireWorkspace
          previewMode
          useExistingAuthProvider
          defaultNewAuth
          currentRoute="notices"
          requestedRoute="notices"
          menuVisible
        >
          <AppNextWorkspaceNoticeCrud
            workspaceId={session.currentWorkspaceId}
            managedNotices={managedNotices}
            onServerConfirmed={() => loadWorkspaceNotices("server")}
          />
        </RequireWorkspaceRole>
      ) : null}

      {loading ? <p className="app-next-message">이전 결과와 구분하기 위해 새 요청을 처리 중입니다.</p> : null}
      {message && !loading ? <p className="app-next-message">{message}</p> : null}

      {notices.length > 0 ? (
        <div className="app-next-notice-list">
          {notices.map((notice) => (
            <NoticeCard
              key={notice.noticeKey}
              notice={notice}
              expanded={expandedNoticeKey === notice.noticeKey}
              onToggle={() => {
                setExpandedNoticeKey((current) => (
                  current === notice.noticeKey ? null : notice.noticeKey
                ));
              }}
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
            <dd>workspace-notices</dd>
            <dt>provider</dt>
            <dd>new</dd>
            <dt>legacy AuthContext mounted</dt>
            <dd>false</dd>
            <dt>data source</dt>
            <dd>workspaces/&#123;workspace&#125;/notices</dd>
            <dt>currentWorkspaceFingerprint</dt>
            <dd>{currentWorkspaceFingerprint}</dd>
            <dt>serverUsersCurrentWorkspaceFingerprint</dt>
            <dd>{serverUsersCurrentWorkspaceFingerprint}</dd>
            <dt>canonicalSource</dt>
            <dd>AppSession.currentWorkspaceId</dd>
            <dt>workspaceMismatchDetected</dt>
            <dd>{comparableDiagnosticFingerprint(currentWorkspaceFingerprint) && comparableDiagnosticFingerprint(serverUsersCurrentWorkspaceFingerprint) && currentWorkspaceFingerprint !== serverUsersCurrentWorkspaceFingerprint ? "true" : "false"}</dd>
            <dt>workspaceMismatchKind</dt>
            <dd>{comparableDiagnosticFingerprint(currentWorkspaceFingerprint) && comparableDiagnosticFingerprint(serverUsersCurrentWorkspaceFingerprint) && currentWorkspaceFingerprint !== serverUsersCurrentWorkspaceFingerprint ? "app-session-vs-server-user" : "none"}</dd>
            <dt>noticeCollectionKind</dt>
            <dd>workspace-notices</dd>
            <dt>workspace present</dt>
            <dd>{readPolicy.workspacePresent ? "true" : "false"}</dd>
            <dt>workspace role</dt>
            <dd>{readPolicy.workspaceRole}</dd>
            <dt>serverCurrentWorkspacePresent</dt>
            <dd>{String(workspaceResolutionDiagnostics.serverCurrentWorkspacePresent)}</dd>
            <dt>serverCurrentWorkspaceDocumentExists</dt>
            <dd>{String(workspaceResolutionDiagnostics.serverCurrentWorkspaceDocumentExists)}</dd>
            <dt>canonicalMembershipExists</dt>
            <dd>{String(workspaceResolutionDiagnostics.canonicalMembershipExists)}</dd>
            <dt>canonicalMembershipStatus</dt>
            <dd>{workspaceResolutionDiagnostics.canonicalMembershipStatus}</dd>
            <dt>canonicalMembershipRole</dt>
            <dd>{workspaceResolutionDiagnostics.canonicalMembershipRole}</dd>
            <dt>legacyMembershipExists</dt>
            <dd>{String(workspaceResolutionDiagnostics.legacyMembershipExists)}</dd>
            <dt>legacyMembershipStatus</dt>
            <dd>{workspaceResolutionDiagnostics.legacyMembershipStatus}</dd>
            <dt>legacyMembershipRole</dt>
            <dd>{workspaceResolutionDiagnostics.legacyMembershipRole}</dd>
            <dt>isSystemOwnerResolved</dt>
            <dd>{String(workspaceResolutionDiagnostics.isSystemOwnerResolved)}</dd>
            <dt>systemOwnerWorkspaceAccessAllowed</dt>
            <dd>{String(workspaceResolutionDiagnostics.systemOwnerWorkspaceAccessAllowed)}</dd>
            <dt>workspaceResolutionFailureKind</dt>
            <dd>{workspaceResolutionDiagnostics.workspaceResolutionFailureKind}</dd>
            <dt>lastRequestedReadMode</dt>
            <dd>{lastRequestedReadMode}</dd>
            <dt>lastCompletedReadMode</dt>
            <dd>{lastCompletedReadMode}</dd>
            <dt>lastReadStartedAt</dt>
            <dd>{formatDiagnosticTime(lastReadStartedAt)}</dd>
            <dt>lastReadCompletedAt</dt>
            <dd>{formatDiagnosticTime(lastReadCompletedAt)}</dd>
            <dt>fromCache</dt>
            <dd>{fromCache === null ? "-" : String(fromCache)}</dd>
            <dt>pendingWrites</dt>
            <dd>{hasPendingWrites === null ? "-" : String(hasPendingWrites)}</dd>
            <dt>lastErrorKind</dt>
            <dd>{lastErrorKind}</dd>
            <dt>raw read count</dt>
            <dd>{String(readCount)}</dd>
            <dt>filtered count</dt>
            <dd>{String(filteredCount)}</dd>
            <dt>displayed count</dt>
            <dd>{String(notices.length)}</dd>
            <dt>excluded count</dt>
            <dd>{String(excludedCount)}</dd>
            <dt>excluded reasons</dt>
            <dd>{Object.keys(excludedReasons).length ? JSON.stringify(excludedReasons) : "-"}</dd>
            <dt>sort field used</dt>
            <dd>{sortFieldUsed}</dd>
            <dt>sort policy</dt>
            <dd>{sortPolicy}</dd>
            <dt>pinned field used</dt>
            <dd>legacy-display-only</dd>
            <dt>author field used</dt>
            <dd>{authorFieldUsed}</dd>
            <dt>content field used</dt>
            <dd>{contentFieldUsed}</dd>
            <dt>schema kind counts</dt>
            <dd>{JSON.stringify(schemaKindCounts)}</dd>
            <dt>unknown schema count</dt>
            <dd>{String(unknownSchemaCount)}</dd>
            <dt>source counts</dt>
            <dd>{Object.keys(sourceCounts).length ? JSON.stringify(sourceCounts) : "-"}</dd>
            <dt>content mapping by schema</dt>
            <dd>{Object.keys(contentMappingBySchema).length ? JSON.stringify(contentMappingBySchema) : "-"}</dd>
            <dt>author mapping by schema</dt>
            <dd>{Object.keys(authorMappingBySchema).length ? JSON.stringify(authorMappingBySchema) : "-"}</dd>
            <dt>date mapping by schema</dt>
            <dd>{Object.keys(dateMappingBySchema).length ? JSON.stringify(dateMappingBySchema) : "-"}</dd>
            <dt>category mapping by schema</dt>
            <dd>{Object.keys(categoryMappingBySchema).length ? JSON.stringify(categoryMappingBySchema) : "-"}</dd>
            <dt>schema/source sequence</dt>
            <dd>{schemaSequence.length ? JSON.stringify(schemaSequence) : "-"}</dd>
            <dt>noticeReadCount</dt>
            <dd>{String(readCount)}</dd>
            <dt>noticeCreateCount</dt>
            <dd>{String(writeDiagnostics.createCount)}</dd>
            <dt>noticeUpdateCount</dt>
            <dd>{String(writeDiagnostics.updateCount)}</dd>
            <dt>noticeDeleteCount</dt>
            <dd>{String(writeDiagnostics.deleteCount)}</dd>
            <dt>write attempt count</dt>
            <dd>{String(writeDiagnostics.writeAttemptCount)}</dd>
            <dt>lastNoticeWriteReason</dt>
            <dd>{writeDiagnostics.lastWriteReason}</dd>
            <dt>listener count</dt>
            <dd>0</dd>
            <dt>write API imported</dt>
            <dd>true</dd>
            <dt>automatic signOut</dt>
            <dd>none</dd>
          </dl>
        </section>
      ) : null}
    </section>
  );
}
