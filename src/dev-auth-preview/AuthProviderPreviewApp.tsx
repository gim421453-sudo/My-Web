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
  createPermissionPreview,
  createRoleManagementPreview,
  phaseMessageForPreview,
  previewUsesKnownPermission,
} from "./authProviderPreviewUtils";

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function codes(items: readonly { code: string }[] | undefined): string {
  if (!items || items.length === 0) return "-";
  return items.map((item) => item.code).join(", ");
}

function StatusPanel() {
  const {
    phase,
    session,
    error,
    reloadSession,
  } = useAuth();
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");
  const message = phaseMessageForPreview(phase, session, error?.code);
  const isSessionLoading = phase === "initializing" || phase === "loading_session";

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
    <section className={`preview-panel preview-state-${message.tone}`}>
      <div>
        <p className="eyebrow">Auth phase</p>
        <h2>{message.title}</h2>
        <p>{message.body}</p>
      </div>
      <button
        type="button"
        onClick={handleReload}
        disabled={reloadBusy || isSessionLoading}
      >
        {reloadBusy ? "불러오는 중" : "세션 다시 불러오기"}
      </button>
      {reloadMessage ? <p className="muted">{reloadMessage}</p> : null}
    </section>
  );
}

function SessionPanel() {
  const {
    phase,
    firebaseUser,
    session,
    error,
  } = useAuth();

  return (
    <section className="preview-panel">
      <h2>신규 AuthProvider 세션</h2>
      <dl className="preview-grid">
        <dt>Auth phase</dt>
        <dd>{phase}</dd>
        <dt>isAuthenticated</dt>
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
        <dt>warning codes</dt>
        <dd>{codes(session?.warnings)}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(error?.code)}</dd>
      </dl>
      {phase === "authenticated" && session?.currentWorkspaceId === null ? (
        <p className="preview-note">
          연결된 현재 워크스페이스가 없습니다. 로그인은 정상적으로 유지되고 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function PermissionPanel() {
  const {
    session,
  } = useAuth();
  const permissionRows = useMemo(() => createPermissionPreview(session), [session]);
  const roleRows = useMemo(() => createRoleManagementPreview(session), [session]);

  return (
    <section className="preview-panel">
      <h2>권한 미리보기</h2>
      <div className="preview-two-column">
        <article>
          <h3>Permission</h3>
          <table>
            <thead>
              <tr>
                <th>권한</th>
                <th>결과</th>
              </tr>
            </thead>
            <tbody>
              {permissionRows.map((row) => (
                <tr key={row.permission}>
                  <td>{row.permission}</td>
                  <td className={row.allowed ? "allowed" : "denied"}>
                    {previewUsesKnownPermission(row.permission) ? row.label : "거부"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article>
          <h3>역할 관리 미리보기</h3>
          <table>
            <thead>
              <tr>
                <th>대상 역할</th>
                <th>결과</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map((row) => (
                <tr key={row.targetRole}>
                  <td>{row.targetRole}</td>
                  <td className={row.allowed ? "allowed" : "denied"}>{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}

function LegacyReadOnlyPanel() {
  const {
    firebaseUser,
    phase,
    session,
  } = useAuth();
  const legacySnapshot = useMemo(
    () => readLegacySessionSnapshot({ firebaseUser }),
    [
      firebaseUser,
      phase,
      session,
    ],
  );

  return (
    <section className="preview-panel preview-legacy">
      <h2>Legacy snapshot 읽기 전용 비교</h2>
      <p className="muted">
        이 패널은 비교용으로만 legacy 세션을 읽습니다. 화면의 실제 상태 공급자는 신규 AuthProvider입니다.
      </p>
      <dl className="preview-grid">
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
    </section>
  );
}

export function AuthProviderPreviewApp() {
  return (
    <main className="auth-preview-shell">
      <header className="auth-preview-header">
        <p className="eyebrow">Development only</p>
        <h1>신규 AuthProvider 실제 상태 미리보기</h1>
        <p>
          운영 앱 로그인 흐름을 교체하지 않고, 이 화면 하나에서만 신규 AuthProvider context를 실제 상태 공급자로 사용합니다.
        </p>
      </header>
      <StatusPanel />
      <SessionPanel />
      <PermissionPanel />
      <LegacyReadOnlyPanel />
    </main>
  );
}
