import { AppNextPrintReport } from "./AppNextPrintReport";
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
  getAppNextSchedulesDiagnostics,
  recordAppNextSchedulesDiagnostics,
} from "./appNextDiagnostics";
import {
  loadAppNextSchedulesReadonly,
  type LoadAppNextSchedulesReadonlyResult,
} from "./appNextSchedulesReadonlyService";
import {
  APP_NEXT_EMPTY_SCHEDULE_FILTER,
  appNextScheduleFilterSignature,
  appNextScheduleReadPolicy,
  applyAppNextScheduleFilters,
  detectSensitiveScheduleText,
  normalizeAppNextSchedulesStore,
  type AppNextScheduleFilter,
  type AppNextScheduleRecord,
  type AppNextSchedulesNormalized,
} from "./appNextSchedulesReadonlyUtils";
import RequireWorkspaceRole from "../components/guards/RequireWorkspaceRole";
import { AppNextScheduleCrud } from "./AppNextScheduleCrud";
import { APP_NEXT_SCHEDULE_WRITE_ROLES, appNextScheduleWritePolicy, type AppNextScheduleManagementRecord } from "./appNextScheduleCrudUtils";

type ScheduleErrorCode =
  | "none"
  | "workspace-missing"
  | "permission-denied"
  | "resource-exhausted"
  | "unavailable"
  | "unknown";

const emptyNormalized = normalizeAppNextSchedulesStore({
  schedules: [],
});
const schedulesCache = new Map<string, LoadAppNextSchedulesReadonlyResult>();
const schedulesInFlight = new Map<string, Promise<LoadAppNextSchedulesReadonlyResult>>();

let scheduleRenderCount = 0;
let scheduleLoadCount = 0;
let scheduleReadCount = 0;
let scheduleCacheHitCount = 0;
let manualRefreshCount = 0;
let cacheInvalidationCount = 0;
let forceReloadCount = 0;

const SCHEDULE_STATUS_OPTIONS: Array<{
  value: AppNextScheduleFilter["bucket"];
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "upcoming", label: "예정" },
  { value: "completed", label: "완료" },
  { value: "past", label: "지난 일정" },
  { value: "invalid", label: "날짜 확인 필요" },
];

function booleanLabel(value: boolean): string {
  return value ? "예" : "아니요";
}

function classifyScheduleError(error: unknown): ScheduleErrorCode {
  const code = String((error as { code?: unknown })?.code || "");
  if (code.includes("permission-denied")) return "permission-denied";
  if (code.includes("resource-exhausted")) return "resource-exhausted";
  if (code.includes("unavailable") || code.includes("network")) return "unavailable";
  return "unknown";
}

