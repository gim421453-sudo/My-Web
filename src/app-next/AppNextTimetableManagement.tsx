import { useMemo, useRef, useState, type FormEvent } from "react";
import type { AppSession, AuthPhase } from "../auth/authTypes";
import { changeAppNextTimetableSetLifecycle, createAppNextTimetableSet, saveAppNextTimetablePeriod, updateAppNextTimetableSet } from "./appNextTimetableManagementService";
import { localDateString, parseTimetableDate, periodBelongsToSet, timetableLifecycle, timetableManagementErrorMessage, timetableManagementPolicy, validatePeriodDraft, validateTimetableSetDraft, type PeriodDraft, type TimetableSetDraft } from "./appNextTimetableManagementUtils";
import type { AppNextRawTimetableStore } from "./appNextTimetableReadonlyUtils";
import { activeTimetablePeriods } from "./appNextTimetableRowCrudUtils";

const today = () => localDateString();
const blankSet = (): TimetableSetDraft => ({ name: "", kind: "general", startDate: today(), endDate: "", memo: "" });

export function AppNextTimetableManagement({ phase, session, workspaceId, operationMode, store, selectedSetId, disabled, onBusy, onConfirmed, onSelectSet }: {
  phase: AuthPhase; session: AppSession | null; workspaceId: string; operationMode: string;
  store: AppNextRawTimetableStore; selectedSetId: string; disabled: boolean; onBusy(value: boolean): void; onConfirmed(): Promise<boolean>; onSelectSet(id: string): void;
}) {
  const policy = timetableManagementPolicy({ phase, session, workspaceId, operationMode });
  const [tab, setTab] = useState<"periods" | "sets">("periods");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TimetableSetDraft>(blankSet);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);
  const [periodEditingNumber, setPeriodEditingNumber] = useState<number | null>(null);
  const [editingSet, setEditingSet] = useState<string>("");
  const [editingDraft, setEditingDraft] = useState<TimetableSetDraft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const selectedSet = store.timetableSets.find((set) => set.id === selectedSetId);
  const periods = useMemo(() => selectedSet ? activeTimetablePeriods(String(selectedSet.id), selectedSet, store.periodTimes).map((effective) => {
    const scoped = store.periodTimes.find((row) => periodBelongsToSet(row, String(selectedSet.id))
      && Number(String(row.period || row.value || row.label || row.id).match(/\d+/)?.[0]) === effective.periodNumber);
    const common = store.periodTimes.find((row) => !(row.timetableSetId ?? row.setId ?? row.scheduleSetId)
      && Number(String(row.period || row.value || row.label || row.id).match(/\d+/)?.[0]) === effective.periodNumber);
    const row = scoped || common;
    const parts = effective.time.split(/[-~]/).map((part) => part.trim());
    return { id: String(row?.id || `${selectedSet.id}-${effective.periodNumber}`), period: effective.periodNumber,
      start: String(row?.start || row?.startTime || parts[0] || ""), end: String(row?.end || row?.endTime || parts[1] || ""), inherited: !scoped };
  }) : [], [selectedSet, store.periodTimes]);
  const sets = store.timetableSets.filter((set) => {
    const state = timetableLifecycle(set);
    return tab === "periods" || state === "active" || state === "scheduled";
  });
  const archivedSets = store.timetableSets.filter((set) => timetableLifecycle(set) === "archived");
  const endedSets = store.timetableSets.filter((set) => timetableLifecycle(set) === "ended");

  async function run(action: () => Promise<{ id?: string } | unknown>, success: string, selectCreated = false) {
    if (pending.current || !policy.canManage || disabled) return;
    pending.current = true; onBusy(true); setError(""); setMessage("변경 사항을 저장하고 서버에서 확인하는 중입니다.");
    try {
      const result = await action();
      if (!await onConfirmed()) throw Object.assign(new Error("Server list refresh failed"), { code: "app-next-write-unconfirmed" });
      if (selectCreated && result && typeof result === "object" && "id" in result && typeof result.id === "string") onSelectSet(result.id);
      setMessage(success); setError("");
    } catch (cause) { setMessage(""); setError(timetableManagementErrorMessage(cause)); }
    finally { pending.current = false; onBusy(false); }
  }
  function context() { return { phase, session, workspaceId, operationMode }; }
  function create(event: FormEvent) {
    event.preventDefault(); const invalid = validateTimetableSetDraft(draft); if (invalid) { setError(timetableManagementErrorMessage({ code: invalid })); return; }
    void run(() => createAppNextTimetableSet({ ...context(), ...draft }), "새 시간표를 서버에서 확인했습니다.", true);
    setCreateOpen(false); setDraft(blankSet());
  }
  function saveSet(event: FormEvent, setId: string, value: TimetableSetDraft) {
    event.preventDefault(); const invalid = validateTimetableSetDraft(value); if (invalid) { setError(timetableManagementErrorMessage({ code: invalid })); return; }
    void run(() => updateAppNextTimetableSet({ ...context(), ...value, setId }), "시간표 정보를 서버에서 확인했습니다."); setEditingSet("");
  }
  function savePeriod(event: FormEvent) {
    event.preventDefault(); if (!selectedSet || !periodDraft) return;
    const validation = validatePeriodDraft(periodDraft, periods, periodEditingNumber ?? undefined);
    if (validation) { setError(timetableManagementErrorMessage({ code: validation })); return; }
    const existingPeriod = periodEditingNumber ?? undefined;
    void run(() => saveAppNextTimetablePeriod({ ...context(), setId: String(selectedSet.id), draft: periodDraft, existingPeriod }), "교시 정보를 서버에서 확인했습니다."); setPeriodDraft(null);
  }
  return <section className="app-next-panel app-next-timetable-management" aria-label="시간표 관리">
    <div className="app-next-section-head"><h2>시간표 관리</h2>
      <div className="app-next-actions"><button type="button" className={tab === "periods" ? "" : "secondary"} onClick={() => setTab("periods")}>교시 관리</button>
        <button type="button" className={tab === "sets" ? "" : "secondary"} onClick={() => setTab("sets")}>세트 관리</button></div></div>
    {!policy.canManage ? <p>세트와 교시 변경은 운영 권한이 있는 활성 계정에서 사용할 수 있습니다.</p> : null}
    {tab === "periods" ? <>
      {selectedSet ? <p>선택 세트: {String(selectedSet.name || selectedSet.id)} · 연결된 수업을 보존하며 이 세트에만 적용됩니다.</p> : <p>교시를 관리할 시간표 세트를 먼저 선택해 주세요.</p>}{policy.canManage ? <p role="note">기존 수업 저장 경로는 임의 문서 ID를 사용하고 현재 서버 규칙은 교시 참조를 확인하지 않습니다. 동시 저장을 차단할 수 없어 교시 삭제는 잠겨 있으며 기존 교시와 수업은 보존됩니다.</p> : null}
      {policy.canManage && selectedSet ? <button type="button" disabled={disabled || pending.current} onClick={() => {
        const next = Math.max(0, ...periods.map((item) => item.period)) + 1; setPeriodEditingNumber(null); setPeriodDraft({ period: next, start: "", end: "" }); setError("");
      }}>교시 추가</button> : null}
      {periods.map((period, index) => <article className="app-next-timetable-management-row" key={period.id}>
        <strong>{period.period}교시</strong><span>{period.start && period.end ? `${period.start}–${period.end}` : "시간 미설정"}{period.inherited ? " · 공통 교시" : ""}</span>
        {policy.canManage ? <div className="app-next-actions"><button type="button" className="secondary" disabled={disabled || pending.current}
          onClick={() => { setPeriodEditingNumber(period.period); setPeriodDraft({ period: period.period, start: period.start, end: period.end }); }}>시간 수정</button>
          {!period.inherited && index === periods.length - 1 && periods.length > 1 ? <button type="button" className="secondary" disabled title="기존 수업 저장 경로와의 경쟁 상태를 서버에서 막을 수 없어 잠겨 있습니다.">마지막 교시 삭제</button> : null}</div> : null}
      </article>)}
      {periodDraft ? <form className="app-next-timetable-management-form" onSubmit={savePeriod}>
        <label>교시 번호<input type="number" min="1" max="100" value={periodDraft.period} onChange={(e) => setPeriodDraft({ ...periodDraft, period: Number(e.target.value) })} disabled={pending.current || periodEditingNumber !== null} /></label>
        <label>시작 시간<input type="time" value={periodDraft.start} onChange={(e) => setPeriodDraft({ ...periodDraft, start: e.target.value })} required disabled={pending.current} /></label>
        <label>종료 시간<input type="time" value={periodDraft.end} onChange={(e) => setPeriodDraft({ ...periodDraft, end: e.target.value })} required disabled={pending.current} /></label>
        <button type="submit" disabled={pending.current || !policy.canManage}>저장</button><button type="button" className="secondary" onClick={() => { setPeriodDraft(null); setPeriodEditingNumber(null); }}>취소</button>
      </form> : null}
    </> : <>
      <div className="app-next-section-head"><h3>활성·예정 세트</h3>{policy.canManage ? <button type="button" disabled={disabled || pending.current} onClick={() => { setCreateOpen(!createOpen); setError(""); }}>시간표 추가</button> : null}</div>
      {createOpen ? <form className="app-next-timetable-management-form" onSubmit={create}><SetFields value={draft} disabled={pending.current} onChange={setDraft} />
        <button type="submit" disabled={pending.current}>시간표 저장</button><button type="button" className="secondary" onClick={() => setCreateOpen(false)}>취소</button></form> : null}
      {sets.map((set) => {
        const setId = String(set.id); const lifecycle = timetableLifecycle(set);
        const value: TimetableSetDraft = { name: String(set.name || ""), kind: String(set.kind || set.type || "general"), startDate: parseTimetableDate(set.startDate) || "", endDate: parseTimetableDate(set.endDate) || "", memo: String(set.memo || "") };
        return <article className="app-next-timetable-management-card" key={setId}><div><strong>{value.name || setId}</strong><span>{lifecycle} · {value.startDate || "시작일 없음"}{value.endDate ? ` – ${value.endDate}` : ""}</span></div>
          {policy.canManage ? <div className="app-next-actions"><button type="button" className="secondary" onClick={() => { setEditingSet(editingSet === setId ? "" : setId); setEditingDraft(editingSet === setId ? null : value); }}>수정</button>
            <button type="button" className="secondary" disabled={disabled || pending.current} onClick={() => void run(() => changeAppNextTimetableSetLifecycle({ ...context(), setId, action: "archive" }), "시간표 보관을 서버에서 확인했습니다.")}>보관</button></div> : null}
          {editingSet === setId && editingDraft ? <form className="app-next-timetable-management-form" onSubmit={(e) => saveSet(e, setId, editingDraft)}><SetFields value={editingDraft} disabled={pending.current} onChange={setEditingDraft} />
            <button type="submit" disabled={pending.current}>변경 저장</button></form> : null}
        </article>;
      })}
      <h3>종료된 세트</h3>{endedSets.map((set) => <SetLifecycleCard key={String(set.id)} set={set} policy={policy.canManage} disabled={disabled || pending.current} onAction={(action) => run(() => changeAppNextTimetableSetLifecycle({ ...context(), setId: String(set.id), action }), "세트 상태를 서버에서 확인했습니다.")} />)}
      <h3>보관된 세트</h3>{archivedSets.map((set) => <SetLifecycleCard key={String(set.id)} set={set} policy={policy.canManage} disabled={disabled || pending.current} onAction={(action) => run(() => changeAppNextTimetableSetLifecycle({ ...context(), setId: String(set.id), action }), "세트 상태를 서버에서 확인했습니다.")} />)}
    </>}
    {message ? <p role="status" aria-live="polite">{message}</p> : null}{error ? <p role="alert" className="app-next-error">{error}</p> : null}
  </section>;
}

