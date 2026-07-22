import {
  useEffect,
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
  useNavigate,
} from "react-router-dom";

import {
  AuthProvider as NewAuthProvider,
} from "../auth/AuthProvider";
import {
  useAuth as useNewAuth,
} from "../auth/useAuth";
import {
  auth,
} from "../lib/firebase";
import {
  useAuth as useLegacyAuth,
} from "../context/AuthContext";
import {
  currentSearchFromDocument,
} from "../auth/legacy/guards/requireAuthBridgeUtils";
import {
  LOGIN_PERSISTENCE_MODE_KEY,
  LOGIN_REMEMBER_KEY,
  LOGIN_TAB_APPROVED_KEY,
  decideLoginBridgeAccess,
  loginBridgeModeForFlag,
  loginBridgeStatusMessage,
  loginPersistenceModeForRemember,
  resolveNewAuthLoginFlag,
  safeLoginErrorMessage,
} from "./loginBridgeUtils";

interface LoginFormProps {
  email: string;
  password: string;
  rememberLogin?: boolean;
  loading: boolean;
  errorMessage: string | null;
  statusMessage?: string;
  onEmailChange(email: string): void;
  onPasswordChange(password: string): void;
  onRememberLoginChange?(remember: boolean): void;
  onSubmit(event: FormEvent): void;
}

function LoginForm({
  email,
  password,
  rememberLogin,
  loading,
  errorMessage,
  statusMessage,
  onEmailChange,
  onPasswordChange,
  onRememberLoginChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <input
        type="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="이메일"
        autoComplete="email"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
        required
      />

      {onRememberLoginChange ? (
        <label>
          <input
            type="checkbox"
            checked={Boolean(rememberLogin)}
            onChange={(event) => onRememberLoginChange(event.target.checked)}
          />
          로그인 유지
        </label>
      ) : null}

      <button
        type="submit"
        disabled={loading}
      >
        {loading ? "로그인 확인 중..." : "로그인"}
      </button>

      {statusMessage ? (
        <p role="status">{statusMessage}</p>
      ) : null}

      {errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : null}
    </form>
  );
}

function LegacyLoginBranch() {
  const navigate = useNavigate();
  const {
    login,
    loading,
    authError,
  } = useLegacyAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await login(email, password);
      navigate("/");
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  return (
    <LoginForm
      email={email}
      password={password}
      loading={loading}
      errorMessage={authError}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}

function readRememberLogin(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(LOGIN_REMEMBER_KEY) === "true";
}

function applyLoginStorageState(rememberLogin: boolean): void {
  const mode = loginPersistenceModeForRemember(rememberLogin);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(LOGIN_PERSISTENCE_MODE_KEY, mode);
    if (!rememberLogin) {
      sessionStorage.setItem(LOGIN_TAB_APPROVED_KEY, "true");
    }
  }

  if (typeof localStorage !== "undefined") {
    if (rememberLogin) {
      localStorage.setItem(LOGIN_REMEMBER_KEY, "true");
      localStorage.setItem(LOGIN_PERSISTENCE_MODE_KEY, mode);
    } else {
      localStorage.removeItem(LOGIN_REMEMBER_KEY);
      localStorage.removeItem(LOGIN_PERSISTENCE_MODE_KEY);
    }
  }
}

function clearSignedOutLoginStorageState(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(LOGIN_TAB_APPROVED_KEY);
    sessionStorage.removeItem(LOGIN_PERSISTENCE_MODE_KEY);
  }

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LOGIN_REMEMBER_KEY);
    localStorage.removeItem(LOGIN_PERSISTENCE_MODE_KEY);
  }
}

function NewLoginBranch() {
  const navigate = useNavigate();
  const {
    phase,
    session,
    error,
    signInWithEmail,
  } = useNewAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(readRememberLogin);
  const [submitting, setSubmitting] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const decision = useMemo(() => decideLoginBridgeAccess({
    mode: "new",
    phase,
    isAuthenticated: Boolean(session?.isAuthenticated),
    status: session?.status ?? null,
    hasCurrentWorkspaceId: Boolean(session?.currentWorkspaceId),
    isSystemOwner: Boolean(session?.isSystemOwner),
    isSubmitting: submitting,
    hasSessionError: Boolean(error),
  }), [
    error,
    phase,
    session,
    submitting,
  ]);

  useEffect(() => {
    if (phase === "signed_out" && !submitting && !loginAttempted) {
      clearSignedOutLoginStorageState();
    }
  }, [
    loginAttempted,
    phase,
    submitting,
  ]);

  useEffect(() => {
    if (decision.destination) {
      navigate(decision.destination, { replace: true });
    }
  }, [
    decision.destination,
    navigate,
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setLoginAttempted(true);
    setLoginError(null);

    try {
      await setPersistence(
        auth,
        rememberLogin
          ? browserLocalPersistence
          : browserSessionPersistence,
      );
      applyLoginStorageState(rememberLogin);
      await signInWithEmail(email, password);
    } catch (submitError) {
      setLoginError(safeLoginErrorMessage(submitError));
      setLoginAttempted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const statusMessage =
    loginBridgeStatusMessage(decision);

  if (!decision.showForm) {
    return (
      <section>
        <p role="status">{statusMessage}</p>
        {error ? (
          <p role="alert">
            계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <LoginForm
      email={email}
      password={password}
      rememberLogin={rememberLogin}
      loading={decision.disableSubmit}
      errorMessage={loginError}
      statusMessage={statusMessage}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onRememberLoginChange={setRememberLogin}
      onSubmit={handleSubmit}
    />
  );
}

export default function LoginPage() {
  const mode = loginBridgeModeForFlag(resolveNewAuthLoginFlag({
    search: currentSearchFromDocument(),
    envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_LOGIN,
    isDev: import.meta.env.DEV,
  }));

  if (mode === "new") {
    return (
      <NewAuthProvider>
        <NewLoginBranch />
      </NewAuthProvider>
    );
  }

  return <LegacyLoginBranch />;
}