function errorMessage(errorCode: ScheduleErrorCode): string {
  if (errorCode === "workspace-missing") return "워크스페이스가 선택되지 않아 일정 데이터를 조회하지 않습니다.";
  if (errorCode === "permission-denied") return "일정을 읽을 권한을 확인해 주세요.";
  if (errorCode === "resource-exhausted") return "현재 Firestore 조회 한도를 초과했습니다.";
  if (errorCode === "unavailable") return "네트워크 연결을 확인해 주세요.";
  if (errorCode === "unknown") return "일정을 불러오지 못했습니다.";
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

function ScheduleCard({
  schedule,
  cardKey,
  selected,
  onSelect,
  onClose,
}: {
  schedule: AppNextScheduleRecord;
  cardKey: string;
  selected: boolean;
  onSelect(): void;
  onClose(): void;
}) {
  return (
    <article className={schedule.isInvalid ? "app-next-schedule-card invalid" : "app-next-schedule-card"}>
      <div className="app-next-schedule-head">
        <div>
          <strong>{schedule.title}</strong>
          <span>{schedule.dateLabel} · {schedule.timeLabel}</span>
        </div>
        <em>{schedule.typeLabel}</em>
      </div>
      <dl>
        <ValueRow label="상태" value={schedule.statusLabel} />
        <ValueRow label="중요도" value={schedule.importanceLabel} />
      </dl>
      <button
        type="button"
        className="secondary app-next-inline-action"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect();
        }}
      >
        {selected ? "상세 닫기" : "상세 보기"}
      </button>
      {selected ? (
        <div className="app-next-schedule-detail inline" data-schedule-card={cardKey}>
          <strong>{schedule.title}</strong>
          <dl>
            <ValueRow label="일자" value={schedule.dateLabel} />
            <ValueRow label="시간" value={schedule.timeLabel} />
            <ValueRow label="유형" value={schedule.typeLabel} />
            <ValueRow label="상태" value={schedule.statusLabel} />
            <ValueRow label="중요도" value={schedule.importanceLabel} />
            <ValueRow label="장소" value={schedule.location || "-"} />
          </dl>
          {schedule.memo ? <p>{schedule.memo}</p> : <p>추가 설명이 없습니다.</p>}
          <button
            type="button"
            className="secondary app-next-inline-action"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
          >
            닫기
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ScheduleList({
  listKey,
  title,
  schedules,
  selectedKey,
  selectedCardKey,
  onSelect,
  limit,
}: {
  listKey: string;
  title: string;
  schedules: AppNextScheduleRecord[];
  selectedKey: string;
  selectedCardKey: string;
  onSelect(schedule: AppNextScheduleRecord, cardKey: string): void;
  limit?: number;
}) {
  const rows = typeof limit === "number" ? schedules.slice(0, limit) : schedules;
  return (
    <section className="app-next-panel">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="app-next-schedule-list">
          {rows.map((schedule) => {
            const cardKey = `${listKey}:${schedule.stableKey}`;
            return (
              <ScheduleCard
                key={cardKey}
                cardKey={cardKey}
                schedule={schedule}
                selected={selectedKey === schedule.stableKey && selectedCardKey === cardKey}
                onSelect={() => onSelect(schedule, cardKey)}
                onClose={() => onSelect(schedule, cardKey)}
              />
            );
          })}
        </div>
      ) : (
        <p className="app-next-message">표시할 일정이 없습니다.</p>
      )}
    </section>
  );
}

export function AppNextSchedulesReadOnly({
  currentRoute,
  requestedRoute,
  onNavigate,
}: {
  currentRoute: string;
  requestedRoute: string;
  onNavigate(route: "dashboard" | "account" | "notices" | "timetable-readonly"): void;
}) {
  const {
    phase,
    session,
  } = useAuth();
  const renderCountRef = useRef(0);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<ScheduleErrorCode>("none");
  const [normalized, setNormalized] = useState<AppNextSchedulesNormalized>(emptyNormalized);
  const [managementRecords, setManagementRecords] = useState<AppNextScheduleManagementRecord[]>([]);
  const sessionKey = `${session?.uid ?? ""}:${session?.currentWorkspaceId ?? ""}:${phase}`;
  const sessionKeyRef = useRef(sessionKey);
  sessionKeyRef.current = sessionKey;
  const writePolicy = appNextScheduleWritePolicy({ phase, session });
  const [duplicateLoadDetected, setDuplicateLoadDetected] = useState(false);
  const [filter, setFilter] = useState<AppNextScheduleFilter>(APP_NEXT_EMPTY_SCHEDULE_FILTER);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedCardKey, setSelectedCardKey] = useState("");

  renderCountRef.current += 1;
  scheduleRenderCount += 1;

  const policy = useMemo(
    () => appNextScheduleReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );
  const selectedFilter = useMemo(
    () => appNextScheduleFilterSignature(filter),
    [
      filter,
    ],
  );
  const filteredSchedules = useMemo(
    () => applyAppNextScheduleFilters(normalized, filter),
    [
      filter,
      normalized,
    ],
  );
  const dateRangeInvalid = Boolean(filter.fromDate && filter.toDate && filter.fromDate > filter.toDate);
  const selectedSchedule = useMemo(
    () => normalized.visibleRecords.find((schedule) => schedule.stableKey === selectedKey) || null,
    [
      normalized.visibleRecords,
      selectedKey,
    ],
  );
  const selectedScheduleMatchCount = useMemo(
    () => selectedKey
      ? normalized.visibleRecords.filter((schedule) => schedule.stableKey === selectedKey).length
      : 0,
    [
      normalized.visibleRecords,
      selectedKey,
    ],
  );
  const detailSelectionMismatchDetected = Boolean(selectedKey && selectedScheduleMatchCount !== 1);
  const sensitiveValueDetected = useMemo(
    () => detectSensitiveScheduleText([
      selectedFilter,
      policy.globalRoleCategory,
      policy.workspaceRoleCategory,
      currentRoute,
      requestedRoute,
    ]),
    [
      currentRoute,
      policy.globalRoleCategory,
      policy.workspaceRoleCategory,
      requestedRoute,
      selectedFilter,
    ],
  );

  const updateDiagnostics = useCallback((next: Partial<Parameters<typeof recordAppNextSchedulesDiagnostics>[0]> = {}) => {
    const authDiagnostics = getAuthProviderDiagnosticsSnapshot();
    recordAppNextSchedulesDiagnostics({
      loading,
      errorCode,
      scheduleRenderCount,
      scheduleLoadCount,
      scheduleReadCount,
      scheduleWriteAttemptCount: getAppNextSchedulesDiagnostics().scheduleWriteAttemptCount,
      scheduleListenerStartCount: 0,
      scheduleActiveListenerCount: 0,
      scheduleCacheHitCount,
      duplicateLoadDetected,
      manualRefreshCount,
      cacheInvalidationCount,
      forceReloadCount,
      detailPanelOpen: Boolean(selectedSchedule),
      selectedSchedulePresent: Boolean(selectedSchedule),
      selectedScheduleMatchCount,
      detailSelectionMismatchDetected,
      filterStatusOptionCount: SCHEDULE_STATUS_OPTIONS.length,
      filterTypeOptionCount: normalized.typeOptions.length + 1,
      filterImportanceOptionCount: normalized.importanceOptions.length + 1,
      scheduleRawReadCount: normalized.records.length,
      lastScheduleSourceCollection: "workspaces/{workspace}/schedules",
      hasWorkspace: policy.hasWorkspace,
      globalRoleCategory: policy.globalRoleCategory,
      workspaceRoleCategory: policy.workspaceRoleCategory,
      isSystemOwner: policy.isSystemOwner,
      totalScheduleCount: normalized.records.length,
      visibleScheduleCount: filteredSchedules.length,
      todayScheduleCount: normalized.todayRecords.length,
      upcomingScheduleCount: normalized.upcomingRecords.length,
      completedScheduleCount: normalized.completedRecords.length,
      pastScheduleCount: normalized.pastRecords.length,
      hiddenScheduleCount: normalized.hiddenRecords.length,
      invalidScheduleCount: normalized.invalidRecords.length,
      allDayScheduleCount: normalized.allDayRecords.length,
      timedScheduleCount: normalized.timedRecords.length,
      selectedFilter,
      firestoreReadCount: scheduleReadCount,
      firestoreWriteAttemptCount: getAppNextSchedulesDiagnostics().firestoreWriteAttemptCount,
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
    detailSelectionMismatchDetected,
    duplicateLoadDetected,
    errorCode,
    filteredSchedules.length,
    loading,
    normalized,
    policy.globalRoleCategory,
    policy.hasWorkspace,
    policy.isSystemOwner,
    policy.workspaceRoleCategory,
    requestedRoute,
    selectedScheduleMatchCount,
    selectedSchedule,
    selectedFilter,
    sensitiveValueDetected,
  ]);

  const loadSchedules = useCallback(async (forceRefresh = false): Promise<boolean> => {
    const requestSessionKey = sessionKeyRef.current;
    if (!policy.routeAllowed) {
      setLoading(false);
      setErrorCode(policy.reason === "loading" ? "none" : "unknown");
      setNormalized(emptyNormalized);
      setManagementRecords([]);
      setSelectedKey("");
      setSelectedCardKey("");
      updateDiagnostics({
        loading: false,
        errorCode: policy.reason === "loading" ? "none" : "unknown",
        totalScheduleCount: 0,
        visibleScheduleCount: 0,
      });
      return false;
    }

    if (!policy.canRead || !session?.currentWorkspaceId) {
      setLoading(false);
      setErrorCode("workspace-missing");
      setNormalized(emptyNormalized);
      setManagementRecords([]);
      setSelectedKey("");
      setSelectedCardKey("");
      updateDiagnostics({
        loading: false,
        errorCode: "workspace-missing",
        totalScheduleCount: 0,
        visibleScheduleCount: 0,
      });
      return false;
    }

    const cacheKey = session.currentWorkspaceId;
    const existingRequest = schedulesInFlight.get(cacheKey);
    // A post-write refresh must not reuse a query that started before the write.
    if (forceRefresh && existingRequest) {
      await existingRequest.catch(() => undefined);
      if (sessionKeyRef.current !== requestSessionKey) return false;
      return loadSchedules(true);
    }
    if (existingRequest || inFlightRef.current) {
      setLoading(true);
      updateDiagnostics({
        loading: true,
        duplicateLoadDetected: false,
      });
      if (existingRequest) {
        try {
          const result = await existingRequest;
          if (sessionKeyRef.current !== requestSessionKey) return false;
          setNormalized(result.normalized);
          setManagementRecords(result.managementRecords);
          setSelectedKey((current) => (
            current && result.normalized.visibleRecords.some((schedule) => schedule.stableKey === current)
              ? current
              : ""
          ));
          setSelectedCardKey((current) => (
            selectedKey && result.normalized.visibleRecords.some((schedule) => schedule.stableKey === selectedKey)
              ? current
              : ""
          ));
          setErrorCode("none");
          updateDiagnostics({
            loading: false,
            errorCode: "none",
            duplicateLoadDetected: false,
          });
          return true;
        } catch (loadError) {
          if (sessionKeyRef.current !== requestSessionKey) return false;
          const nextError = classifyScheduleError(loadError);
          setErrorCode(nextError);
          updateDiagnostics({
            loading: false,
            errorCode: nextError,
            duplicateLoadDetected: false,
          });
          return false;
        } finally {
          setLoading(false);
        }
      }
      return false;
    }

    if (forceRefresh) {
      manualRefreshCount += 1;
      cacheInvalidationCount += schedulesCache.has(cacheKey) ? 1 : 0;
      forceReloadCount += 1;
      schedulesCache.delete(cacheKey);
      updateDiagnostics({
        manualRefreshCount,
        cacheInvalidationCount,
        forceReloadCount,
        lastScheduleReadMode: "server",
      });
    }

    const cached = forceRefresh ? null : schedulesCache.get(cacheKey);
    if (cached) {
      scheduleCacheHitCount += 1;
      setNormalized(cached.normalized);
      setManagementRecords(cached.managementRecords);
      setErrorCode("none");
      setLoading(false);
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        scheduleCacheHitCount,
        lastScheduleReadMode: "cache",
      });
      return true;
    }

    inFlightRef.current = true;
    setLoading(true);
    setErrorCode("none");
    scheduleLoadCount += 1;
    scheduleReadCount += 1;
    updateDiagnostics({
      loading: true,
      errorCode: "none",
      scheduleLoadCount,
      scheduleReadCount,
      firestoreReadCount: scheduleReadCount,
      lastScheduleReadMode: forceRefresh ? "server" : "default",
    });

    const request = loadAppNextSchedulesReadonly({
      workspaceId: session.currentWorkspaceId,
      readMode: forceRefresh ? "server" : "default",
    });
    schedulesInFlight.set(cacheKey, request);
    try {
      const result = await request;
      if (sessionKeyRef.current !== requestSessionKey) return false;
      schedulesCache.set(cacheKey, result);
      setNormalized(result.normalized);
      setManagementRecords(result.managementRecords);
      setSelectedKey((current) => (
        current && result.normalized.visibleRecords.some((schedule) => schedule.stableKey === current)
          ? current
          : ""
      ));
      setSelectedCardKey((current) => (
        selectedKey && result.normalized.visibleRecords.some((schedule) => schedule.stableKey === selectedKey)
          ? current
          : ""
      ));
      setErrorCode("none");
      updateDiagnostics({
        loading: false,
        errorCode: "none",
        totalScheduleCount: result.normalized.records.length,
        visibleScheduleCount: result.normalized.visibleRecords.length,
        todayScheduleCount: result.normalized.todayRecords.length,
        upcomingScheduleCount: result.normalized.upcomingRecords.length,
        completedScheduleCount: result.normalized.completedRecords.length,
        pastScheduleCount: result.normalized.pastRecords.length,
        hiddenScheduleCount: result.normalized.hiddenRecords.length,
        invalidScheduleCount: result.normalized.invalidRecords.length,
        allDayScheduleCount: result.normalized.allDayRecords.length,
        timedScheduleCount: result.normalized.timedRecords.length,
        scheduleRawReadCount: result.rawReadCount,
        lastScheduleReadMode: forceRefresh ? "server" : "default",
        lastScheduleFromCache: result.fromCache,
        lastSchedulePendingWrites: result.hasPendingWrites,
      });
      return true;
    } catch (loadError) {
      if (sessionKeyRef.current !== requestSessionKey) return false;
      const nextError = classifyScheduleError(loadError);
      setNormalized(emptyNormalized);
      setManagementRecords([]);
      setSelectedKey("");
      setSelectedCardKey("");
      setErrorCode(nextError);
      updateDiagnostics({
        loading: false,
        errorCode: nextError,
        totalScheduleCount: 0,
        visibleScheduleCount: 0,
      });
      return false;
    } finally {
      if (schedulesInFlight.get(cacheKey) === request) schedulesInFlight.delete(cacheKey);
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [
    policy.canRead,
    policy.reason,
    policy.routeAllowed,
    session?.currentWorkspaceId,
    selectedKey,
    updateDiagnostics,
  ]);

  useEffect(() => {
    void loadSchedules(false);
    // Keep Firestore reads keyed to auth/workspace state only. Filter changes are client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
    policy.canRead,
    policy.routeAllowed,
    session?.currentWorkspaceId,
  ]);

  useEffect(() => {
    const reconnect = () => { if (policy.canRead && policy.routeAllowed) void loadSchedules(true); };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [loadSchedules, policy.canRead, policy.routeAllowed]);

  useEffect(() => {
    updateDiagnostics();
  }, [
    updateDiagnostics,
  ]);

  useEffect(() => {
    if (!selectedKey) return;
    if (filteredSchedules.some((schedule) => schedule.stableKey === selectedKey)) return;
    setSelectedKey("");
    setSelectedCardKey("");
  }, [
    filteredSchedules,
    selectedKey,
  ]);

  const toggleScheduleSelection = useCallback((schedule: AppNextScheduleRecord, cardKey: string) => {
    setSelectedKey((currentScheduleKey) => {
      if (currentScheduleKey === schedule.stableKey && selectedCardKey === cardKey) {
        setSelectedCardKey("");
        return "";
      }
      setSelectedCardKey(cardKey);
      return schedule.stableKey;
    });
  }, [
    selectedCardKey,
  ]);

  return (
    <>
      {policy.canRead && !loading && errorCode === "none" ? <AppNextPrintReport title="일정" columns={["제목", "날짜", "시간", "상태"]} rows={filteredSchedules.map((row) => [row.title, row.dateLabel, row.timeLabel, row.statusLabel])} /> : null}
      <section className="app-next-panel app-next-dashboard-hero">
        <div>
          <p className="app-next-muted-label">App Next</p>
          <h2>일정</h2>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => void loadSchedules(true)}
          disabled={loading || !policy.canRead}
        >
          {loading ? "조회 중" : "새로고침"}
        </button>
      </section>

      <section className="app-next-panel">
        <h2>일정 상태 요약</h2>
        <dl>
          <ValueRow label="workspace 존재" value={booleanLabel(policy.hasWorkspace)} />
          <ValueRow label="조회 상태" value={loading ? "loading" : errorCode} />
          <ValueRow label="전체 일정" value={String(normalized.records.length)} />
          <ValueRow label="표시 일정" value={String(filteredSchedules.length)} />
          <ValueRow label="원격 조회 원본" value="workspaces/{workspace}/schedules" />
          <ValueRow label="마지막 조회" value={loading ? "loading" : errorCode === "none" ? "완료" : "오류"} />
          <ValueRow label="오늘" value={String(normalized.todayRecords.length)} />
          <ValueRow label="예정" value={String(normalized.upcomingRecords.length)} />
          <ValueRow label="완료" value={String(normalized.completedRecords.length)} />
          <ValueRow label="지난 일정" value={String(normalized.pastRecords.length)} />
          <ValueRow label="숨김/삭제 제외" value={String(normalized.hiddenRecords.length)} />
          <ValueRow label="읽기 전용" value={writePolicy.canCreate ? "아니요" : "예"} />
        </dl>
        {errorCode !== "none" && !loading ? (
          <p className="app-next-message">{errorMessage(errorCode)}</p>
        ) : null}
      </section>

      {policy.canRead && writePolicy.canCreate && session?.currentWorkspaceId ? (
        <RequireWorkspaceRole allowedRoles={APP_NEXT_SCHEDULE_WRITE_ROLES} allowSystemOwnerBypass
          requireWorkspace previewMode useExistingAuthProvider defaultNewAuth
          currentRoute={currentRoute} requestedRoute={requestedRoute} menuVisible>
          <AppNextScheduleCrud key={`${session.uid}:${session.currentWorkspaceId}`}
            workspaceId={session.currentWorkspaceId} records={managementRecords} loading={loading}
            onServerConfirmed={() => loadSchedules(true)} />
        </RequireWorkspaceRole>
      ) : null}

      {!policy.hasWorkspace ? (
        <section className="app-next-panel">
          <h2>워크스페이스가 선택되지 않음</h2>
          <p>이 route 접근은 유지하지만 Firestore 일정 조회는 실행하지 않습니다.</p>
        </section>
      ) : null}

      {policy.hasWorkspace ? (
        <section className="app-next-panel app-next-schedule-filter-panel">
          <h2>필터</h2>
          <div className="app-next-schedule-filter-grid">
            <label>
              상태
              <select
                value={filter.bucket}
                onChange={(event) => setFilter((current) => ({
                  ...current,
                  bucket: event.target.value as AppNextScheduleFilter["bucket"],
                }))}
              >
                {SCHEDULE_STATUS_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              유형
              <select
                value={filter.type}
                onChange={(event) => setFilter((current) => ({
                  ...current,
                  type: event.target.value,
                }))}
              >
                <option value="">전체</option>
                {normalized.typeOptions.map((type) => (
                  <option value={type} key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              중요도
              <select
                value={filter.importance}
                onChange={(event) => setFilter((current) => ({
                  ...current,
                  importance: event.target.value,
                }))}
              >
                <option value="">전체</option>
                {normalized.importanceOptions.map((importance) => (
                  <option value={importance} key={importance}>{importance}</option>
                ))}
              </select>
            </label>
            <label>
              시작일
              <input
                type="date"
                value={filter.fromDate}
                onChange={(event) => setFilter((current) => ({
                  ...current,
                  fromDate: event.target.value,
                }))}
              />
            </label>
            <label>
              종료일
              <input
                type="date"
                value={filter.toDate}
                onChange={(event) => setFilter((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))}
              />
            </label>
          </div>
          {dateRangeInvalid ? (
            <p className="app-next-message app-next-warning">시작일이 종료일보다 늦습니다. 날짜 범위를 다시 확인해 주세요.</p>
          ) : null}
        </section>
      ) : null}

      {policy.hasWorkspace && !loading && errorCode === "none" && normalized.visibleRecords.length === 0 ? (
        <section className="app-next-panel">
          <h2>표시할 일정이 없습니다</h2>
          <p>원격 일정 문서가 없거나 표시 가능한 일정이 없습니다.</p>
        </section>
      ) : null}

      {policy.hasWorkspace ? (
        <div className="app-next-dashboard-grid">
          <ScheduleList
            listKey="today"
            title="오늘 일정"
            schedules={normalized.todayRecords}
            selectedKey={selectedKey}
            selectedCardKey={selectedCardKey}
            onSelect={toggleScheduleSelection}
          />
          <ScheduleList
            listKey="upcoming"
            title="다가오는 일정"
            schedules={normalized.upcomingRecords}
            selectedKey={selectedKey}
            selectedCardKey={selectedCardKey}
            onSelect={toggleScheduleSelection}
            limit={6}
          />
          <ScheduleList
            listKey="past"
            title="완료 또는 지난 일정"
            schedules={[...normalized.completedRecords, ...normalized.pastRecords]}
            selectedKey={selectedKey}
            selectedCardKey={selectedCardKey}
            onSelect={toggleScheduleSelection}
            limit={6}
          />
          <ScheduleList
            listKey="filtered"
            title="필터 결과"
            schedules={filteredSchedules}
            selectedKey={selectedKey}
            selectedCardKey={selectedCardKey}
            onSelect={toggleScheduleSelection}
          />
        </div>
      ) : null}

      <section className="app-next-panel">
        <h2>관련 화면</h2>
        <div className="app-next-actions app-next-readonly-actions">
          <button type="button" className="secondary" onClick={() => onNavigate("dashboard")}>
            대시보드
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("timetable-readonly")}>
            시간표 조회
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
