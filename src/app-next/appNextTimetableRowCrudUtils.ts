import type { AppSession, AuthPhase } from "../auth/authTypes";
import { normalizeAppNextTimetableDay, appNextTimetablePeriodNumber, type AppNextRawTimetableStore } from "./appNextTimetableReadonlyUtils";

export const TIMETABLE_ROW_WRITE_ROLES = ["super_manager", "manager", "teacher", "normal"] as const;
export interface TimetableRowDraft { subject: string; teacher: string; room: string; memo: string }
export interface TimetableRowTarget { setId: string; day: string; period: string; rowId?: string }
export const EMPTY_TIMETABLE_ROW_DRAFT: TimetableRowDraft = { subject: "", teacher: "", room: "", memo: "" };
export const TIMETABLE_SET_KEYS = ["setId", "timetableSetId", "scheduleSetId", "timetableId", "timetable_id"] as const;

export function timetableOperationMode(workspace: Record<string, unknown>, settings: Record<string, unknown>): string {
  const nested = workspace.settings as Record<string, unknown> | undefined;
  const value = String(workspace.operationMode || nested?.operationMode || settings.operationMode || "").replace(/-/g, "_");
  return ["personal", "academy", "school"].includes(value) ? value : "unknown";
}

export function timetableRowWritePolicy({ phase, session, operationMode }: { phase: AuthPhase; session: AppSession | null; operationMode: string }) {
  const active = phase === "authenticated" && session?.status === "active"
    && Boolean(session.uid && session.currentWorkspaceId && !session.currentWorkspaceId.includes("/"));
  const owner = active && session?.isSystemOwner === true && session.globalRole === "system_owner";
  const role = session?.currentWorkspaceRole;
  const unrestricted = owner || (active && role === "super_manager");
  const knownMode = ["school", "personal", "academy"].includes(operationMode);
  const scopedRole = active && knownMode && (role === "normal"
    || (["manager", "teacher"].includes(role ?? "") && operationMode !== "school"));
  return { canCreate: unrestricted || scopedRole, canUpdate: unrestricted || scopedRole,
    canDelete: unrestricted || (scopedRole && role === "manager") };
}

export function timetableWorkspaceMatches(data: Record<string, unknown>, workspaceId: string): boolean {
  return Boolean(workspaceId && !workspaceId.includes("/"))
    && (data.workspaceId === undefined || data.workspaceId === workspaceId)
    && (data.workspace_id === undefined || data.workspace_id === workspaceId);
}

export function timetableRowBelongsToSet(row: Record<string, unknown>, setId: string): boolean {
  const bindings = TIMETABLE_SET_KEYS.map((key) => row[key]).filter((value) => value !== undefined && value !== null && value !== "");
  return bindings.length ? bindings.every((value) => String(value) === setId) : setId === "school";
}

export function timetableEntityDeleted(data: Record<string, unknown>): boolean {
  return data.deleted === true || data.deleted === "true" || data._deleted === true || Boolean(data.deletedAt)
    || data.archived === true || ["deleted", "archived", "ended", "closed", "inactive"].includes(String(data.status || data.state || ""));
}

export function timetableSetWritable(set: Record<string, unknown>, now = new Date()): boolean {
  if (timetableEntityDeleted(set) || set.active === false) return false;
  const value = set.endDate || set.activeUntil || set.toDate;
  if (!value) return true;
  const date = typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate(): Date }).toDate() : new Date(String(value));
  return Number.isFinite(date.getTime()) && date.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function timetableProgramBinding(set: Record<string, unknown>): { sourceType: string; programId: string; programName: string } | null | false {
  const aliases: Record<string, string> = { afterschool: "afterschool", "방과후": "afterschool", speciallectures: "specialLectures", speciallecture: "specialLectures", "특강": "specialLectures", clubs: "clubs", club: "clubs", "동아리": "clubs" };
  const values = [set.kind, set.category, set.classType, set.sourceType, set.type, String(set.id || "").split("-")[0]];
  const kind = values.map((value) => String(value || "").replace(/[\s_-]+/g, "").toLowerCase())
    .map((value) => aliases[value] || (["general", "school", "일반", "학교", "기타"].includes(value) ? "regular" : "")).find(Boolean);
  if (!kind || kind === "regular") return set.programId ? false : null;
  return typeof set.programId === "string" && set.programId.trim() && !set.programId.includes("/")
    ? { sourceType: kind, programId: set.programId, programName: String(set.programName || "") } : false;
}

