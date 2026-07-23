import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextScheduleBucket =
  | "today"
  | "upcoming"
  | "completed"
  | "past"
  | "invalid";

export interface AppNextRawScheduleStore {
  schedules: Array<Record<string, unknown>>;
}

export interface AppNextScheduleRecord {
  stableKey: string;
  sourceIndex: number;
  title: string;
  memo: string;
  location: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  importance: string;
  importanceLabel: string;
  dateKey: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  isAllDay: boolean;
  isTimed: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isHidden: boolean;
  isInvalid: boolean;
  bucket: AppNextScheduleBucket;
  sortTime: number;
}

export interface AppNextScheduleFilter {
  bucket: "all" | AppNextScheduleBucket;
  type: string;
  importance: string;
  fromDate: string;
  toDate: string;
}

export interface AppNextSchedulesNormalized {
  records: AppNextScheduleRecord[];
  visibleRecords: AppNextScheduleRecord[];
  todayRecords: AppNextScheduleRecord[];
  upcomingRecords: AppNextScheduleRecord[];
  completedRecords: AppNextScheduleRecord[];
  pastRecords: AppNextScheduleRecord[];
  hiddenRecords: AppNextScheduleRecord[];
  invalidRecords: AppNextScheduleRecord[];
  allDayRecords: AppNextScheduleRecord[];
  timedRecords: AppNextScheduleRecord[];
  typeOptions: string[];
  importanceOptions: string[];
  todayKey: string;
}

const CANONICAL_SCHEDULE_TYPES = [
  "학교",
  "학원",
  "수업",
  "시험",
  "수행평가",
  "과제",
  "개인",
  "등하교",
  "기타",
] as const;

const CANONICAL_SCHEDULE_IMPORTANCE = [
  "높음",
  "보통",
  "낮음",
] as const;

export interface AppNextSchedulePolicy {
  routeAllowed: boolean;
  canRead: boolean;
  reason:
    | "loading"
    | "signed-out"
    | "pending"
    | "rejected"
    | "disabled"
    | "error"
    | "workspace-missing"
    | "active";
  hasWorkspace: boolean;
  globalRoleCategory: string;
  workspaceRoleCategory: string;
  isSystemOwner: boolean;
}

export const APP_NEXT_EMPTY_SCHEDULE_FILTER: AppNextScheduleFilter = {
  bucket: "all",
  type: "",
  importance: "",
  fromDate: "",
  toDate: "",
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function stableKeyPart(value: unknown): string {
  return encodeURIComponent(text(value).slice(0, 120));
}

function hashStableText(value: unknown): string {
  const raw = text(value);
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function firstText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

function roleCategory(value: string | null | undefined): string {
  if (!value) return "none";
  if ([
    "system_owner",
    "user",
    "super_manager",
    "manager",
    "teacher",
    "normal",
    "viewer",
    "print_account",
  ].includes(value)) {
    return value;
  }
  return "unknown";
}

export function appNextScheduleReadPolicy({
  phase,
  session,
}: {
  phase: AuthPhase;
  session: AppSession | null | undefined;
}): AppNextSchedulePolicy {
  const base = {
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    globalRoleCategory: roleCategory(session?.globalRole),
    workspaceRoleCategory: roleCategory(session?.currentWorkspaceRole),
    isSystemOwner: Boolean(session?.isSystemOwner),
  };

  if (phase === "initializing" || phase === "loading_session") {
    return { ...base, routeAllowed: false, canRead: false, reason: "loading" };
  }
  if (phase === "signed_out" || !session) {
    return { ...base, routeAllowed: false, canRead: false, reason: "signed-out" };
  }
  if (phase === "error") {
    return { ...base, routeAllowed: false, canRead: false, reason: "error" };
  }
  if (session.status !== "active") {
    return { ...base, routeAllowed: false, canRead: false, reason: session.status };
  }
  if (!session.currentWorkspaceId) {
    return { ...base, routeAllowed: true, canRead: false, reason: "workspace-missing" };
  }
  return { ...base, routeAllowed: true, canRead: true, reason: "active" };
}

function localDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayMs(dateKey: string): number {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return Number.NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function coerceDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const raw = value.trim();
    const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const maybeTimestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };
    if (typeof maybeTimestamp.toDate === "function") return coerceDate(maybeTimestamp.toDate());
    if (typeof maybeTimestamp.seconds === "number") return coerceDate(maybeTimestamp.seconds);
  }
  return null;
}

