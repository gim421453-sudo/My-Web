import {
  useCallback,
  useState,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  accountStatusMessage,
  booleanYesNo,
  emailVerificationMessage,
  maskEmailForVerifyEmail,
  valueOrDash,
  verifyEmailPhaseMessage,
  warningCodes,
  workspaceStatusMessage,
} from "./verifyEmailUtils";

interface VerifyEmailProps {
  mode?: "legacy-placeholder" | "new-auth";
}

function MessageCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "muted" | "success" | "warning" | "error";
}) {
  return (
    <article className={`verify-email-card verify-email-${tone}`}>
      <h2>{title}</h2>
      {body.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function VerifyEmailNewAuthView() {
  const {
    phase,
    firebaseUser,
    session,
    error,
    reloadSession,
  } = useAuth();
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");

  const phaseMessage = verifyEmailPhaseMessage(phase);
  const emailMessage = emailVerificationMessage(
    session?.emailVerified ?? firebaseUser?.emailVerified,
  );
  const statusMessage = accountStatusMessage(session?.status);
  const workspaceMessage = workspaceStatusMessage(session);
  const maskedEmail = maskEmailForVerifyEmail(session?.email ?? firebaseUser?.email);
  const isSessionLoading = phase === "initializing" || phase === "loading_session";

  const handleReload = useCallback(async () => {
    if (reloadBusy) return;

    setReloadBusy(true);
    setReloadMessage("계정 상태를 다시 확인하고 있습니다.");

    try {
      await reloadSession();
      setReloadMessage("계정 상태를 다시 확인했습니다.");
    } catch {
      setReloadMessage("계정 상태를 다시 불러오지 못했습니다. 로그인은 유지됩니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    reloadBusy,
    reloadSession,
  ]);

  return (
    <main className="verify-email-page">
      <header className="verify-email-header">
        <p className="verify-email-eyebrow">읽기 전용 계정 상태</p>
        <h1>이메일 인증 및 계정 상태</h1>
        <p>
          이 화면은 계정 상태를 확인하기만 하며, 이메일 변경이나 계정 정보 수정은 하지 않습니다.
        </p>
      </header>

      <section className="verify-email-actions" aria-label="계정 상태 다시 확인">
        <button
          type="button"
          onClick={handleReload}
          disabled={reloadBusy || isSessionLoading}
        >
          {reloadBusy ? "확인 중" : "계정 상태 다시 확인"}
        </button>
        {reloadMessage ? <p>{reloadMessage}</p> : null}
      </section>

      <section className="verify-email-card-grid">
        <MessageCard {...phaseMessage} />
        <MessageCard {...emailMessage} />
        <MessageCard {...statusMessage} />
        <MessageCard {...workspaceMessage} />
      </section>

      <section className="verify-email-panel">
        <h2>계정 상태</h2>
        <dl>
          <dt>인증 상태</dt>
          <dd>{phase}</dd>
          <dt>이메일</dt>
          <dd>{maskedEmail}</dd>
          <dt>emailVerified</dt>
          <dd>{booleanYesNo(session?.emailVerified ?? firebaseUser?.emailVerified)}</dd>
          <dt>status</dt>
          <dd>{valueOrDash(session?.status)}</dd>
          <dt>globalRole</dt>
          <dd>{valueOrDash(session?.globalRole)}</dd>
          <dt>isSystemOwner</dt>
          <dd>{booleanYesNo(session?.isSystemOwner)}</dd>
          <dt>currentWorkspaceId 존재 여부</dt>
          <dd>{booleanYesNo(Boolean(session?.currentWorkspaceId))}</dd>
          <dt>currentWorkspaceRole</dt>
          <dd>{valueOrDash(session?.currentWorkspaceRole)}</dd>
          <dt>warning codes</dt>
          <dd>{warningCodes(session)}</dd>
          <dt>error</dt>
          <dd>{valueOrDash(error?.code)}</dd>
        </dl>
      </section>

      <section className="verify-email-panel verify-email-readonly">
        <h2>읽기 전용 제한</h2>
        <p>
          이 화면에서는 인증 메일 재전송, 이메일 변경, 로그아웃, 계정 삭제, 워크스페이스 변경을 실행하지 않습니다.
        </p>
      </section>
    </main>
  );
}

export function VerifyEmail({
  mode = "legacy-placeholder",
}: VerifyEmailProps = {}) {
  if (mode !== "new-auth") {
    return null;
  }

  return <VerifyEmailNewAuthView />;
}
