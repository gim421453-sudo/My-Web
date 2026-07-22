import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  maskEmail,
  maskUid,
  maskWorkspaceId,
  readLegacySessionSnapshot,
} from "../auth/shadow";
import {
  FIRST_REACT_SCREEN_REQUIRED_PERMISSION,
  firstReactScreenGuardResult,
  firstReactScreenPhaseMessage,
} from "./firstReactScreenAuthUtils";

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function codes(items: readonly { code: string }[] | undefined): string {
  if (!items || items.length === 0) return "-";
  return items.map((item) => item.code).join(", ");
}

export function FirstReactScreenAuthPanel() {
  const {
    phase,
    firebaseUser,
    session,
    error,
    reloadSession,
  } = useAuth();
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");

  const phaseMessage = firstReactScreenPhaseMessage(phase, session, error?.code);
  const guard = firstReactScreenGuardResult(phase, session);
  const isSessionLoading = phase === "initializing" || phase === "loading_session";
  const legacySnapshot = useMemo(
    () => readLegacySessionSnapshot({ firebaseUser }),
    [
      firebaseUser,
      phase,
      session,
    ],
  );

  const handleReload = useCallback(async () => {
    if (reloadBusy) return;
    setReloadBusy(true);
    setReloadMessage("세션을 다시 불러오는 중입니다.");

    try {
      await reloadSession();
      setReloadMessage("세션을 다시 불러왔습니다.");
    } catch {
      setReloadMessage("세션 다시 불러오기에 실패했습니다. Firebase Auth 로그인은 유지됩니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    reloadBusy,
    reloadSession,
  ]);

  return (
    <main className="shadow-page first-auth-screen">
      <header className="shadow-hero">
        <div>
          <p className="eyebrow">Development only</p>
          <h1>Shadow Auth Test - 신규 Provider 제한 적용</h1>
          <p>
            기존 shadow 화면 하나에서만 신규 AuthProvider를 실제 상태 공급자로 사용합니다.
            운영 index.html, app.js 로그인 흐름은 변경하지 않습니다.
          </p>
        </div>
        <div className={`result-pill ${guard.allowed ? "match" : "warning"}`}>
          {guard.allowed ? "ALLOWED" : "GUARDED"}
        </div>
      </header>

      <section className={`notice first-auth-state ${phaseMessage.tone}`}>
        <strong>{phaseMessage.title}</strong>
        <p>{phaseMessage.body}</p>
        <div className="actions compact-actions">
          <button
            type="button"
            onClick={handleReload}
            disabled={reloadBusy || isSessionLoading}
          >
            {reloadBusy ? "불러오는 중" : "세션 다시 불러오기"}
          </button>
        </div>
        {reloadMessage ? <p className="message">{reloadMessage}</p> : null}
      </section>

      <section className="grid">
        <article className="panel">
          <h2>신규 AppSession</h2>
          <dl>
            <dt>phase</dt>
            <dd>{phase}</dd>
            <dt>authenticated</dt>
            <dd>{valueOrDash(session?.isAuthenticated ?? Boolean(firebaseUser))}</dd>
            <dt>masked uid</dt>
            <dd>{valueOrDash(maskUid(session?.uid ?? firebaseUser?.uid))}</dd>
            <dt>masked email</dt>
            <dd>{valueOrDash(maskEmail(session?.email ?? firebaseUser?.email))}</dd>
            <dt>status</dt>
            <dd>{valueOrDash(session?.status)}</dd>
            <dt>globalRole</dt>
            <dd>{valueOrDash(session?.globalRole)}</dd>
            <dt>isSystemOwner</dt>
            <dd>{valueOrDash(session?.isSystemOwner)}</dd>
            <dt>currentWorkspaceId</dt>
            <dd>{valueOrDash(maskWorkspaceId(session?.currentWorkspaceId))}</dd>
            <dt>currentWorkspaceRole</dt>
            <dd>{valueOrDash(session?.currentWorkspaceRole)}</dd>
            <dt>warnings</dt>
            <dd>{codes(session?.warnings)}</dd>
            <dt>error</dt>
            <dd>{valueOrDash(error?.code)}</dd>
          </dl>
        </article>

        <article className="panel">
          <h2>권한 Guard</h2>
          <dl>
            <dt>required</dt>
            <dd>{FIRST_REACT_SCREEN_REQUIRED_PERMISSION}</dd>
            <dt>allowed</dt>
            <dd>{valueOrDash(guard.allowed)}</dd>
            <dt>reason</dt>
            <dd>{guard.reason}</dd>
            <dt>message</dt>
            <dd>{guard.message}</dd>
          </dl>
          {!guard.allowed ? (
            <p className="first-auth-denied">{guard.message}</p>
          ) : null}
        </article>

        {import.meta.env.DEV ? (
          <article className="panel">
            <h2>Legacy snapshot 읽기 전용</h2>
            <p className="empty">
              비교용으로만 읽습니다. 이 화면의 실제 상태 공급자는 신규 AuthProvider입니다.
            </p>
            <dl>
              <dt>legacy uid</dt>
              <dd>{valueOrDash(maskUid(legacySnapshot?.uid))}</dd>
              <dt>legacy email</dt>
              <dd>{valueOrDash(maskEmail(legacySnapshot?.email))}</dd>
              <dt>legacy role</dt>
              <dd>{valueOrDash(legacySnapshot?.role)}</dd>
              <dt>legacy currentRole</dt>
              <dd>{valueOrDash(legacySnapshot?.currentRole)}</dd>
              <dt>legacy workspaceRole</dt>
              <dd>{valueOrDash(legacySnapshot?.workspaceRole)}</dd>
              <dt>legacy workspaceId</dt>
              <dd>{valueOrDash(maskWorkspaceId(legacySnapshot?.currentWorkspaceId ?? legacySnapshot?.workspaceId))}</dd>
            </dl>
          </article>
        ) : null}

        <article className="panel">
          <h2>롤백</h2>
          <p className="empty">
            즉시 기존 방식으로 돌아가려면 주소에 ?newAuthScreen=off를 붙이세요.
            플래그 off 상태에서는 기존 ShadowAuthTestApp이 그대로 렌더됩니다.
          </p>
        </article>
      </section>
    </main>
  );
}
