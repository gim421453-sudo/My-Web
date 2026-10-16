import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { createAppNextSchedule, updateAppNextSchedule, deleteAppNextSchedule } from "./appNextScheduleCrudService";
import { appNextScheduleWritePolicy, appNextScheduleWriteErrorMessage, validateAppNextScheduleDraft, EMPTY_SCHEDULE_DRAFT, SCHEDULE_TYPES, SCHEDULE_STATUSES, SCHEDULE_IMPORTANCE, type AppNextScheduleManagementRecord, type AppNextScheduleDraft } from "./appNextScheduleCrudUtils";
import { recordAppNextScheduleWriteAttempt, recordAppNextScheduleWriteResult } from "./appNextDiagnostics";

export function AppNextScheduleCrud({ workspaceId, records, loading, onServerConfirmed }: {
  workspaceId: string;
  records: AppNextScheduleManagementRecord[];
  loading: boolean;
  onServerConfirmed(): Promise<boolean>;
}) {
  const { phase, session } = useAuth();
  const policy = appNextScheduleWritePolicy({ phase, session });
  const [draft, setDraft] = useState({ ...EMPTY_SCHEDULE_DRAFT });
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const disabled = busy || loading || !policy.canCreate || policy.workspaceId !== workspaceId;

  function selectSchedule(id: string) {
    if (inFlight.current) return;
    const record = records.find((item) => item.id === id);
    setEditingId(record?.id ?? "");
    setDraft(record ? { ...record.draft } : { ...EMPTY_SCHEDULE_DRAFT });
    setMessage("");
    setError("");
  }

  async function mutate(action: "create" | "update" | "delete") {
    if (inFlight.current || disabled || !session) return;
    if (action !== "delete") {
      const invalid = validateAppNextScheduleDraft(draft);
      if (invalid) { setError(invalid); setMessage(""); return; }
    } else if (!policy.canDelete || !editingId || !window.confirm(`'${draft.title}' 일정을 삭제할까요?`)) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("일정을 처리하고 있습니다.");
    recordAppNextScheduleWriteAttempt();
    try {
      const input = { phase, session, workspaceId, ...draft, scheduleId: editingId };
      if (action === "create") await createAppNextSchedule(input);
      else if (action === "update") await updateAppNextSchedule(input);
      else await deleteAppNextSchedule(input);
      recordAppNextScheduleWriteResult(action, true);
      if (!await onServerConfirmed()) {
        setMessage("");
        setError("서버 작업은 확인했지만 목록을 새로고침하지 못했습니다. 목록을 다시 조회해 주세요.");
        return;
      }
      setMessage(`일정 ${action === "create" ? "등록을" : action === "update" ? "수정을" : "삭제를"} 서버에서 확인했습니다.`);
      setEditingId("");
      setDraft({ ...EMPTY_SCHEDULE_DRAFT });
    } catch (cause) {
      recordAppNextScheduleWriteResult(action, false);
      setMessage("");
      setError(appNextScheduleWriteErrorMessage(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void mutate(editingId ? "update" : "create");
  }

  function field(key: keyof AppNextScheduleDraft, label: string, type = "text") {
    return <label>{label}<input type={type} value={draft[key]} disabled={disabled}
      maxLength={key === "title" ? 120 : undefined}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>;
  }

  function options(key: keyof AppNextScheduleDraft, label: string, values: string[]) {
    const choices = [...new Set([...values, draft[key]])];
    return <label>{label}<select value={draft[key]} disabled={disabled}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}>
      {choices.map((value) => <option key={value} value={value}>{value}</option>)}
    </select></label>;
  }

  return <section className="app-next-schedule-crud" aria-label="일정 관리">
    <h2>일정 관리</h2>
    <label>수정할 일정<select disabled={disabled} value={editingId} onChange={(event) => selectSchedule(event.target.value)}>
      <option value="">새 일정</option>
      {records.map((record) => <option key={record.id} value={record.id}>{record.draft.title} · {record.draft.date}</option>)}
    </select></label>
    <form className="app-next-notice-form" onSubmit={submit}>
      {field("title", "일정 제목")}
      <div className="app-next-schedule-filter-grid">
        {field("date", "일정 날짜", "date")}
        {field("start_time", "시작 시간", "time")}
        {field("end_time", "종료 시간", "time")}
        {options("type", "일정 유형", SCHEDULE_TYPES)}
        {options("importance", "일정 중요도", SCHEDULE_IMPORTANCE)}
        {options("status", "일정 상태", SCHEDULE_STATUSES)}
      </div>
      <label>일정 메모<textarea value={draft.memo} rows={3} maxLength={5000} disabled={disabled}
        onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} /></label>
      <div className="app-next-actions">
        <button type="submit" disabled={disabled}>{busy ? "처리 중" : editingId ? "일정 수정 저장" : "일정 등록"}</button>
        {editingId && policy.canDelete ? <button type="button" className="secondary" disabled={disabled} onClick={() => void mutate("delete")}>일정 삭제</button> : null}
        {editingId ? <button type="button" className="secondary" disabled={disabled} onClick={() => selectSchedule("")}>취소</button> : null}
      </div>
      {message ? <p role="status" aria-live="polite" className="app-next-message">{message}</p> : null}
      {error ? <p role="alert" className="app-next-message app-next-error">{error}</p> : null}
    </form>
  </section>;
}
