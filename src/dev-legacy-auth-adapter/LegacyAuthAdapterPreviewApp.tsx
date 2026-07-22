import {
  useCallback,
  useState,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  useLegacyAuthAdapter,
} from "../auth/legacy/LegacyAuthAdapter";
import {
  maskLegacyAdapterEmail,
  maskLegacyAdapterValue,
  warningCodesLabel,
} from "../auth/legacy/legacyAuthAdapterUtils";

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

function NewProviderPanel() {
  const {
    phase,
    firebaseUser,
    session,
    error,
  } = useAuth();

  return (
    <section className="legacy-adapter-panel">
      <p className="legacy-adapter-eyebrow">New AuthProvider raw state</p>
      <h2>신규 Provider 원본 값</h2>
      <dl className="legacy-adapter-grid">
        <dt>phase</dt>
        <dd>{phase}</dd>
        <dt>firebase user</dt>
        <dd>{firebaseUser ? "있음" : "없음"}</dd>
        <dt>masked uid</dt>
        <dd>{maskLegacyAdapterValue(session?.uid ?? firebaseUser?.uid)}</dd>
        <dt>masked email</dt>
        <dd>{maskLegacyAdapterEmail(session?.email ?? firebaseUser?.email)}</dd>
        <dt>isAuthenticated</dt>
        <dd>{valueOrDash(session?.isAuthenticated ?? Boolean(firebaseUser))}</dd>
        <dt>status</dt>
        <dd>{valueOrDash(session?.status)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(session?.globalRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(session?.isSystemOwner)}</dd>
        <dt>currentWorkspaceId</dt>
        <dd>{maskLegacyAdapterValue(session?.currentWorkspaceId)}</dd>
        <dt>currentWorkspaceRole</dt>
        <dd>{valueOrDash(session?.currentWorkspaceRole)}</dd>
        <dt>warningCodes</dt>
        <dd>{warningCodesLabel(session?.warnings.map((warning) => warning.code))}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(error?.code)}</dd>
      </dl>
    </section>
  );
}

function LegacyAdapterPanel() {
  const legacy = useLegacyAuthAdapter();

  return (
    <section className="legacy-adapter-panel legacy-adapter-panel-accent">
      <p className="legacy-adapter-eyebrow">LegacyAuthAdapter converted state</p>
      <h2>기존 호환 변환 값</h2>
      <dl className="legacy-adapter-grid">
        <dt>phase</dt>
        <dd>{valueOrDash(legacy.phase)}</dd>
        <dt>loading</dt>
        <dd>{valueOrDash(legacy.loading)}</dd>
        <dt>isAuthenticated</dt>
        <dd>{valueOrDash(legacy.isAuthenticated)}</dd>
        <dt>status</dt>
        <dd>{valueOrDash(legacy.status)}</dd>
        <dt>globalRole</dt>
        <dd>{valueOrDash(legacy.session?.globalRole)}</dd>
        <dt>isSystemOwner</dt>
        <dd>{valueOrDash(legacy.isSystemOwner)}</dd>
        <dt>workspaceId</dt>
        <dd>{maskLegacyAdapterValue(legacy.workspaceId)}</dd>
        <dt>workspaceRole</dt>
        <dd>{valueOrDash(legacy.workspaceRole)}</dd>
        <dt>currentRole</dt>
        <dd>{valueOrDash(legacy.currentRole)}</dd>
        <dt>masked uid</dt>
        <dd>{maskLegacyAdapterValue(legacy.session?.uid)}</dd>
        <dt>masked email</dt>
        <dd>{maskLegacyAdapterEmail(legacy.session?.email)}</dd>
        <dt>warningCodes</dt>
        <dd>{warningCodesLabel(legacy.session?.warningCodes)}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(legacy.error)}</dd>
      </dl>
      {legacy.session?.status === "active" && legacy.workspaceId === null ? (
        <p className="legacy-adapter-note">
          현재 선택된 워크스페이스가 없어도 로그인 상태는 유지됩니다.
        </p>
      ) : null}
    </section>
  );
}

function AdapterFunctionPanel() {
  const {
    login,
    logout,
    reloadSession,
  } = useLegacyAuthAdapter();
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");

  const handleReload = useCallback(async () => {
    if (reloadBusy) return;

    setReloadBusy(true);
    setReloadMessage("세션을 다시 확인하고 있습니다.");

    try {
      await reloadSession();
      setReloadMessage("세션을 다시 확인했습니다.");
    } catch {
      setReloadMessage("세션 다시 확인에 실패했습니다. 자동 로그아웃은 수행하지 않습니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    reloadBusy,
    reloadSession,
  ]);

  return (
    <section className="legacy-adapter-panel">
      <p className="legacy-adapter-eyebrow">Function forwarding</p>
      <h2>함수 참조 상태</h2>
      <dl className="legacy-adapter-grid">
        <dt>login</dt>
        <dd>{typeof login === "function" ? "참조 있음" : "없음"}</dd>
        <dt>logout</dt>
        <dd>{typeof logout === "function" ? "참조 있음" : "없음"}</dd>
        <dt>reloadSession</dt>
        <dd>{typeof reloadSession === "function" ? "참조 있음" : "없음"}</dd>
      </dl>
      <p className="legacy-adapter-muted">
        이 미리보기 화면은 실제 login/logout 버튼을 만들지 않습니다.
      </p>
      <button
        type="button"
        onClick={handleReload}
        disabled={reloadBusy}
      >
        {reloadBusy ? "확인 중" : "reloadSession 확인"}
      </button>
      {reloadMessage ? <p className="legacy-adapter-muted">{reloadMessage}</p> : null}
    </section>
  );
}

function CollisionPanel() {
  return (
    <section className="legacy-adapter-panel">
      <p className="legacy-adapter-eyebrow">Expected consumer collisions</p>
      <h2>기존 소비자 예상 충돌</h2>
      <ul className="legacy-adapter-list">
        <li>`Login.tsx`: 기존 `login()`은 세션 생성 완료를 기대하지만 새 `signInWithEmail()`은 로그인만 수행합니다.</li>
        <li>`ProtectedRoute.tsx`: `currentRole`이 필요하므로 adapter가 `currentWorkspaceRole`을 변환해야 합니다.</li>
        <li>`RequireAuth.tsx`: pending/rejected/disabled를 단순 signed out으로 보면 안 됩니다.</li>
        <li>`RequireWorkspaceRole.tsx`: system_owner는 workspace role이 아니며 global owner bypass로만 처리해야 합니다.</li>
      </ul>
    </section>
  );
}

export function LegacyAuthAdapterPreviewApp() {
  return (
    <main className="legacy-adapter-shell">
      <header className="legacy-adapter-header">
        <p className="legacy-adapter-eyebrow">Development only</p>
        <h1>LegacyAuthAdapter 호환성 미리보기</h1>
        <p>
          운영 로그인 구조를 바꾸지 않고, 신규 AuthProvider 값을 기존 React AuthContext 소비자가 기대하는 형태로 변환해 비교합니다.
        </p>
      </header>
      <div className="legacy-adapter-columns">
        <NewProviderPanel />
        <LegacyAdapterPanel />
      </div>
      <AdapterFunctionPanel />
      <CollisionPanel />
    </main>
  );
}