export function activeTimetablePeriods(setId: string, set: Record<string, unknown>, rows: AppNextRawTimetableStore["periodTimes"]) {
  const common = new Map<number, Record<string, unknown>>();
  const specific = new Map<number, Record<string, unknown>>();
  for (const row of rows) {
    const number = appNextTimetablePeriodNumber(row.period || row.value || row.label || row.id);
    const scopes = TIMETABLE_SET_KEYS.map((key) => row[key]).filter((value) => value !== undefined && value !== null && value !== "");
    const scope = scopes[0];
    if (!number || scopes.some((value) => String(value) !== setId)) continue;
    const map = scope ? specific : common;
    if (!map.has(number)) map.set(number, row);
  }
  const count = Number(set.visiblePeriodCount || set.periodCount || 0);
  const numbers = new Set([...common.keys(), ...specific.keys()]);
  if (Number.isInteger(count) && count > 0 && count <= 100) for (let i = 1; i <= count; i += 1) numbers.add(i);
  return [...numbers].sort((a, b) => a - b).flatMap((number) => {
    const row = specific.get(number) || common.get(number);
    if (row && (timetableEntityDeleted(row) || row.active === false)) return [];
    const timeOf = (data: Record<string, unknown> | undefined) => String(data?.time || [data?.start || data?.startTime, data?.end || data?.endTime].filter(Boolean).join("-") || "");
    return [{ period: `${number}교시`, periodNumber: number, time: timeOf(specific.get(number)) || timeOf(common.get(number)) }];
  });
}

export function validateTimetableRowDraft(draft: TimetableRowDraft): string | null {
  if (!draft.subject.trim()) return "수업명을 입력해 주세요.";
  if (draft.subject.trim().length > 120) return "수업명은 120자 이내로 입력해 주세요.";
  if (draft.teacher.length > 120 || draft.room.length > 120 || draft.memo.length > 5000) return "선생님·강의실·메모 길이를 확인해 주세요.";
  return null;
}

export function timetableCellRows(rows: AppNextRawTimetableStore["timetable"], target: TimetableRowTarget) {
  const number = appNextTimetablePeriodNumber(target.period);
  return rows.filter((row) => !timetableRowDeleted(row)
    && (TIMETABLE_SET_KEYS.some((key) => String(row[key] || "") === target.setId) || timetableRowBelongsToSet(row, target.setId))
    && normalizeAppNextTimetableDay(row.day || row.weekday || row.dayName) === target.day
    && appNextTimetablePeriodNumber(row.period || row.periodLabel) === number);
}

export function timetableRowDeleted(row: Record<string, unknown>): boolean {
  return row.deleted === true || row.deleted === "true" || row._deleted === true || Boolean(row.deletedAt) || row.status === "deleted";
}

export function timetableCellDocumentId(target: TimetableRowTarget): string {
  return `cell-${encodeURIComponent(target.setId)}-${normalizeAppNextTimetableDay(target.day)}-${appNextTimetablePeriodNumber(target.period)}`;
}

export function timetableRowPatch(draft: TimetableRowDraft): Record<string, string> {
  return { subject: draft.subject.trim(), name: draft.subject.trim(), teacher: draft.teacher.trim(), room: draft.room.trim(), memo: draft.memo.trim() };
}

export function timetableRowErrorMessage(error: unknown): string {
  const code = String((error as { code?: unknown })?.code ?? "").replace(/^firestore\//, "");
  const messages: Record<string, string> = {
    "invalid-argument": "수업 입력값을 확인해 주세요.", "session-invalid": "로그인 및 계정 상태를 확인해 주세요.",
    "workspace-mismatch": "현재 워크스페이스와 수업 저장 위치가 일치하지 않습니다.", "set-invalid": "선택한 시간표가 없거나 편집할 수 없는 상태입니다.",
    "period-invalid": "선택한 시간표에 활성 교시가 없습니다. 교시 설정을 확인해 주세요.",
    "duplicate-cell": "이미 수업이 있는 칸입니다. 목록을 새로고침하고 기존 수업을 수정해 주세요.",
    "permission-denied": "수업 작업 권한이 없습니다. 학교 모드의 교사·관리자 제한도 확인해 주세요.",
    "unavailable": "네트워크 오류로 작업을 확인하지 못했습니다. 목록을 다시 조회해 주세요.",
    "deadline-exceeded": "네트워크 응답을 확인하지 못했습니다. 목록을 다시 조회해 주세요.",
    "resource-exhausted": "요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
    "not-found": "수업이 없거나 이미 삭제되었습니다. 목록을 새로고침해 주세요.",
    "program-invalid": "시간표의 프로그램 연결을 확인해 주세요. 프로그램을 자동 생성하지 않습니다.",
  };
  return messages[code] || "작업 결과를 서버에서 확인하지 못했습니다. 중복 작업 전에 목록을 새로고침해 주세요.";
}
