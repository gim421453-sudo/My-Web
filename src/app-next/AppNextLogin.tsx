import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import {
  useAuth,
} from "../auth/useAuth";
import {
  auth,
} from "../lib/firebase";
import {
  safeLoginErrorMessage,
} from "../pages/loginBridgeUtils";
import {
  safeGoogleLoginErrorMessage,
} from "./appNextUtils";
import {
  recordAppNextPersistence,
} from "./appNextDiagnostics";

function persistenceErrorKind(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  if (code.includes("unsupported-persistence")) return "unsupported-persistence";
  if (code.includes("quota")) return "quota";
  if (code.includes("permission")) return "permission";
  if (code.includes("network")) return "network";
  return code || "unknown";
}

function statusMessageForLoginState(
  phase: ReturnType<typeof useAuth>["phase"],
  status: string | null | undefined,
  hasError: boolean,
): string {
  if (phase === "initializing" || phase === "loading_session") {
    return "세션을 확인하는 중입니다.";
  }

  if (phase === "account_action_required" || status === "pending") {
    return "계정 승인 대기 중입니다. 자동 로그아웃하지 않습니다.";
  }

  if (status === "rejected") {
    return "계정 승인이 거절되었습니다. 자동 로그아웃하지 않습니다.";
  }

  if (status === "disabled") {
    return "비활성화된 계정입니다. 자동 로그아웃하지 않습니다.";
  }

  if (phase === "error" || hasError) {
    return "계정 정보를 확인하는 중 문제가 발생했습니다. 자동 로그아웃하지 않습니다.";
  }

  return "";
}

function persistenceLabel(rememberLogin: boolean): string {
  return rememberLogin ? "local" : "session";
}

export function AppNextLogin() {
  const {
    phase,
    session,
    error,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<"google" | "email" | null>(null);
  const [loginError, setLoginError] = useState("");

  const isCheckingSession = phase === "initializing" || phase === "loading_session";
  const isSignedOut = phase === "signed_out";
  const canShowEnabledForm = isSignedOut || phase === "error" || isCheckingSession;
  const disableSubmit = Boolean(submittingMode) || isCheckingSession;
  const statusMessage = useMemo(
    () => statusMessageForLoginState(phase, session?.status, Boolean(error)),
    [
      error,
      phase,
      session?.status,
    ],
  );

  const preparePersistence = useCallback(async (provider: "google" | "email") => {
    const requested = rememberLogin ? "local" : "session";
    try {
      await setPersistence(
        auth,
        rememberLogin
          ? browserLocalPersistence
          : browserSessionPersistence,
      );
      recordAppNextPersistence(requested, requested, provider, true, "none");
    } catch (persistenceError) {
      recordAppNextPersistence(
        requested,
        "unknown",
        provider,
        false,
        persistenceErrorKind(persistenceError),
      );
      throw persistenceError;
    }
  }, [rememberLogin]);

  const handleGoogleLogin = useCallback(async () => {
    if (submittingMode || isCheckingSession) return;

    setSubmittingMode("google");
    setLoginError("");

    try {
      await preparePersistence("google");
      await signInWithGoogle();
    } catch (submitError) {
      setLoginError(safeGoogleLoginErrorMessage(submitError));
    } finally {
      setSubmittingMode(null);
    }
  }, [
    isCheckingSession,
    preparePersistence,
    signInWithGoogle,
    submittingMode,
  ]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingMode || isCheckingSession) return;

    setSubmittingMode("email");
    setLoginError("");

    try {
      await preparePersistence("email");
      await signInWithEmail(email, password);
    } catch (submitError) {
      setLoginError(safeLoginErrorMessage(submitError));
    } finally {
      setSubmittingMode(null);
    }
  }, [
    email,
    isCheckingSession,
    password,
    preparePersistence,
    signInWithEmail,
    submittingMode,
  ]);

  if (false && isSignedOut) {
    return (
      <section className="app-next-panel app-next-login-panel">
        <h2>로그인이 필요합니다.</h2>
        <p>현재 시험 로그인 화면은 비활성화되어 있습니다.</p>
        {import.meta.env.DEV ? (
          <section className="app-next-diagnostics app-next-device-diagnostics">
            <h3>개발 전용 진단</h3>
            <dl>
              <dt>entry</dt>
              <dd>app-next</dd>
              <dt>screen</dt>
              <dd>login</dd>
              <dt>provider</dt>
              <dd>new</dd>
              <dt>legacy AuthContext mounted</dt>
              <dd>false</dd>
              <dt>feature flag</dt>
              <dd>off</dd>
              <dt>phase</dt>
              <dd>{phase}</dd>
              <dt>redirect target</dt>
              <dd>none</dd>
            </dl>
          </section>
        ) : null}
      </section>
    );
  }

  if (!canShowEnabledForm) {
    return null;
  }

  return (
    <section className="app-next-panel app-next-login-panel">
      <h2>app-next 로그인</h2>
      <p>이 화면은 신규 AuthProvider의 Google 로그인을 제한적으로 연결합니다.</p>

      <div
        className="app-next-login-form"
      >
        <label className="app-next-checkbox-row">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => setRememberLogin(event.target.checked)}
            disabled={disableSubmit}
          />
          <span>로그인 유지</span>
        </label>

        <button
          type="button"
          className="app-next-google-button"
          onClick={handleGoogleLogin}
          disabled={disableSubmit}
        >
          {submittingMode === "google" ? "Google 확인 중" : "Google로 로그인"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setShowEmailPassword((current) => !current)}
          disabled={disableSubmit}
        >
          이메일/비밀번호 고급 옵션
        </button>

        {showEmailPassword ? (
          <form
            className="app-next-email-password-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={disableSubmit}
                required
              />
            </label>

            <label>
              <span>비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={disableSubmit}
                required
              />
            </label>

            <button
              type="submit"
              disabled={disableSubmit}
            >
              {submittingMode === "email" ? "로그인 확인 중" : "이메일로 로그인"}
            </button>
          </form>
        ) : null}
      </div>

      {statusMessage ? <p className="app-next-message">{statusMessage}</p> : null}
      {loginError ? <p className="app-next-message app-next-error">{loginError}</p> : null}

      {import.meta.env.DEV ? (
        <section className="app-next-diagnostics app-next-device-diagnostics">
          <h3>개발 전용 진단</h3>
          <dl>
            <dt>entry</dt>
            <dd>app-next</dd>
            <dt>screen</dt>
            <dd>login</dd>
            <dt>provider</dt>
            <dd>new</dd>
            <dt>legacy AuthContext mounted</dt>
            <dd>false</dd>
            <dt>feature flag</dt>
            <dd>on</dd>
            <dt>phase</dt>
            <dd>{phase}</dd>
            <dt>status</dt>
            <dd>{session?.status ?? "-"}</dd>
            <dt>persistence mode</dt>
            <dd>{persistenceLabel(rememberLogin)}</dd>
            <dt>submit in progress</dt>
            <dd>{submittingMode ?? "false"}</dd>
            <dt>google provider prompt</dt>
            <dd>select_account</dd>
            <dt>Firestore write</dt>
            <dd>none</dd>
            <dt>automatic signOut</dt>
            <dd>none</dd>
            <dt>redirect target</dt>
            <dd>none</dd>
          </dl>
        </section>
      ) : null}
    </section>
  );
}