function SetFields({ value, disabled, onChange }: { value: TimetableSetDraft; disabled: boolean; onChange(value: TimetableSetDraft): void }) {
  return <>
    <label>이름<input maxLength={100} required value={value.name} disabled={disabled} onChange={(e) => onChange({ ...value, name: e.target.value })} /></label>
    <label>분류<select value={value.kind} disabled={disabled || !["general", "school"].includes(value.kind)} onChange={(e) => onChange({ ...value, kind: e.target.value })}>
      {!['general', 'school'].includes(value.kind) ? <option value={value.kind}>{value.kind} (기존 연결 유지)</option> : null}<option value="general">일반</option><option value="school">학교</option></select></label>
    <label>시작일<input type="date" required value={value.startDate} disabled={disabled} onChange={(e) => onChange({ ...value, startDate: e.target.value })} /></label>
    <label>종료일(선택)<input type="date" value={value.endDate} disabled={disabled} onChange={(e) => onChange({ ...value, endDate: e.target.value })} /></label>
    <label>메모<textarea maxLength={1000} value={value.memo} disabled={disabled} onChange={(e) => onChange({ ...value, memo: e.target.value })} /></label>
  </>;
}
function SetLifecycleCard({ set, policy, disabled, onAction }: { set: Record<string, unknown>; policy: boolean; disabled: boolean; onAction(action: "unarchive" | "reactivate"): void }) {
  const action = timetableLifecycle(set) === "archived" ? "unarchive" : "reactivate";
  return <article className="app-next-timetable-management-card"><strong>{String(set.name || set.id)}</strong><span>{timetableLifecycle(set)}</span>
    {policy ? <button type="button" className="secondary" disabled={disabled} onClick={() => onAction(action)}>{action === "unarchive" ? "보관 해제" : "재활성화"}</button> : null}</article>;
}
