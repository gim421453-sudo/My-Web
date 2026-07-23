import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextTimetableKind =
  | "regular"
  | "afterschool"
  | "unknown";

export interface AppNextRawTimetableStore {
  timetable: Array<Record<string, unknown>>;
  timetableSets: Array<Record<string, unknown>>;
  periodTimes: Array<Record<string, unknown>>;
}

export interface AppNextTimetableCell {
  stableKey: string;
  sourceIndex: number;
  setId: string;
  setName: string;
  setKind: AppNextTimetableKind;
  day: string;
  dayIndex: number;
  period: string;
  periodNumber: number | null;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  invalid: boolean;
}

export interface AppNextTimetablePeriodRow {
  period: string;
  periodNumber: number;
  time: string;
}

export interface AppNextTimetableDuplicateGroup {
  key: string;
  day: string;
  period: string;
  setName: string;
  count: number;
}

export interface AppNextTimetableNormalized {
  activeSetId: string;
  activeSetName: string;
  activeSetMissing: boolean;
  sets: Array<{
    id: string;
    name: string;
    kind: AppNextTimetableKind;
  }>;
  periods: AppNextTimetablePeriodRow[];
  days: string[];
  regularCells: AppNextTimetableCell[];
  afterschoolCells: AppNextTimetableCell[];
  visibleCells: AppNextTimetableCell[];
  invalidCells: AppNextTimetableCell[];
  orphanRowsExcluded: number;
  missingSetRowsIncluded: number;
  duplicateGroups: AppNextTimetableDuplicateGroup[];
  duplicateCellItemCount: number;
  emptyCellCount: number;
  todayWeekday: string;
  todayCells: AppNextTimetableCell[];
  firstTodayCell: AppNextTimetableCell | null;
  lastTodayCell: AppNextTimetableCell | null;
  afterschoolSupported: boolean;
}