function normalizeClock(value: unknown): string {
  const match = text(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function combineDateAndTime(dateKey: string, timeValue: string): number {
  if (!dateKey || !timeValue) return Number.NaN;
  const dateMs = startOfDayMs(dateKey);
  const match = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (Number.isNaN(dateMs) || !match) return Number.NaN;
  return dateMs + Number(match[1]) * 60 * 60 * 1000 + Number(match[2]) * 60 * 1000;
}

function isDeletedOrHidden(row: Record<string, unknown>): boolean {
  const status = text(row.status).toLowerCase();
  return row.deleted === true ||
    row.deleted === "true" ||
    row._deleted === true ||
    row.hidden === true ||
    row.hidden === "true" ||
    row.archived === true ||
    row.archived === "true" ||
    row.visible === false ||
    row.deletedAt !== undefined ||
    ["deleted", "hidden", "archived"].includes(status);
}

function normalizeStatus(value: string): string {
  const raw = value.toLowerCase().replace(/\s+/g, "");
  if (!raw) return "scheduled";
  if (["완료", "completed", "done"].includes(raw)) return "completed";
  if (["진행중", "inprogress", "progress"].includes(raw)) return "in_progress";
  if (["취소", "cancelled", "canceled"].includes(raw)) return "cancelled";
  if (["보류", "hold", "pending"].includes(raw)) return "hold";
  return "scheduled";
}

function statusLabel(status: string): string {
  if (status === "completed") return "완료";
  if (status === "in_progress") return "진행 중";
  if (status === "cancelled") return "취소";
  if (status === "hold") return "보류";
  return "예정";
}

function normalizeType(value: string): string {
  return value || "기타";
}

function normalizeImportance(value: string): string {
  return value || "보통";
}

function sortSchedules(records: AppNextScheduleRecord[], direction: "asc" | "desc" = "asc"): AppNextScheduleRecord[] {
  return [...records].sort((a, b) => {
    const left = Number.isFinite(a.sortTime) ? a.sortTime : Number.MAX_SAFE_INTEGER;
    const right = Number.isFinite(b.sortTime) ? b.sortTime : Number.MAX_SAFE_INTEGER;
    return direction === "asc"
      ? left - right || a.sourceIndex - b.sourceIndex
      : right - left || a.sourceIndex - b.sourceIndex;
  });
}

export function normalizeAppNextSchedulesStore(
  input: AppNextRawScheduleStore,
  options: {
    now?: Date;
  } = {},
): AppNextSchedulesNormalized {
  const todayKey = localDateKey(options.now || new Date());
  const todayMs = startOfDayMs(todayKey);
  const tomorrowMs = todayMs + 24 * 60 * 60 * 1000;
  const records: AppNextScheduleRecord[] = (input.schedules || []).map((row, index) => {
    const rawId = firstText(row, ["id", "scheduleId", "uid", "code"]);
    const dateValue = row.date ?? row.scheduleDate ?? row.startDate ?? row.start_date ?? row.day;
    const startAtValue = row.startAt ?? row.startsAt ?? row.startDateTime ?? row.start_datetime;
    const endAtValue = row.endAt ?? row.endsAt ?? row.endDateTime ?? row.end_datetime;
    const startAtDate = coerceDate(startAtValue);
    const date = startAtDate || coerceDate(dateValue);
    const dateKey = date ? localDateKey(date) : "";
    const startTime = normalizeClock(firstText(row, ["start_time", "startTime", "timeStart", "start"]));
    const endTime = normalizeClock(firstText(row, ["end_time", "endTime", "timeEnd", "end"]));
    const explicitStartMs = startAtDate?.getTime() ?? Number.NaN;
    const combinedStartMs = combineDateAndTime(dateKey, startTime);
    const endAtDate = coerceDate(endAtValue);
    const combinedEndMs = combineDateAndTime(dateKey, endTime);
    const sortTime = Number.isFinite(explicitStartMs)
      ? explicitStartMs
      : Number.isFinite(combinedStartMs)
        ? combinedStartMs
        : startOfDayMs(dateKey);
    const endSortTime = endAtDate?.getTime()
      ?? (Number.isFinite(combinedEndMs) ? combinedEndMs : sortTime);
    const status = normalizeStatus(firstText(row, ["status", "state", "progress"]));
    const isCompleted = status === "completed";
    const isHidden = isDeletedOrHidden(row);
    const isInvalid = !dateKey || Number.isNaN(startOfDayMs(dateKey));
    const isToday = !isInvalid && dateKey === todayKey;
    const isPast = !isInvalid && (endSortTime < todayMs || (!isToday && startOfDayMs(dateKey) < todayMs));
    const isUpcoming = !isInvalid && !isToday && startOfDayMs(dateKey) >= tomorrowMs;
    const bucket: AppNextScheduleBucket = isInvalid
      ? "invalid"
      : isCompleted
        ? "completed"
        : isToday
          ? "today"
          : isUpcoming
            ? "upcoming"
            : "past";
    const type = normalizeType(firstText(row, ["type", "category", "scheduleType", "kind"]));
    const importance = normalizeImportance(firstText(row, ["importance", "priority"]));
    const title = firstText(row, ["title", "name", "subject"]) || "제목 없음";
    const memo = firstText(row, ["memo", "content", "description", "note"]);
    const location = firstText(row, ["location", "place", "room", "classroom"]);
    const stableKey = rawId
      ? `schedule-id-${hashStableText(rawId)}`
      : [
        "schedule-row",
        stableKeyPart(title),
        stableKeyPart(dateKey),
        stableKeyPart(startTime),
        stableKeyPart(endTime),
        stableKeyPart(type),
        stableKeyPart(importance),
        stableKeyPart(memo),
        stableKeyPart(location),
        String(index),
      ].join("|");

    return {
      stableKey,
      sourceIndex: index,
      title,
      memo,
      location,
      type,
      typeLabel: type,
      status,
      statusLabel: statusLabel(status),
      importance,
      importanceLabel: importance,
      dateKey,
      dateLabel: dateKey || "날짜 없음",
      startTime,
      endTime,
      timeLabel: startTime && endTime
        ? `${startTime}~${endTime}`
        : startTime || endTime || "종일",
      isAllDay: !startTime && !endTime,
      isTimed: Boolean(startTime || endTime),
      isToday,
      isUpcoming,
      isPast,
      isCompleted,
      isHidden,
      isInvalid,
      bucket,
      sortTime,
    };
  });

  const hiddenRecords = records.filter((record) => record.isHidden);
  const visibleRecords = records.filter((record) => !record.isHidden);
  const todayRecords = sortSchedules(visibleRecords.filter((record) => record.bucket === "today"));
  const upcomingRecords = sortSchedules(visibleRecords.filter((record) => record.bucket === "upcoming"));
  const completedRecords = sortSchedules(visibleRecords.filter((record) => record.bucket === "completed"), "desc");
  const pastRecords = sortSchedules(visibleRecords.filter((record) => record.bucket === "past"), "desc");
  const invalidRecords = visibleRecords.filter((record) => record.isInvalid);
  const allDayRecords = visibleRecords.filter((record) => record.isAllDay);
  const timedRecords = visibleRecords.filter((record) => record.isTimed);
  const typeOptions = [...new Set([
    ...CANONICAL_SCHEDULE_TYPES,
    ...visibleRecords.map((record) => record.type).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b, "ko"));
  const importanceOptions = [...new Set([
    ...CANONICAL_SCHEDULE_IMPORTANCE,
    ...visibleRecords.map((record) => record.importance).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b, "ko"));

  return {
    records,
    visibleRecords: sortSchedules(visibleRecords),
    todayRecords,
    upcomingRecords,
    completedRecords,
    pastRecords,
    hiddenRecords,
    invalidRecords,
    allDayRecords,
    timedRecords,
    typeOptions,
    importanceOptions,
    todayKey,
  };
}

export function applyAppNextScheduleFilters(
  normalized: AppNextSchedulesNormalized,
  filter: AppNextScheduleFilter,
): AppNextScheduleRecord[] {
  return sortSchedules(normalized.visibleRecords.filter((record) => {
    if (filter.bucket !== "all" && record.bucket !== filter.bucket) return false;
    if (filter.type && record.type !== filter.type) return false;
    if (filter.importance && record.importance !== filter.importance) return false;
    if (filter.fromDate && (!record.dateKey || record.dateKey < filter.fromDate)) return false;
    if (filter.toDate && (!record.dateKey || record.dateKey > filter.toDate)) return false;
    return true;
  }));
}

export function appNextScheduleFilterSignature(filter: AppNextScheduleFilter): string {
  return [
    filter.bucket,
    filter.type || "all-types",
    filter.importance || "all-importance",
    filter.fromDate || "no-from",
    filter.toDate || "no-to",
  ].join("|");
}

export function detectSensitiveScheduleText(values: readonly unknown[]): boolean {
  return values.some((value) => /@|AIza|token|uid|workspaceId|documentId|api[_-]?key|workspaces\//i.test(String(value ?? "")));
}
