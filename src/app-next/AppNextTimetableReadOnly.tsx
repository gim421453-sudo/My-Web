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
  recordAppNextTimetableDiagnostics,
} from "./appNextDiagnostics";
import {
  loadAppNextTimetableReadonly,
  type LoadAppNextTimetableReadonlyResult,
} from "./appNextTimetableReadonlyService";
import {
  appNextTimetableReadPolicy,
  detectSensitiveTimetableText,
  normalizeAppNextTimetableStore,
  type AppNextTimetableCell,
  type AppNextTimetableNormalized,
} from "./appNextTimetableReadonlyUtils";

type TimetableErrorCode =
  | "none"
  | "workspace-missing"
  | "permission-denied"
  | "resource-exhausted"
  | "unavailable"
  | "malformed"
  | "unknown";

const emptyNormalized = normalizeAppNextTimetableStore({
  timetable: [],
  timetableSets: [],
  periodTimes: [],
});
const timetableCache = new Map<string, LoadAppNextTimetableReadonlyResult>();
const timetableInFlight = new Map<string, Promise<LoadAppNextTimetableReadonlyResult>>();

let timetableRenderCount = 0;
let timetableReadCount = 0;
let timetableLoadCount = 0;
let timetableCacheHitCount = 0;

function currentTimetableSelectionId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem("pm-timetable-set") || "";
  } catch {
    return "";
  }
}

function booleanLabel(value: boolean): string {
  return value ? "예" : "아니오";
}

function classifyTimetableError(error: unknown): TimetableErrorCode {
  const code = String((error as { code?: unknown })?.code || "");
  if (code.includes("permission-denied")) return "permission-denied";
  if (code.includes("resource-exhausted")) return "resource-exhausted";
  if (code.includes("unavailable") || code.includes("network")) return "unavailable";
  return "unknown";
}

function errorMessage(errorCode: TimetableErrorCode): string {
  if (errorCode === "workspace-missing") return "워크스페이스가 선택되지 않아 시간표를 조회하지 않았습니다.";
  if (errorCode === "permission-denied") return "시간표를 읽을 권한을 확인해 주세요.";
  if (errorCode === "resource-exhausted") return "현재 Firestore 조회 한도를 초과했습니다.";
  if (errorCode === "unavailable") return "네트워크 연결을 확인해 주세요.";
  if (errorCode === "malformed") return "시간표 데이터 형식 일부가 올바르지 않아 조회 전용 fallback으로 표시합니다.";
  if (errorCode === "unknown") return "시간표를 불러오지 못했습니다.";
  return "";
}

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

function cellDetails(cell: AppNextTimetableCell): string {
  return [
    cell.teacher,
    cell.room,
    cell.time,
  ].filter(Boolean).join(" · ");
}

function TimetableCellList({
  cells,
}: {
  cells: AppNextTimetableCell[];
}) {
  if (!cells.length) return <span className="app-next-timetable-empty">-</span>;
  return (
    <div className="app-next-timetable-cell-list">
      {cells.map((cell) => (
        <article
          className={cell.invalid ? "app-next-timetable-class invalid" : "app-next-timetable-class"}
          key={`${cell.stableKey}-${cell.sourceIndex}`}
        >
          <strong>{cell.subject}</strong>
          {cellDetails(cell) ? <span>{cellDetails(cell)}</span> : null}
        </article>
      ))}
    </div>
  );
}