export interface AppNextTimetablePolicy {
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

const DAY_ALIASES = new Map<string, string>([
  ["월요일", "월"],
  ["화요일", "화"],
  ["수요일", "수"],
  ["목요일", "목"],
  ["금요일", "금"],
  ["토요일", "토"],
  ["일요일", "일"],
  ["mon", "월"],
  ["monday", "월"],
  ["tue", "화"],
  ["tuesday", "화"],
  ["wed", "수"],
  ["wednesday", "수"],
  ["thu", "목"],
  ["thursday", "목"],
  ["fri", "금"],
  ["friday", "금"],
  ["sat", "토"],
  ["saturday", "토"],
  ["sun", "일"],
  ["sunday", "일"],
]);
const WEEKDAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"] as const;
const TODAY_BY_DATE_DAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function firstText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

export function appNextTimetableRoleCategory(value: string | null | undefined): string {
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

export function appNextTimetableReadPolicy({
  phase,
  session,
}: {
  phase: AuthPhase;
  session: AppSession | null | undefined;
}): AppNextTimetablePolicy {
  const base = {
    hasWorkspace: Boolean(session?.currentWorkspaceId),
    globalRoleCategory: appNextTimetableRoleCategory(session?.globalRole),
    workspaceRoleCategory: appNextTimetableRoleCategory(session?.currentWorkspaceRole),
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

export function normalizeAppNextTimetableDay(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  if (WEEKDAY_ORDER.includes(raw as typeof WEEKDAY_ORDER[number])) return raw;
  return DAY_ALIASES.get(raw.toLowerCase()) || raw;
}

export function appNextTimetableDayIndex(day: string): number {
  const index = WEEKDAY_ORDER.indexOf(day as typeof WEEKDAY_ORDER[number]);
  return index >= 0 ? index : 99;
}

export function appNextTimetablePeriodNumber(value: unknown): number | null {
  const match = text(value).match(/\d+/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeAppNextTimetablePeriod(value: unknown, fallbackIndex = 0): string {
  const number = appNextTimetablePeriodNumber(value);
  if (number) return `${number}교시`;
  const fallback = fallbackIndex + 1;
  return fallback > 0 ? `${fallback}교시` : "";
}

function normalizeClock(value: string): string {
  const match = text(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTimeRange(value: unknown): string {
  const raw = text(value).replace(/[~–—]/g, "-");
  const match = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return "";
  const start = normalizeClock(match[1]);
  const end = normalizeClock(match[2]);
  if (!start || !end) return "";
  if (start >= end) return "";
  return `${start}-${end}`;
}

function timeFromRow(row: Record<string, unknown>): string {
  const start = normalizeClock(firstText(row, ["start", "startTime", "begin", "from"]));
  const end = normalizeClock(firstText(row, ["end", "endTime", "finish", "to"]));
  if (start && end && start < end) return `${start}-${end}`;
  return normalizeTimeRange(row.time) || normalizeTimeRange(row.range) || "";
}

function rowSetId(row: Record<string, unknown>): string {
  return firstText(row, ["setId", "timetableSetId", "scheduleSetId", "timetableId", "timetable_id"]);
}

function isDeleted(row: Record<string, unknown>): boolean {
  return row.deleted === true ||
    row.deleted === "true" ||
    row.status === "deleted" ||
    row._deleted === true ||
    Boolean(row.deletedAt);
}

function setKind(row: Record<string, unknown>): AppNextTimetableKind {
  const source = [
    row.type,
    row.kind,
    row.category,
    row.sourceType,
    row.scheduleType,
    row.name,
    row.title,
  ].map(text).join(" ").toLowerCase();
  if (/after|afterschool|방과후|특강|special|club|동아리/.test(source)) return "afterschool";
  if (source) return "regular";
  return "unknown";
}

function displaySetName(row: Record<string, unknown>, index: number): string {
  return firstText(row, ["name", "title", "label", "type"]) || `시간표 ${index + 1}`;
}

function normalizedSets(rawSets: Array<Record<string, unknown>>): AppNextTimetableNormalized["sets"] {
  return rawSets
    .filter((row) => row && typeof row === "object" && !isDeleted(row))
    .map((row, index) => ({
      id: firstText(row, ["id", "setId", "timetableSetId"]) || `set-${index + 1}`,
      name: displaySetName(row, index),
      kind: setKind(row),
    }))
    .filter((row) => row.id);
}

function defaultActiveSetId(sets: AppNextTimetableNormalized["sets"]): string {
  return sets.find((set) => set.kind !== "afterschool")?.id || sets[0]?.id || "";
}

function effectiveRowSetId(
  row: Record<string, unknown>,
  activeSetId: string,
): {
  setId: string;
  missingSetIncluded: boolean;
} {
  const explicitSetId = rowSetId(row);
  if (explicitSetId) {
    return {
      setId: explicitSetId,
      missingSetIncluded: false,
    };
  }
  if (String(activeSetId) === "school") {
    return {
      setId: "school",
      missingSetIncluded: true,
    };
  }
  return {
    setId: "",
    missingSetIncluded: false,
  };
}

function periodScopeSetId(row: Record<string, unknown>): string {
  return firstText(row, ["timetableSetId", "setId", "scheduleSetId", "timetableId", "timetable_id"]);
}

function periodRowsForSet(
  setId: string,
  rawPeriodTimes: Array<Record<string, unknown>>,
  visiblePeriodCount = 0,
): AppNextTimetablePeriodRow[] {
  const setSpecific = new Map<number, string>();
  const common = new Map<number, string>();
  rawPeriodTimes.forEach((row, index) => {
    if (!row || typeof row !== "object" || isDeleted(row)) return;
    const number = appNextTimetablePeriodNumber(row.period || row.value || row.label) || index + 1;
    const time = timeFromRow(row);
    const scope = periodScopeSetId(row);
    if (scope && scope !== setId) return;
    const target = scope ? setSpecific : common;
    if (!target.has(number)) target.set(number, time);
  });

  const numbers = new Set<number>([
    ...setSpecific.keys(),
    ...common.keys(),
  ]);
  for (let index = 1; index <= visiblePeriodCount; index += 1) numbers.add(index);
  if (!numbers.size) {
    for (let index = 1; index <= 8; index += 1) numbers.add(index);
  }
  return [...numbers].sort((a, b) => a - b).map((number) => ({
    period: `${number}교시`,
    periodNumber: number,
    time: setSpecific.get(number) || common.get(number) || "",
  }));
}

function sortCells(cells: AppNextTimetableCell[]): AppNextTimetableCell[] {
  return [...cells].sort((a, b) => (
    a.dayIndex - b.dayIndex ||
    (a.periodNumber || 999) - (b.periodNumber || 999) ||
    a.sourceIndex - b.sourceIndex
  ));
}

export function normalizeAppNextTimetableStore(
  input: AppNextRawTimetableStore,
  options: {
    requestedSetId?: string | null;
    now?: Date;
  } = {},
): AppNextTimetableNormalized {
  const sets = normalizedSets(input.timetableSets || []);
  const validSetIds = new Set(sets.map((set) => set.id));
  const requested = text(options.requestedSetId);
  const activeSetId = requested && validSetIds.has(requested)
    ? requested
    : requested
      ? ""
      : defaultActiveSetId(sets);
  const activeSet = sets.find((set) => set.id === activeSetId) || null;
  const visiblePeriodCount = Number((input.timetableSets || []).find((set) => firstText(set, ["id", "setId", "timetableSetId"]) === activeSetId)?.visiblePeriodCount || 0);
  const periods = activeSetId
    ? periodRowsForSet(activeSetId, input.periodTimes || [], visiblePeriodCount)
    : [];
  const periodByNumber = new Map(periods.map((row) => [row.periodNumber, row]));
  const validDays = new Set(WEEKDAY_ORDER);
  const cells: AppNextTimetableCell[] = [];
  const invalidCells: AppNextTimetableCell[] = [];
  let orphanRowsExcluded = 0;
  let missingSetRowsIncluded = 0;

  (input.timetable || []).forEach((row, index) => {
    if (!row || typeof row !== "object" || isDeleted(row)) return;
    const effective = effectiveRowSetId(row, activeSetId);
    const setId = effective.setId;
    if (!setId || !validSetIds.has(setId)) {
      orphanRowsExcluded += 1;
      return;
    }
    if (effective.missingSetIncluded) missingSetRowsIncluded += 1;
    const set = sets.find((item) => item.id === setId);
    const day = normalizeAppNextTimetableDay(row.day || row.weekday || row.dayName);
    const period = normalizeAppNextTimetablePeriod(row.period || row.periodLabel, index);
    const periodNumber = appNextTimetablePeriodNumber(period);
    const periodTime = periodNumber ? periodByNumber.get(periodNumber)?.time || "" : "";
    const time = timeFromRow(row) || periodTime;
    const invalid = !validDays.has(day as typeof WEEKDAY_ORDER[number]) || !periodNumber;
    const normalized: AppNextTimetableCell = {
      stableKey: `row-${index}`,
      sourceIndex: index,
      setId,
      setName: set?.name || "시간표",
      setKind: set?.kind || setKind(row),
      day,
      dayIndex: appNextTimetableDayIndex(day),
      period,
      periodNumber,
      time,
      subject: firstText(row, ["subject", "title", "name", "className"]) || "과목 미정",
      teacher: firstText(row, ["teacher", "teacherName", "instructor", "manager"]),
      room: firstText(row, ["room", "location", "place", "classroom"]),
      invalid,
    };
    cells.push(normalized);
    if (invalid) invalidCells.push(normalized);
  });

  const activeCells = activeSetId
    ? cells.filter((cell) => cell.setId === activeSetId)
    : [];
  const regularCells = sortCells(activeCells.filter((cell) => cell.setKind !== "afterschool"));
  const afterschoolCells = sortCells(cells.filter((cell) => cell.setKind === "afterschool"));
  const visibleCells = sortCells([...regularCells, ...afterschoolCells]);
  const cellKeyCounts = new Map<string, AppNextTimetableCell[]>();
  visibleCells.forEach((cell) => {
    const key = `${cell.setId}|${cell.day}|${cell.period}`;
    cellKeyCounts.set(key, [...(cellKeyCounts.get(key) || []), cell]);
  });
  const duplicateGroups = [...cellKeyCounts.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      day: group[0].day,
      period: group[0].period,
      setName: group[0].setName,
      count: group.length,
    }));
  const todayWeekday = TODAY_BY_DATE_DAY[(options.now || new Date()).getDay()];
  const todayCells = visibleCells.filter((cell) => cell.day === todayWeekday);
  const daysWithData = new Set(visibleCells.map((cell) => cell.day).filter(Boolean));
  const baseDays: Array<typeof WEEKDAY_ORDER[number]> = ["월", "화", "수", "목", "금"];
  const weekendDays = WEEKDAY_ORDER.filter((day) => (
    (day === "토" || day === "일") && daysWithData.has(day)
  ));
  const days: Array<typeof WEEKDAY_ORDER[number]> = [...baseDays, ...weekendDays];
  const emptyCellCount = Math.max(0, periods.length * days.length - visibleCells.filter((cell) => cell.setId === activeSetId).length);

  return {
    activeSetId,
    activeSetName: activeSet?.name || "",
    activeSetMissing: Boolean(requested && !activeSetId),
    sets,
    periods,
    days,
    regularCells,
    afterschoolCells,
    visibleCells,
    invalidCells,
    orphanRowsExcluded,
    missingSetRowsIncluded,
    duplicateGroups,
    duplicateCellItemCount: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
    emptyCellCount,
    todayWeekday,
    todayCells,
    firstTodayCell: todayCells[0] || null,
    lastTodayCell: todayCells[todayCells.length - 1] || null,
    afterschoolSupported: afterschoolCells.length > 0,
  };
}

export function detectSensitiveTimetableText(values: readonly unknown[]): boolean {
  return values.some((value) => /@|AIza|token|uid|workspaceId|documentId|api[_-]?key|workspaces\//i.test(String(value ?? "")));
}
