import {
  useMemo,
  useState,
} from "react";
import type {
  AccountStatus,
  AuthPhase,
} from "../auth/authTypes";
import {
  decideLoginBridgeAccess,
  loginBridgeStatusMessage,
  loginPersistenceModeForRemember,
  type LoginBridgeMode,
} from "../pages/loginBridgeUtils";

type PreviewState =
  | "signed_out"
  | "loading"
  | "active"
  | "active_workspace_null"
  | "pending"
  | "rejected"
  | "disabled"
  | "error"
  | "system_owner";

interface LoginBridgePreviewAppProps {
  mode: LoginBridgeMode;
  flagEnabled: boolean;
}

function previewToSession(
  state: PreviewState,
): {
  phase: AuthPhase;
  isAuthenticated: boolean;
  status: AccountStatus | null;
  hasCurrentWorkspaceId: boolean;
  isSystemOwner: boolean;
  hasSessionError: boolean;
} {
  switch (state) {
    case "loading":
      return {
        phase: "loading_session",
        isAuthenticated: false,
        status: null,
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "active":
      return {
        phase: "authenticated",
        isAuthenticated: true,
        status: "active",
        hasCurrentWorkspaceId: true,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "active_workspace_null":
      return {
        phase: "authenticated",
        isAuthenticated: true,
        status: "active",
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "pending":
      return {
        phase: "account_action_required",
        isAuthenticated: true,
        status: "pending",
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "rejected":
      return {
        phase: "account_action_required",
        isAuthenticated: true,
        status: "rejected",
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "disabled":
      return {
        phase: "account_action_required",
        isAuthenticated: true,
        status: "disabled",
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
    case "error":
      return {
        phase: "error",
        isAuthenticated: true,
        status: "active",
        hasCurrentWorkspaceId: true,
        isSystemOwner: false,
        hasSessionError: true,
      };
    case "system_owner":
      return {
        phase: "authenticated",
        isAuthenticated: true,
        status: "active",
        hasCurrentWorkspaceId: false,
        isSystemOwner: true,
        hasSessionError: false,
      };
    case "signed_out":
    default:
      return {
        phase: "signed_out",
        isAuthenticated: false,
        status: null,
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
        hasSessionError: false,
      };
  }
}

function valueOrDash(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return value && String(value).trim() !== "" ? String(value) : "-";
}

export function LoginBridgePreviewApp({
  mode,
  flagEnabled,
}: LoginBridgePreviewAppProps) {
  const [previewState, setPreviewState] = useState<PreviewState>("signed_out");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sessionState = previewToSession(previewState);
  const decision = useMemo(() => decideLoginBridgeAccess({
    mode,
    ...sessionState,
    isSubmitting: submitting,
  }), [
    mode,
    sessionState,
    submitting,
  ]);
  const message = loginBridgeStatusMessage(decision);

  return (
    <main style={{
      minHeight: "100vh",
      padding: 24,
      background: "#f3f6fb",
      color: "#0f172a",
      fontFamily: "system-ui, sans-serif",
    }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ color: "#2563eb", fontWeight: 700 }}>Development only</p>
        <h1>Login 신규 AuthProvider 병행 미리보기</h1>
        <p>
          이 화면은 실제 운영 라우팅을 바꾸지 않고 로그인 branch의 판정과 로그인 유지 정책만 비교합니다.
        </p>
      </header>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
      }}>
        <article style={{ padding: 20, border: "1px solid #d8e2f3", borderRadius: 12, background: "#fff" }}>
          <h2>입력 상태</h2>
          <label>
            모드
            <input readOnly value={mode} style={{ width: "100%", marginTop: 8 }} />
          </label>
          <label>
            mock 상태
            <select
              value={previewState}
              onChange={(event) => setPreviewState(event.target.value as PreviewState)}
              style={{ width: "100%", marginTop: 8 }}
            >
              <option value="signed_out">signed out</option>
              <option value="loading">loading</option>
              <option value="active">active</option>
              <option value="active_workspace_null">active + workspace null</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
              <option value="disabled">disabled</option>
              <option value="error">error</option>
              <option value="system_owner">system_owner</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(event) => setRememberLogin(event.target.checked)}
            />
            로그인 유지
          </label>
          <label style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={submitting}
              onChange={(event) => setSubmitting(event.target.checked)}
            />
            로그인 제출 중
          </label>
        </article>

        <article style={{ padding: 20, border: "1px solid #d8e2f3", borderRadius: 12, background: "#fff" }}>
          <h2>판정 결과</h2>
          <dl>
            <dt>feature flag</dt>
            <dd>{valueOrDash(flagEnabled)}</dd>
            <dt>phase</dt>
            <dd>{sessionState.phase}</dd>
            <dt>status</dt>
            <dd>{valueOrDash(sessionState.status)}</dd>
            <dt>isAuthenticated</dt>
            <dd>{valueOrDash(sessionState.isAuthenticated)}</dd>
            <dt>workspace 존재</dt>
            <dd>{valueOrDash(sessionState.hasCurrentWorkspaceId)}</dd>
            <dt>system_owner</dt>
            <dd>{valueOrDash(sessionState.isSystemOwner)}</dd>
            <dt>decision</dt>
            <dd>{decision.state} / {decision.reason}</dd>
            <dt>destination</dt>
            <dd>{decision.destination ?? "-"}</dd>
            <dt>submit disabled</dt>
            <dd>{valueOrDash(decision.disableSubmit)}</dd>
            <dt>persistence</dt>
            <dd>{loginPersistenceModeForRemember(rememberLogin)}</dd>
          </dl>
          {message ? <p role="status">{message}</p> : null}
        </article>
      </section>

      <section style={{ marginTop: 16, padding: 20, border: "1px solid #d8e2f3", borderRadius: 12, background: "#fff" }}>
        <h2>안전 조건</h2>
        <p>
          기본 preview는 mock 세션만 사용하며 Firestore write, 자동 signOut, 사용자 문서 보정, membership 생성이 없습니다.
        </p>
        <p>롤백: <code>?newAuthLogin=off</code></p>
      </section>
    </main>
  );
}
