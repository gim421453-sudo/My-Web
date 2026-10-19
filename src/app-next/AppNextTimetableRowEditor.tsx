import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { createAppNextTimetableRow, updateAppNextTimetableRow, deleteAppNextTimetableRow } from "./appNextTimetableRowCrudService";
import { timetableRowErrorMessage, timetableRowWritePolicy, validateTimetableRowDraft, EMPTY_TIMETABLE_ROW_DRAFT, type TimetableRowTarget } from "./appNextTimetableRowCrudUtils";
import { recordAppNextTimetableWrite } from "./appNextDiagnostics";

export interface TimetableEditorSelection { target: TimetableRowTarget; row: Record<string, unknown> | null }

export function AppNextTimetableRowEditor({ workspaceId, operationMode, selection, onClose, onBusy, onConfirmed }: {
  workspaceId: string; operationMode: string; selection: TimetableEditorSelection;
  onClose(): void; onBusy(value: boolean): void; onConfirmed(): Promise<boolean>;
}) {
  const { phase, session } = useAuth();
  const policy = timetableRowWritePolicy({ phase, session, operationMode });
  const [draft, setDraft] = useState({
    subject: String(selection.row?.subject || selection.row?.title || selection.row?.name || ""),
    teacher: String(selection.row?.teacher || selection.row?.teacherName || ""),
    room: String(selection.row?.room || selection.row?.location || ""), memo: String(selection.row?.memo || ""),
  });
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const editing = Boolean(selection.target.rowId);
  const allowed = !completed && (editing ? policy.canUpdate : policy.canCreate);

  async function mutate(remove = false) {
    if (pending.current || !allowed || (remove && !policy.canDelete)) return;
    if (remove && !window.confirm(`'${draft.subject}' 수업 한 개를 삭제할까요?`)) return;
    const invalid = remove ? null : validateTimetableRowDraft(draft);
    if (invalid) { setError(invalid); return; }
    pending.current = true; setBusy(true); onBusy(true); setError("");
    setMessage(remove ? "수업 삭제 및 서버 확인 중입니다." : "수업 저장 및 서버 확인 중입니다.");
    recordAppNextTimetableWrite("pending");
    try {
      const input = { phase, session, workspaceId, ...selection.target, ...draft };
      if (remove) await deleteAppNextTimetableRow(input);
      else if (editing) await updateAppNextTimetableRow(input);
      else await createAppNextTimetableRow(input);
      setMessage("서버 목록 확인 중입니다.");
      if (!await onConfirmed()) throw Object.assign(new Error("Refresh did not confirm the row list."), { code: "app-next-write-unconfirmed" });
      recordAppNextTimetableWrite("server-confirmed");
      setCompleted(true);
      setMessage(`수업 ${remove ? "삭제를" : editing ? "수정을" : "등록을"} 서버에서 확인했습니다.`);
      if (remove) setDraft({ ...EMPTY_TIMETABLE_ROW_DRAFT });
    } catch (cause) {
      recordAppNextTimetableWrite("failed"); setMessage(""); setError(timetableRowErrorMessage(cause));
    } finally {
      pending.current = false; setBusy(false); onBusy(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void mutate(); }
  return <section className="app-next-timetable-editor" aria-label="수업 편집">
    <div className="app-next-section-head"><h2>{editing ? "수업 수정" : "수업 추가"} · {selection.target.day}요일 {selection.target.period}</h2>
      <button type="button" className="secondary" onClick={onClose} disabled={busy}>닫기</button></div>
    <form className="app-next-notice-form" onSubmit={submit}>
      {([["subject", "수업명"], ["teacher", "선생님"], ["room", "강의실"]] as const).map(([key, label]) => <label key={key}>{label}
        <input value={draft[key]} maxLength={120} disabled={busy || !allowed}
          onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))} /></label>)}
      <label>수업 메모<textarea rows={3} maxLength={5000} disabled={busy || !allowed} value={draft.memo}
        onChange={(event) => setDraft((value) => ({ ...value, memo: event.target.value }))} /></label>
      <div className="app-next-actions"><button type="submit" disabled={busy || !allowed}>{busy ? "서버 확인 중" : "수업 저장"}</button>
        {editing && policy.canDelete ? <button type="button" className="secondary" disabled={busy || completed} onClick={() => void mutate(true)}>이 수업 삭제</button> : null}</div>
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
      {error ? <p role="alert" className="app-next-error">{error}</p> : null}
    </form>
  </section>;
}
