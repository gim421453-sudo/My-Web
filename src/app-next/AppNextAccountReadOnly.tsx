import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  getAuthProviderDiagnosticsSnapshot,
} from "../auth/AuthProvider";
import {
  useAuth,
} from "../auth/useAuth";
import {
  getAppNextAuthDiagnostics,
  getAppNextAuthRouteMatrixDiagnostics,
  recordAppNextAccountDiagnostics,
  recordAppNextSettingsReadOnlyDiagnostics,
} from "./appNextDiagnostics";
import {
  maskAppNextEmail,
  verificationStatusLabel,
} from "./appNextUtils";
import {
  appNextAccountReadOnlyPolicy,
  detectSensitiveAccountText,
  normalizePersistenceMode,
  providerCategoryFromIds,
  safeWarningCodes,
} from "./appNextAccountSettingsUtils";

type AccountReadOnlyScreen =
  | "account"
  | "settings-readonly";

let accountRenderCount = 0;
let settingsRenderCount = 0;

function booleanLabel(value: boolean): string {
  return value ? "예" : "아니오";
}

function ValueRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function AppNextAccountReadOnly({
  screen,
  requestedRoute,
  currentRoute,
  requireAuthMode,
  protectedRouteMode,
  requireWorkspaceRoleMode,
  onNavigate,
}: {
  screen: AccountReadOnlyScreen;
  requestedRoute: string;
  currentRoute: string;
  requireAuthMode: string;
  protectedRouteMode: string;
  requireWorkspaceRoleMode: string;
  onNavigate(route: "dashboard" | "devices" | "notifications" | "notices"): void;
}) {
  const {
    phase,
    firebaseUser,
    session,
    error,
  } = useAuth();
  const renderRef = useRef(0);
  renderRef.current += 1;
  if (screen === "settings-readonly") {
    settingsRenderCount += 1;
  } else {
    accountRenderCount += 1;
  }

  const authDiagnostics = getAppNextAuthDiagnostics();
  const providerIds = useMemo(
    () => (firebaseUser?.providerData || []).map((provider) => provider.providerId),
    [
      firebaseUser?.providerData,
    ],
  );
  const providerCategory = providerCategoryFromIds(providerIds);
  const persistenceMode = normalizePersistenceMode(authDiagnostics.effectivePersistence);
  const warningCodes = safeWarningCodes(session?.warnings);
  const policy = appNextAccountReadOnlyPolicy({
    phase,
    session,
  });
  const maskedEmail = maskAppNextEmail(session?.email ?? firebaseUser?.email);
  const emailVerified = session?.emailVerified ?? firebaseUser?.emailVerified ?? null;
  const sensitiveValueDetected = detectSensitiveAccountText([
    providerCategory,
    persistenceMode,
    policy.globalRoleCategory,
    policy.workspaceRoleCategory,
    warningCodes.join(","),
  ]);

  useEffect(() => {
    const providerDiagnostics = getAuthProviderDiagnosticsSnapshot();
    const routeDiagnostics = getAppNextAuthRouteMatrixDiagnostics();
    if (screen === "settings-readonly") {
      recordAppNextSettingsReadOnlyDiagnostics({
        currentRoute,
        readOnlyMode: true,
        settingControlCount: 0,
        writeControlCount: 0,
        writeAttemptCount: 0,
        sensitiveValueDetected,
        requireAuthMode,
        protectedRouteMode,
        requireWorkspaceRoleMode,
      });
    } else {
      recordAppNextAccountDiagnostics({
        loading: policy.reason === "loading",
        errorCode: error?.code ?? (policy.reason === "active" ? "none" : policy.reason),
        accountRenderCount,
        accountReadCount: 0,
        accountWriteAttemptCount: 0,
        accountListenerStartCount: 0,
        accountActiveListenerCount: 0,
        isAuthenticated: policy.isAuthenticated,
        accountStatus: session?.status ?? policy.reason,
        emailVerified: emailVerified === true,
        providerCategory,
        providerCount: providerIds.length,
        persistenceMode,
        globalRoleCategory: policy.globalRoleCategory,
        workspaceRoleCategory: policy.workspaceRoleCategory,
        hasWorkspace: policy.hasWorkspace,
        isSystemOwner: policy.isSystemOwner,
        warningCount: warningCodes.length,
        maskedEmailPresent: maskedEmail !== "-",
        sensitiveValueDetected,
        authListenerCount: providerDiagnostics.authStateListenerCount,
        workspaceListenerCount: 0,
        currentRoute,
        requestedRoute,
        restoreConflictDetected: routeDiagnostics.restoreConflictDetected,
      });
    }
  }, [
    currentRoute,
    emailVerified,
    error?.code,
    maskedEmail,
    persistenceMode,
    policy.globalRoleCategory,
    policy.hasWorkspace,
    policy.isAuthenticated,
    policy.isSystemOwner,
    policy.reason,
    policy.workspaceRoleCategory,
    protectedRouteMode,
    providerCategory,
    providerIds.length,
    requestedRoute,
    requireAuthMode,
    requireWorkspaceRoleMode,
    screen,
    sensitiveValueDetected,
    session?.status,
    warningCodes.length,
  ]);

  if (!policy.canRender) {
    return (
      <section className="app-next-panel">
        <p className="app-next-muted-label">App Next 읽기 전용 계정·설정 Pilot</p>
        <h2>계정 상태 확인 필요</h2>
        <p>현재 계정 상태에서는 이 읽기 전용 화면을 표시하지 않습니다. 로그인 세션은 유지됩니다.</p>
        <dl>
          <ValueRow label="phase" value={phase} />
          <ValueRow label="reason" value={policy.reason} />
          <ValueRow label="status" value={session?.status ?? policy.reason} />
        </dl>
      </section>
    );
  }

  if (screen === "settings-readonly") {
    return (
      <section className="app-next-panel">
        <p className="app-next-muted-label">App Next 읽기 전용 계정·설정 Pilot</p>
        <h2>설정 요약</h2>
        <p>이 화면은 현재 적용 상태만 표시합니다. 저장, 적용, 변경 기능은 제공하지 않습니다.</p>
        <dl>
          <ValueRow label="현재 인증 시스템" value="new AuthProvider" />
          <ValueRow label="RequireAuth mode" value={requireAuthMode} />
          <ValueRow label="ProtectedRoute mode" value={protectedRouteMode} />
          <ValueRow label="RequireWorkspaceRole mode" value={requireWorkspaceRoleMode} />
          <ValueRow label="로그인 유지 상태" value={persistenceMode} />
          <ValueRow label="로그인 제공자" value={providerCategory} />
          <ValueRow label="이메일 인증" value={verificationStatusLabel(emailVerified)} />
          <ValueRow label="운영 정적 앱" value="분리 유지" />
          <ValueRow label="쓰기 컨트롤" value="0" />
        </dl>
        <div className="app-next-actions app-next-readonly-actions">
          <button type="button" className="secondary" onClick={() => onNavigate("dashboard")}>
            대시보드
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("devices")}>
            로그인 기기
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("notifications")}>
            알림
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="app-next-dashboard-grid">
      <section className="app-next-panel">
        <p className="app-next-muted-label">App Next 읽기 전용 계정·설정 Pilot</p>
        <h2>계정 상태</h2>
        <dl>
          <ValueRow label="authenticated" value={booleanLabel(policy.isAuthenticated)} />
          <ValueRow label="status" value={session?.status ?? policy.reason} />
          <ValueRow label="emailVerified" value={verificationStatusLabel(emailVerified)} />
          <ValueRow label="로그인 제공자" value={providerCategory} />
          <ValueRow label="session persistence" value={persistenceMode} />
          <ValueRow label="이메일" value={maskedEmail} />
          <ValueRow label="warnings 개수" value={String(warningCodes.length)} />
        </dl>
        {emailVerified === false ? (
          <p className="app-next-message">이메일 인증이 필요합니다. 이 읽기 전용 화면에서는 인증 메일을 발송하지 않습니다.</p>
        ) : null}
      </section>

      <section className="app-next-panel">
        <h2>역할 및 워크스페이스</h2>
        <dl>
          <ValueRow label="isSystemOwner" value={booleanLabel(policy.isSystemOwner)} />
          <ValueRow label="global role" value={policy.globalRoleCategory} />
          <ValueRow label="workspace role" value={policy.workspaceRoleCategory} />
          <ValueRow label="workspace 존재" value={booleanLabel(policy.hasWorkspace)} />
          <ValueRow label="workspace 이름" value="이번 파일럿에서는 추가 조회 없이 표시하지 않음" />
        </dl>
        {!policy.hasWorkspace ? (
          <p className="app-next-message">현재 선택된 워크스페이스가 없습니다. 계정 화면은 유지하고 자동 선택은 하지 않습니다.</p>
        ) : null}
      </section>

      <section className="app-next-panel">
        <h2>보안 설정 상태</h2>
        <dl>
          <ValueRow label="이메일 변경" value="읽기 전용 화면에서 지원하지 않음" />
          <ValueRow label="비밀번호 변경" value="읽기 전용 화면에서 지원하지 않음" />
          <ValueRow label="계정 삭제" value="읽기 전용 화면에서 지원하지 않음" />
          <ValueRow label="로그인 유지 변경" value="읽기 전용 화면에서 지원하지 않음" />
          <ValueRow label="Auth write" value="0" />
          <ValueRow label="Firestore read/write/listener" value="0 / 0 / 0" />
        </dl>
      </section>

      <section className="app-next-panel">
        <h2>관련 화면</h2>
        <p>기기 목록과 알림 목록은 별도 읽기 전용 화면에서 확인합니다. 이 계정 화면은 상태 요약만 담당합니다.</p>
        <div className="app-next-actions app-next-readonly-actions">
          <button type="button" className="secondary" onClick={() => onNavigate("dashboard")}>
            대시보드
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("devices")}>
            로그인 기기 보기
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("notifications")}>
            알림 보기
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("notices")}>
            공지 보기
          </button>
        </div>
      </section>
    </div>
  );
}
