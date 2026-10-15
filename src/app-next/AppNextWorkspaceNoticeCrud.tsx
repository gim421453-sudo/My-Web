import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  appNextWorkspaceNoticeWriteErrorMessage,
  appNextWorkspaceNoticeWritePolicy,
  canManageAppNextWorkspaceNotice,
  validateAppNextWorkspaceNoticeDraft,
  type AppNextWorkspaceNoticeManagementRecord,
} from "./appNextWorkspaceNoticeCrudUtils";
import {
  recordAppNextNoticeWriteAttempt,
  recordAppNextNoticeWriteResult,
} from "./appNextDiagnostics";
import {
  createAppNextWorkspaceNotice,
  deleteAppNextWorkspaceNotice,
  updateAppNextWorkspaceNotice,
} from "./appNextWorkspaceNoticeCrudService";

interface AppNextWorkspaceNoticeCrudProps {
  workspaceId: string;
  managedNotices: AppNextWorkspaceNoticeManagementRecord[];
  onServerConfirmed(): Promise<boolean>;
}

const EMPTY_DRAFT = { title: "", content: "" };

export function AppNextWorkspaceNoticeCrud({
  workspaceId,
  managedNotices,
  onServerConfirmed,
}: AppNextWorkspaceNoticeCrudProps) {
  const { phase, session } = useAuth();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const policy = useMemo(
    () => appNextWorkspaceNoticeWritePolicy({ phase, session }),
    [phase, session],
  );
  const manageableNotices = useMemo(
    () => managedNotices.filter((notice) => canManageAppNextWorkspaceNotice(policy, notice.authorUid)),
    [managedNotices, policy],
  );

  function startCreate() {
    setEditingNoticeId(null);
    setDraft(EMPTY_DRAFT);
    setErrorMessage("");
    setMessage("");
  }

  function startEdit(notice: AppNextWorkspaceNoticeManagementRecord) {
    setEditingNoticeId(notice.id);
    setDraft({ title: notice.title, content: notice.content });
    setErrorMessage("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingNoticeId(null);
    setDraft(EMPTY_DRAFT);
    setErrorMessage("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !session) return;

    const validationMessage = validateAppNextWorkspaceNoticeDraft(draft);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      setMessage("");
      return;
    }

    const action = editingNoticeId ? "update" : "create";
    setBusy(true);
    recordAppNextNoticeWriteAttempt(action);
    setErrorMessage("");
    setMessage("Firestore 서버에 저장하고 있습니다.");
    try {
      const input = { phase, session, workspaceId, ...draft };
      if (editingNoticeId) {
        await updateAppNextWorkspaceNotice({ ...input, noticeId: editingNoticeId });
      } else {
        await createAppNextWorkspaceNotice(input);
      }
      recordAppNextNoticeWriteResult(action, "server-confirmed", true);
      const refreshed = await onServerConfirmed();
      setMessage(refreshed
        ? `공지 ${action === "create" ? "등록" : "수정"}을 서버에서 확인했습니다.`
        : "저장 응답은 서버에서 확인했지만 목록 새로고침에 실패했습니다. 서버 조회를 다시 실행해 주세요.");
      setEditingNoticeId(null);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      const code = String((error as { code?: unknown })?.code ?? "write-failed")
        .replace(/^firestore\//, "");
      recordAppNextNoticeWriteResult(action, code, false);
      setMessage("");
      setErrorMessage(appNextWorkspaceNoticeWriteErrorMessage(error, action));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(notice: AppNextWorkspaceNoticeManagementRecord) {
    if (busy || !session || !window.confirm(`'${notice.title}' 공지를 삭제할까요?`)) return;

    setBusy(true);
    recordAppNextNoticeWriteAttempt("delete");
    setMessage("Firestore 서버에 삭제를 요청하고 있습니다.");
    setErrorMessage("");
    try {
      await deleteAppNextWorkspaceNotice({ phase, session, workspaceId, noticeId: notice.id });
      recordAppNextNoticeWriteResult("delete", "server-confirmed", true);
      const refreshed = await onServerConfirmed();
      setMessage(refreshed
        ? "공지 삭제를 서버에서 확인했습니다."
        : "삭제 응답은 서버에서 확인했지만 목록 새로고침에 실패했습니다. 서버 조회를 다시 실행해 주세요.");
      if (editingNoticeId === notice.id) {
        setEditingNoticeId(null);
        setDraft(EMPTY_DRAFT);
      }
    } catch (error) {
      const code = String((error as { code?: unknown })?.code ?? "write-failed")
        .replace(/^firestore\//, "");
      recordAppNextNoticeWriteResult("delete", code, false);
      setMessage("");
      setErrorMessage(appNextWorkspaceNoticeWriteErrorMessage(error, "delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-next-notice-crud" aria-label="App Next 공지 관리">
      <div className="app-next-section-head">
        <div>
          <h3>공지 관리</h3>
          <p>Firestore 서버 확인이 끝난 뒤에만 완료로 표시합니다.</p>
        </div>
        <button type="button" className="secondary" onClick={startCreate} disabled={busy}>
          새 공지
        </button>
      </div>

      <form className="app-next-notice-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          제목
          <input
            type="text"
            value={draft.title}
            maxLength={120}
            required
            disabled={busy}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          내용
          <textarea
            value={draft.content}
            maxLength={5000}
            rows={5}
            required
            disabled={busy}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          />
        </label>
        <div className="app-next-actions">
          <button type="submit" disabled={busy}>
            {busy ? "서버 확인 중" : editingNoticeId ? "수정 저장" : "공지 등록"}
          </button>
          {editingNoticeId ? (
            <button type="button" className="secondary" onClick={cancelEdit} disabled={busy}>
              취소
            </button>
          ) : null}
        </div>
        {message ? <p role="status" aria-live="polite" className="app-next-message">{message}</p> : null}
        {errorMessage ? <p role="alert" className="app-next-message app-next-error">{errorMessage}</p> : null}
      </form>

      {manageableNotices.length > 0 ? (
        <ul className="app-next-notice-manage-list">
          {manageableNotices.map((notice) => (
            <li key={notice.id}>
              <strong>{notice.title || "제목 없는 공지"}</strong>
              <div className="app-next-actions">
                <button type="button" className="secondary" onClick={() => startEdit(notice)} disabled={busy}>
                  수정
                </button>
                <button type="button" className="secondary" onClick={() => void handleDelete(notice)} disabled={busy}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