function WeeklyGrid({
  normalized,
}: {
  normalized: AppNextTimetableNormalized;
}) {
  const byCell = new Map<string, AppNextTimetableCell[]>();
  normalized.regularCells.forEach((cell) => {
    const key = `${cell.day}|${cell.period}`;
    byCell.set(key, [...(byCell.get(key) || []), cell]);
  });

  return (
    <div className="app-next-timetable-scroll">
      <table className="app-next-timetable-table">
        <thead>
          <tr>
            <th>교시</th>
            {normalized.days.map((day) => (
              <th
                className={day === normalized.todayWeekday ? "today" : ""}
                key={day}
              >
                {day}요일
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalized.periods.map((period) => (
            <tr key={period.period}>
              <th>
                <span>{period.period}</span>
                {period.time ? <small>{period.time}</small> : null}
              </th>
              {normalized.days.map((day) => (
                <td
                  className={day === normalized.todayWeekday ? "today" : ""}
                  key={`${day}-${period.period}`}
                >
                  <TimetableCellList cells={byCell.get(`${day}|${period.period}`) || []} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AppNextTimetableReadOnly({
  currentRoute,
  requestedRoute,
  onNavigate,
}: {
  currentRoute: string;
  requestedRoute: string;
  onNavigate(route: "dashboard" | "account" | "notices"): void;
}) {
  const {
    phase,
    session,
  } = useAuth();
  const renderCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<TimetableErrorCode>("none");
  const [normalized, setNormalized] = useState<AppNextTimetableNormalized>(emptyNormalized);
  const [duplicateLoadDetected, setDuplicateLoadDetected] = useState(false);

  renderCountRef.current += 1;
  timetableRenderCount += 1;

  const policy = useMemo(
    () => appNextTimetableReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );
  const sensitiveValueDetected = useMemo(
    () => detectSensitiveTimetableText([
      policy.globalRoleCategory,
      policy.workspaceRoleCategory,
      normalized.activeSetName,
      normalized.todayWeekday,
    ]),
    [
      normalized.activeSetName,
      normalized.todayWeekday,
      policy.globalRoleCategory,
      policy.workspaceRoleCategory,
    ],
  );

  const updateDiagnostics = useCallback((next: Partial<Parameters<typeof recordAppNextTimetableDiagnostics>[0]> = {}) => {
    const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
    recordAppNextTimetableDiagnostics({
      loading,
      errorCode,
      timetableRenderCount,
      timetableReadCount,
      timetableWriteAttemptCount: 0,
      timetableListenerStartCount: 0,
      timetableActiveListenerCount: 0,
      timetableLoadCount,
      timetableCacheHitCount,
      duplicateLoadDetected,
      hasWorkspace: policy.hasWorkspace,
      globalRoleCategory: policy.globalRoleCategory,
      workspaceRoleCategory: policy.workspaceRoleCategory,
      isSystemOwner: policy.isSystemOwner,
      timetableCellCount: normalized.visibleCells.length,
      regularCellCount: normalized.regularCells.length,
      afterschoolCellCount: normalized.afterschoolCells.length,
      visibleCellCount: normalized.visibleCells.length,
      emptyCellCount: normalized.emptyCellCount,
      invalidCellCount: normalized.invalidCells.length,
      duplicateCellDetected: normalized.duplicateGroups.length > 0,
      duplicateCellGroupCount: normalized.duplicateGroups.length,
      duplicateCellItemCount: normalized.duplicateCellItemCount,
      duplicateCellMutationAttemptCount: 0,
      todayWeekday: normalized.todayWeekday,
      todayClassCount: normalized.todayCells.length,
      firestoreReadCount: timetableReadCount,
      firestoreWriteAttemptCount: 0,
      authListenerCount: authDiagnostics.authStateListenerCount,
      workspaceListenerCount: 0,
      currentRoute,
      requestedRoute,
      restoreConflictDetected: getAppNextAuthRouteMatrixDiagnostics().restoreConflictDetected,
      sensitiveValueDetected,
      ...next,
    });
  }, [
    currentRoute,
    duplicateLoadDetected,
    errorCode,
    loading,
    normalized,
    policy.globalRoleCategory,
    policy.hasWorkspace,
    policy.isSystemOwner,
    policy.workspaceRoleCategory,
    requestedRoute,
    sensitiveValueDetected,
  ]);

  const loadTimetable = useCallback(async (forceRefresh = false) => {
    if (!policy.routeAllowed) {
      setLoading(false);
      setErrorCode(policy.reason === "loading" ? "none" : "unknown");
      setNormalized(emptyNormalized);
      updateDiagnostics({
        loading: false,
        errorCode: policy.reason === "loading" ? "none" : "unknown",
        timetableCellCount: 0,
        regularCellCount: 0,
        afterschoolCellCount: 0,
        visibleCellCount: 0,
        emptyCellCount: 0,
        invalidCellCount: 0,
      });
      return;
    }

    if (!policy.canRead || !session?.currentWorkspaceId) {
      setLoading(false);
      setErrorCode("workspace-missing");
      setNormalized(emptyNormalized);
      updateDiagnostics({
        loading: false,
        errorCode: "workspace-missing",
        timetableCellCount: 0,
        regularCellCount: 0,
        afterschoolCellCount: 0,
        visibleCellCount: 0,
      });
      return;
    }

    const requestedSetId = currentTimetableSelectionId();
    const cacheKey = `${session.currentWorkspaceId}::${requestedSetId || "default"}`;
    const existingRequest = timetableInFlight.get(cacheKey);
    if ((existingRequest || inFlightRef.current) && !forceRefresh) {
      setLoading(true);
      updateDiagnostics({
        loading: true,
        duplicateLoadDetected: false,
      });
      if (existingRequest) {
        try {
          const result = await existingRequest;
          setNormalized(result.normalized);
          setErrorCode("none");
          updateDiagnostics({
            loading: false,
            errorCode: "none",
            duplicateLoadDetected: false,
          });
        } catch (loadError) {
          const nextError = classifyTimetableError(loadError);
          setErrorCode(nextError);
          updateDiagnostics({
            loading: false,
            errorCode: nextError,
            duplicateLoadDetected: false,
          });
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    const cached = forceRefresh ? null : timetableCache.get(cacheKey);
    if (cached) {
      timetableCacheHitCount += 1;
      setNormalized(cached.normalized);
      setErrorCode("none");
      setLoading(false);
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        timetableCacheHitCount,
      });
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setErrorCode("none");
    timetableLoadCount += 1;
    timetableReadCount += 3;
    updateDiagnostics({
      loading: true,
      errorCode: "none",
      timetableLoadCount,
      timetableReadCount,
      firestoreReadCount: timetableReadCount,
    });

    const request = loadAppNextTimetableReadonly({
      workspaceId: session.currentWorkspaceId,
      requestedSetId,
    });
    timetableInFlight.set(cacheKey, request);
    try {
      const result = await request;
      timetableCache.set(cacheKey, result);
      setNormalized(result.normalized);
      setErrorCode("none");
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        timetableCellCount: result.normalized.visibleCells.length,
        regularCellCount: result.normalized.regularCells.length,
        afterschoolCellCount: result.normalized.afterschoolCells.length,
        visibleCellCount: result.normalized.visibleCells.length,
        emptyCellCount: result.normalized.emptyCellCount,
        invalidCellCount: result.normalized.invalidCells.length,
        duplicateCellDetected: result.normalized.duplicateGroups.length > 0,
        duplicateCellGroupCount: result.normalized.duplicateGroups.length,
        duplicateCellItemCount: result.normalized.duplicateCellItemCount,
        todayWeekday: result.normalized.todayWeekday,
        todayClassCount: result.normalized.todayCells.length,
      });
    } catch (loadError) {
      const nextError = classifyTimetableError(loadError);
      setNormalized(emptyNormalized);
      setErrorCode(nextError);
      updateDiagnostics({
        loading: false,
        errorCode: nextError,
        timetableCellCount: 0,
        regularCellCount: 0,
        afterschoolCellCount: 0,
        visibleCellCount: 0,
      });
    } finally {
      if (timetableInFlight.get(cacheKey) === request) timetableInFlight.delete(cacheKey);
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [
    policy.canRead,
    policy.reason,
    policy.routeAllowed,
    session?.currentWorkspaceId,
    updateDiagnostics,
  ]);

  useEffect(() => {
    void loadTimetable(false);
    // Keep Firestore reads keyed to auth/workspace state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
    policy.canRead,
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
          <p className="app-next-muted-label">App Next 시간표 조회 전용 Pilot</p>
          <h2>시간표 조회</h2>
          <p>운영 시간표 V111/V120은 유지하고, 같은 workspace 시간표 데이터를 읽기 전용으로 표시합니다.</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => void loadTimetable(true)}
          disabled={loading || !policy.canRead}
        >
          {loading ? "조회 중" : "새로고침"}
        </button>
      </section>

      <section className="app-next-panel">
        <h2>시간표 상태 요약</h2>
        <dl>
          <ValueRow label="workspace 존재" value={booleanLabel(policy.hasWorkspace)} />
          <ValueRow label="조회 상태" value={loading ? "loading" : errorCode} />
          <ValueRow label="일반 시간표 셀" value={String(normalized.regularCells.length)} />
          <ValueRow label="방과후/특강/동아리 셀" value={String(normalized.afterschoolCells.length)} />
          <ValueRow label="중복 셀 경고" value={String(normalized.duplicateGroups.length)} />
          <ValueRow label="읽기 전용" value="예" />
        </dl>
        {errorCode !== "none" && !loading ? (
          <p className="app-next-message">{errorMessage(errorCode)}</p>
        ) : null}
        {normalized.duplicateGroups.length ? (
          <p className="app-next-message app-next-warning">
            같은 요일·교시에 여러 시간표 항목이 감지되었습니다. 데이터는 변경하지 않았으며 조회 전용으로 모두 표시합니다.
          </p>
        ) : null}
        {normalized.orphanRowsExcluded ? (
          <p className="app-next-message">삭제되었거나 존재하지 않는 시간표에 연결된 항목 {normalized.orphanRowsExcluded}개는 표시하지 않았습니다.</p>
        ) : null}
      </section>

      {!policy.hasWorkspace ? (
        <section className="app-next-panel">
          <h2>워크스페이스가 선택되지 않음</h2>
          <p>이 route 접근은 유지하지만 Firestore 시간표 조회는 실행하지 않습니다.</p>
        </section>
      ) : null}

      {policy.hasWorkspace && !loading && errorCode === "none" && normalized.visibleCells.length === 0 ? (
        <section className="app-next-panel">
          <h2>표시할 시간표가 없습니다</h2>
          <p>시간표 문서가 없거나 표시 가능한 셀이 없습니다.</p>
        </section>
      ) : null}

      {policy.hasWorkspace && normalized.periods.length > 0 ? (
        <section className="app-next-panel app-next-timetable-panel">
          <h2>{normalized.activeSetName || "주간 시간표"}</h2>
          <WeeklyGrid normalized={normalized} />
        </section>
      ) : null}

      <div className="app-next-dashboard-grid">
        <section className="app-next-panel">
          <h2>오늘 일정 요약</h2>
          <dl>
            <ValueRow label="오늘 요일" value={`${normalized.todayWeekday}요일`} />
            <ValueRow label="오늘 수업 수" value={String(normalized.todayCells.length)} />
            <ValueRow label="첫 수업" value={normalized.firstTodayCell ? `${normalized.firstTodayCell.period} ${normalized.firstTodayCell.subject}` : "없음"} />
            <ValueRow label="마지막 수업" value={normalized.lastTodayCell ? `${normalized.lastTodayCell.period} ${normalized.lastTodayCell.subject}` : "없음"} />
          </dl>
        </section>

        <section className="app-next-panel">
          <h2>방과후 시간표</h2>
          {normalized.afterschoolSupported ? (
            <div className="app-next-timetable-card-list">
              {normalized.afterschoolCells.map((cell) => (
                <article className="app-next-timetable-card" key={`${cell.stableKey}-after`}>
                  <strong>{cell.day}요일 {cell.period}</strong>
                  <span>{cell.subject}</span>
                  {cellDetails(cell) ? <small>{cellDetails(cell)}</small> : null}
                </article>
              ))}
            </div>
          ) : (
            <p>이번 파일럿에서는 방과후 구분 미지원 또는 표시 가능한 방과후 시간표가 없습니다.</p>
          )}
        </section>
      </div>

      <section className="app-next-panel">
        <h2>관련 화면</h2>
        <div className="app-next-actions app-next-readonly-actions">
          <button type="button" className="secondary" onClick={() => onNavigate("dashboard")}>
            대시보드
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("notices")}>
            공지 보기
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("account")}>
            계정 상태
          </button>
        </div>
      </section>
    </>
  );
}
