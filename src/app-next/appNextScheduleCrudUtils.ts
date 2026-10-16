import type { AppSession, AuthPhase } from "../auth/authTypes";

export const APP_NEXT_SCHEDULE_WRITE_ROLES = ["super_manager", "manager", "teacher", "normal"] as const;
export const SCHEDULE_TYPES = ["학교", "학원", "수업", "시험", "수행평가", "과제", "개인", "등하교", "기타"];
export const SCHEDULE_STATUSES = ["예정", "진행 중", "완료", "취소"];
export const SCHEDULE_IMPORTANCE = ["낮음", "보통", "높음", "매우 높음"];

export interface AppNextScheduleDraft {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  importance: string;
  status: string;
  memo: string;
}

export interface AppNextScheduleManagementRecord {
  id: string;
  draft: AppNextScheduleDraft;
}

export const EMPTY_SCHEDULE_DRAFT: AppNextScheduleDraft = {
  title: "", date: "", start_time: "", end_time: "", type: "기타",
  importance: "보통", status: "예정", memo: "",
};

export function appNextScheduleWritePolicy({ phase, session }: {
  phase: AuthPhase; session: AppSession | null;
}) {
  const workspaceId = session?.currentWorkspaceId ?? "";
  const active = phase === "authenticated" && session?.status === "active"
    && Boolean(session.uid && workspaceId && !workspaceId.includes("/"));
  const owner = active && session?.isSystemOwner === true && session.globalRole === "system_owner";
  const role = session?.currentWorkspaceRole;
  const canWrite = active && (owner || APP_NEXT_SCHEDULE_WRITE_ROLES.some((item) => item === role));
  return {
    canCreate: canWrite, canUpdate: canWrite,
    canDelete: active && (owner || role === "super_manager" || role === "manager"),
    workspaceId: active ? workspaceId : "",
  };
}

export function scheduleMatchesWorkspace(data: Record<string, unknown>, workspaceId: string): boolean {
  return Boolean(workspaceId && !workspaceId.includes("/"))
    && (data.workspaceId === undefined || data.workspaceId === workspaceId)
    && (data.workspace_id === undefined || data.workspace_id === workspaceId);
}

export function validateAppNextScheduleDraft(draft: AppNextScheduleDraft): string | null {
  if (!draft.title.trim()) return "일정 제목을 입력해 주세요.";
  if (draft.title.trim().length > 120) return "일정 제목은 120자 이내로 입력해 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)
    || Number.isNaN(Date.parse(`${draft.date}T00:00:00Z`))
    || new Date(`${draft.date}T00:00:00Z`).toISOString().slice(0, 10) !== draft.date) {
    return "올바른 일정 날짜를 입력해 주세요.";
  }
  if ([draft.start_time, draft.end_time].some((value) => value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
    return "올바른 시작·종료 시간을 입력해 주세요.";
  }
  if (Boolean(draft.start_time) !== Boolean(draft.end_time)) return "시작 시간과 종료 시간을 함께 입력해 주세요.";
  if (draft.start_time && draft.start_time >= draft.end_time) return "종료 시간은 시작 시간보다 늦어야 합니다.";
  if (!draft.type.trim() || draft.type.length > 80 || !draft.importance.trim()
    || draft.importance.length > 40 || !draft.status.trim() || draft.status.length > 40) {
    return "일정 유형·중요도·상태를 확인해 주세요.";
  }
  if (draft.memo.length > 5000) return "메모는 5,000자 이내로 입력해 주세요.";
  return null;
}

export function cleanAppNextScheduleDraft(draft: AppNextScheduleDraft): AppNextScheduleDraft {
  return Object.fromEntries(Object.keys(EMPTY_SCHEDULE_DRAFT).map((key) => [
    key, draft[key as keyof AppNextScheduleDraft].trim(),
  ])) as unknown as AppNextScheduleDraft;
}

// Alternate date/time schemas remain readable, but are not silently migrated by editing.
export function scheduleManagementRecord(id: string, data: Record<string, unknown>, workspaceId: string): AppNextScheduleManagementRecord | null {
  if (!id || id.includes("/") || !scheduleMatchesWorkspace(data, workspaceId)) return null;
  if (["startAt", "startsAt", "startDateTime", "start_datetime", "endAt", "endsAt", "endDateTime", "end_datetime", "startTime", "endTime", "timeStart", "timeEnd", "start", "end"].some((key) => data[key] !== undefined)) return null;
  if (typeof data.title !== "string" || typeof data.date !== "string") return null;
  if (["deleted", "hidden", "archived"].some((key) => data[key] === true || data[key] === "true") || data._deleted === true || data.visible === false || data.deletedAt !== undefined
    || ["deleted", "hidden", "archived"].includes(String(data.status))) return null;
  const draft = { ...EMPTY_SCHEDULE_DRAFT };
  for (const key of Object.keys(draft) as Array<keyof AppNextScheduleDraft>) {
    if (typeof data[key] === "string") draft[key] = data[key] as string;
  }
  return { id, draft };
}

export function scheduleWriteConfirmed(data: Record<string, unknown> | undefined, workspaceId: string, draft: AppNextScheduleDraft): boolean {
  const clean = cleanAppNextScheduleDraft(draft);
  return Boolean(data && scheduleMatchesWorkspace(data, workspaceId)
    && Object.entries(clean).every(([key, value]) => data[key] === value));
}

export function appNextScheduleWriteErrorMessage(error: unknown): string {
  const code = String((error as { code?: unknown })?.code ?? "").replace(/^firestore\//, "");
  if (code === "permission-denied") return "일정 작업 권한이 없습니다. 계정 권한을 다시 확인해 주세요.";
  if (code === "unauthenticated" || code === "session-invalid") return "로그인 세션을 확인해 주세요.";
  if (code === "workspace-mismatch") return "현재 워크스페이스와 일정의 저장 위치가 일치하지 않습니다.";
  if (code === "unavailable" || code === "deadline-exceeded" || code === "network-request-failed") return "네트워크 오류로 결과를 확인하지 못했습니다. 목록을 다시 조회해 주세요.";
  if (code === "resource-exhausted") return "요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  if (code === "invalid-argument") return "일정 입력값을 확인해 주세요.";
  if (code === "not-found") return "일정이 없거나 이미 삭제되었습니다. 목록을 새로고침해 주세요.";
  if (code === "schema-unsupported") return "이 일정 형식은 운영 화면에서 수정해 주세요.";
  return "작업 결과를 서버에서 확인하지 못했습니다. 중복 작업 전에 목록을 새로고침해 주세요.";
}
