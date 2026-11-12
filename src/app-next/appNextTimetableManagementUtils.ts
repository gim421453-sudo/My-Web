import type { AppSession, AuthPhase } from "../auth/authTypes";

export type TimetableLifecycle = "active" | "scheduled" | "ended" | "archived";
export interface TimetableManagementContext { phase: AuthPhase; session: AppSession | null; workspaceId: string; operationMode: string }
export interface PeriodDraft { period: number; start: string; end: string }
export interface TimetableSetDraft { name: string; kind: string; startDate: string; endDate: string; memo: string }
export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function timetableManagementPolicy(input: TimetableManagementContext) {
  const session = input.session;
  const active = input.phase === "authenticated" && session?.status === "active"
    && Boolean(session.uid && input.workspaceId && !input.workspaceId.includes("/") && input.workspaceId === session.currentWorkspaceId);
  const owner = active && session?.isSystemOwner === true && session.globalRole === "system_owner";
  const role = session?.currentWorkspaceRole;
  const knownMode = ["school", "personal", "academy"].includes(input.operationMode);
  const canManage = Boolean(owner || (active && (role === "super_manager"
    || (knownMode && input.operationMode !== "school" && role === "manager"))));
  return { canManage, canRead: Boolean(active), isActive: Boolean(active), workspaceMatches: Boolean(active) };
}

export function parseTimetableDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return date.toISOString().slice(0, 10) === value ? value : "";
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  return "";
}

export function validateTimetableSetDraft(draft: TimetableSetDraft) {
  const name = draft.name.trim();
  if (!name || name.length > 100) return "set-name-invalid";
  if (!["general", "school", "afterschool", "specialLectures", "clubs", "사용자", "사용자 등록", "방과후", "특강", "동아리", "개인", "일반", "학교"].includes(draft.kind)) return "set-kind-invalid";
  const startDate = parseTimetableDate(draft.startDate);
  const endDate = draft.endDate ? parseTimetableDate(draft.endDate) : "";
  if (!startDate || (draft.endDate && !endDate) || (endDate && endDate < startDate)) return "date-range-invalid";
  if (draft.memo.length > 1000) return "set-memo-invalid";
  return null;
}

export function timetableLifecycle(set: Record<string, unknown>, now = new Date()): TimetableLifecycle {
  const status = String(set.status || set.state || "").toLowerCase();
  if (set.archived === true || status === "archived") return "archived";
  const end = parseTimetableDate(set.endDate || set.activeUntil || set.toDate);
  const today = localDateString(now);
  if (["ended", "closed", "inactive"].includes(status) || (end && end < today)) return "ended";
  const start = parseTimetableDate(set.startDate || set.fromDate);
  if (status === "scheduled" || (start && start > today)) return "scheduled";
  return "active";
}

export function validatePeriodDraft(draft: PeriodDraft, all: PeriodDraft[], editingPeriod?: number) {
  if (!Number.isInteger(draft.period) || draft.period < 1 || draft.period > 100) return "period-invalid";
  if (all.some((item) => item.period === draft.period && item.period !== editingPeriod)) return "period-duplicate";
  const clock = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!clock(draft.start) || !clock(draft.end) || draft.start >= draft.end) return "period-time-invalid";
  const overlaps = all.some((item) => item.period !== editingPeriod && item.period !== draft.period
    && item.start && item.end && draft.start < item.end && item.start < draft.end);
  return overlaps ? "period-time-overlap" : null;
}

export function periodTimeDocumentId(setId: string, period: number) {
  const safeSet = setId.replace(/[^A-Za-z0-9_-]/g, "_");
  return `periodTime_${safeSet}_${String(period).padStart(2, "0")}`;
}

export function periodBelongsToSet(row: Record<string, unknown>, setId: string) {
  const scope = row.timetableSetId ?? row.setId ?? row.scheduleSetId;
  return String(scope ?? "") === setId;
}

export function setPatch(draft: TimetableSetDraft) {
  return { name: draft.name.trim(), type: draft.kind, kind: draft.kind, startDate: draft.startDate,
    endDate: draft.endDate || "", memo: draft.memo.trim() };
}

export function timetableManagementErrorMessage(error: unknown) {
  const code = String((error as { code?: unknown })?.code || "").replace(/^firestore\//, "");
  const messages: Record<string, string> = {
    "permission-denied": "시간표 관리 권한이 없습니다.", "session-invalid": "활성 계정으로 다시 로그인해 주세요.",
    "workspace-mismatch": "현재 워크스페이스에서 관리할 수 없습니다.", "not-found": "대상 시간표 또는 교시가 없습니다.",
    "period-delete-blocked": "기존 수업 저장 경로와 교시 삭제의 동시 실행을 서버가 차단하지 못해 교시를 삭제할 수 없습니다. 기존 데이터를 보존했습니다.", "period-in-use": "수업이 배정된 교시는 삭제할 수 없습니다.", "period-not-last": "다른 교시 번호를 유지하려면 마지막 교시부터 삭제해 주세요.",
    "period-time-overlap": "다른 교시와 시간이 겹칩니다.", "period-duplicate": "이미 존재하는 교시 번호입니다.",
    "set-name-duplicate": "같은 이름의 시간표가 이미 있습니다.", "date-range-invalid": "시작일과 종료일을 확인해 주세요.",
    "app-next-write-unconfirmed": "변경 결과를 서버에서 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.",
    "unavailable": "네트워크 연결을 확인해 주세요.", "resource-exhausted": "요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
  };
  return messages[code] || "시간표 변경을 완료하지 못했습니다. 권한과 입력값을 확인해 주세요.";
}
