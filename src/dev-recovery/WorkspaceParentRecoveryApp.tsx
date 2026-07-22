import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApps } from "firebase/app";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../auth/useAuth";
import { app, auth } from "../lib/firebase";
import {
  executeWorkspaceParentRecoveryOnce,
  readRecoverySessionGateEvidence,
  runWorkspaceParentRecoveryPreflight,
  runWorkspaceParentRecoveryDryRun,
} from "./workspaceParentRecoveryService";
import {
  ALLOW_REAL_RECOVERY,
  DEFAULT_RECOVERY_WORKSPACE_NAME,
  REAL_RECOVERY_CONFIRMATION_PHRASE,
  canExecuteRealRecovery,
  canRunRecoveryDryRun,
  isRealRecoveryExecutionEnabled,
  isDevelopmentHost,
  recoveryCoopWarningDisposition,
  recoveryExecutionGateFailureReasons,
  recoveryFingerprint,
  recoverySessionGateFailureKind,
  type RecoveryExecutionReceipt,
  type RecoveryDryRunResult,
  type RecoveryFieldProposal,
  type RecoveryGooglePopupResult,
  type RecoverySessionGateFailureKind,
} from "./workspaceParentRecoveryUtils";
import "./styles.css";

const RECOVERY_EXECUTION_SESSION_KEY = "pm:dev-recovery:parent-executed:v1";

type RecoveryAuthInitializationState =
  | "initializing"
  | "observer-waiting"
  | "restored"
  | "signed-out"
  | "error";

interface RecoveryAuthDiagnostics {
  authInitializationState: RecoveryAuthInitializationState;
  authObserverInitialCallbackReceived: boolean;
  authCurrentUserPresent: boolean;
  authPersistenceRestoreCompleted: boolean;
  firebaseAppName: string;
  firebaseAppCount: number;
  firebaseProjectFingerprint: string;
  authUserFingerprint: string;
  appSessionLoaded: boolean;
  phase: string;
  status: string;
  isSystemOwner: boolean;
  reloadSessionRequestedCount: number;
  reloadSessionCompletedCount: number;
  googlePopupResult: RecoveryGooglePopupResult;
  coopWarningDisposition: string;
  sessionGateFailureKind: RecoverySessionGateFailureKind;
  usersCurrentWorkspacePresent: boolean;
  targetWorkspaceFingerprint: string;
}

function initialRecoveryAuthDiagnostics(): RecoveryAuthDiagnostics {
  return {
    authInitializationState: "initializing",
    authObserverInitialCallbackReceived: false,
    authCurrentUserPresent: Boolean(auth.currentUser),
    authPersistenceRestoreCompleted: false,
    firebaseAppName: app.name,
    firebaseAppCount: getApps().length,
    firebaseProjectFingerprint: "-",
    authUserFingerprint: "-",
    appSessionLoaded: false,
    phase: "initializing",
    status: "-",
    isSystemOwner: false,
    reloadSessionRequestedCount: 0,
    reloadSessionCompletedCount: 0,
    googlePopupResult: "idle",
    coopWarningDisposition: "none",
    sessionGateFailureKind: "auth-initializing",
    usersCurrentWorkspacePresent: false,
    targetWorkspaceFingerprint: "-",
  };
}

async function waitForRecoveryAuthInitialState(): Promise<boolean> {
  const authWithReady = auth as typeof auth & {
    authStateReady?: () => Promise<void>;
  };

  if (typeof authWithReady.authStateReady === "function") {
    await authWithReady.authStateReady();
    return Boolean(auth.currentUser);
  }

  return new Promise((resolve) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        unsubscribe?.();
        resolve(Boolean(nextUser));
      },
      () => {
        unsubscribe?.();
        resolve(Boolean(auth.currentUser));
      },
    );
  });
}

function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function recoveryReceiptServerVerified(receipt: RecoveryExecutionReceipt): boolean {
  return receipt.parentWriteRequested
    && receipt.parentWriteCommitted
    && receipt.parentServerConfirmed
    && receipt.parentWorkspaceExistsAfterWrite
    && receipt.serverReadSucceededAfterWrite
    && receipt.workspaceFingerprintMatches
    && receipt.ownerFingerprintMatches
    && receipt.statusMatches
    && receipt.nameMatches
    && receipt.displayNameMatches
    && receipt.usersCurrentWorkspaceUnchanged
    && receipt.canonicalMembershipStillExists
    && receipt.canonicalMembershipUnchanged
    && receipt.legacyMembershipUnchanged
    && receipt.childCountsUnchanged
    && receipt.membershipWriteCount === 0
    && receipt.usersWriteCount === 0
    && receipt.childWriteCount === 0;
}

function FieldTable({
  fields,
}: {
  fields: RecoveryFieldProposal[];
}) {
  if (!fields.length) {
    return <p className="recovery-muted">No proposed fields.</p>;
  }

  return (
    <table className="recovery-table">
      <thead>
        <tr>
          <th>field</th>
          <th>summary</th>
          <th>source</th>
          <th>confidence</th>
          <th>category</th>
          <th>include</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.fieldName}>
            <td>{field.fieldName}</td>
            <td>{field.proposedValueSummary}</td>
            <td>{field.evidenceSource}</td>
            <td>{field.confidence}</td>
            <td>{field.category}</td>
            <td>{field.includeInRecovery ? "yes" : "no"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WorkspaceParentRecoveryApp() {
  const {
    phase,
    session,
    error,
    reloadSession,
    signInWithGoogle,
  } = useAuth();
  const [result, setResult] = useState<RecoveryDryRunResult | null>(null);
  const [receipt, setReceipt] = useState<RecoveryExecutionReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionInProgress, setExecutionInProgress] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmedWorkspaceName, setConfirmedWorkspaceName] = useState(DEFAULT_RECOVERY_WORKSPACE_NAME);
  const [confirmedDisplayName, setConfirmedDisplayName] = useState(DEFAULT_RECOVERY_WORKSPACE_NAME);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [payloadPreviewConfirmed, setPayloadPreviewConfirmed] = useState(false);
  const [executeRequestedCount, setExecuteRequestedCount] = useState(0);
  const [executeCompletedCount, setExecuteCompletedCount] = useState(0);
  const [executionLocked, setExecutionLocked] = useState(
    () => window.sessionStorage.getItem(RECOVERY_EXECUTION_SESSION_KEY) === "true",
  );
  const [authDiagnostics, setAuthDiagnostics] = useState<RecoveryAuthDiagnostics>(
    () => initialRecoveryAuthDiagnostics(),
  );
  const isDevHost = isDevelopmentHost(window.location.hostname);
  const isExecutionHost = window.location.hostname === "127.0.0.1";
  const status = session?.status ?? "-";
  const currentWorkspaceId = session?.currentWorkspaceId ?? null;
  const isSystemOwner = Boolean(session?.isSystemOwner);
  const appSessionLoaded = Boolean(session);
  const usersCurrentWorkspacePresent = authDiagnostics.usersCurrentWorkspacePresent
    || Boolean(session?.workspaceResolution?.serverCurrentWorkspacePresent)
    || Boolean(currentWorkspaceId);

  useEffect(() => {
    let cancelled = false;

    setAuthDiagnostics((previous) => ({
      ...previous,
      authInitializationState: "observer-waiting",
      firebaseAppName: app.name,
      firebaseAppCount: getApps().length,
    }));

    void Promise.all([
      recoveryFingerprint("project", String(app.options.projectId || "")),
      waitForRecoveryAuthInitialState(),
    ]).then(async ([projectFingerprint, hasAuthUser]) => {
      const authUserFingerprint = await recoveryFingerprint("auth-user", auth.currentUser?.uid);
      if (cancelled) return;

      setAuthReady(true);
      setAuthDiagnostics((previous) => ({
        ...previous,
        authInitializationState: hasAuthUser ? "restored" : "signed-out",
        authObserverInitialCallbackReceived: true,
        authCurrentUserPresent: Boolean(auth.currentUser),
        authPersistenceRestoreCompleted: true,
        firebaseAppName: app.name,
        firebaseAppCount: getApps().length,
        firebaseProjectFingerprint: projectFingerprint,
        authUserFingerprint,
      }));
    }).catch(() => {
      if (cancelled) return;
      setAuthReady(true);
      setAuthDiagnostics((previous) => ({
        ...previous,
        authInitializationState: "error",
        authObserverInitialCallbackReceived: true,
        authCurrentUserPresent: Boolean(auth.currentUser),
        authPersistenceRestoreCompleted: true,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const gateInput = useMemo(() => ({
    authReady,
    phase,
    status,
    authUserPresent: Boolean(auth.currentUser),
    appSessionLoaded,
    isSystemOwner,
    currentWorkspaceId: usersCurrentWorkspacePresent ? "users-current-workspace-present" : currentWorkspaceId,
    targetWorkspaceFingerprint: authDiagnostics.targetWorkspaceFingerprint || result?.targetWorkspaceFingerprint,
    expectedWorkspaceFingerprint: authDiagnostics.targetWorkspaceFingerprint || result?.targetWorkspaceFingerprint,
    writeApiDisabled: ALLOW_REAL_RECOVERY === false,
    sessionErrorPresent: Boolean(error),
  }), [
    appSessionLoaded,
    authDiagnostics.targetWorkspaceFingerprint,
    authReady,
    currentWorkspaceId,
    error,
    isSystemOwner,
    phase,
    result?.targetWorkspaceFingerprint,
    status,
    usersCurrentWorkspacePresent,
  ]);

  const sessionGateFailureKind = recoverySessionGateFailureKind(gateInput);
  const dryRunAllowed = canRunRecoveryDryRun(gateInput);
  const baseRealRecoveryEnabled = isRealRecoveryExecutionEnabled({
    isDevelopment: import.meta.env.DEV,
    envFlag: import.meta.env.VITE_ALLOW_REAL_WORKSPACE_PARENT_RECOVERY === "true",
  });
  const realRecoveryEnabled = baseRealRecoveryEnabled && !executionLocked;
  const executionGateInput = useMemo(() => ({
    isDevelopment: import.meta.env.DEV,
    isLocalHost: isExecutionHost,
    authenticated: phase === "authenticated" && Boolean(auth.currentUser),
    status,
    isSystemOwner,
    sameFirebaseProject: Boolean(result?.sameFirebaseProject),
    targetWorkspaceMatchesUsersCurrentWorkspace: Boolean(result?.targetWorkspaceFingerprint && authDiagnostics.targetWorkspaceFingerprint === result.targetWorkspaceFingerprint),
    parentWorkspaceExists: Boolean(result?.parentWorkspaceExists),
    childDataExists: Boolean(result && result.childCollectionCounts.some((item) => item.count > 0)),
    canonicalMembershipExists: Boolean(result?.canonicalMembershipExists),
    confirmedWorkspaceName,
    confirmedDisplayName,
    payloadPreviewConfirmed,
    confirmationPhrase,
    realRecoveryEnabled,
  }), [
    authDiagnostics.targetWorkspaceFingerprint,
    confirmationPhrase,
    confirmedDisplayName,
    confirmedWorkspaceName,
    isExecutionHost,
    isSystemOwner,
    payloadPreviewConfirmed,
    phase,
    result,
    realRecoveryEnabled,
    status,
  ]);
  const executionGateFailureReasons = recoveryExecutionGateFailureReasons(executionGateInput);
  const executionAllowed = canExecuteRealRecovery(executionGateInput);

  useEffect(() => {
    void Promise.all([
      recoveryFingerprint("auth-user", auth.currentUser?.uid),
      auth.currentUser
        ? readRecoverySessionGateEvidence()
        : Promise.resolve({
          authUserPresent: false,
          usersCurrentWorkspacePresent: false,
          targetWorkspaceFingerprint: "-",
        }),
    ]).then(([authUserFingerprint, gateEvidence]) => {
      setAuthDiagnostics((previous) => {
        const coopWarningDisposition = recoveryCoopWarningDisposition({
          googlePopupResult: previous.googlePopupResult,
          authUserPresentAfterPopup: Boolean(auth.currentUser),
          sessionResolvedAfterPopup: appSessionLoaded,
        });

        return {
          ...previous,
          authCurrentUserPresent: Boolean(auth.currentUser),
          authUserFingerprint,
          appSessionLoaded,
          phase,
          status,
          isSystemOwner,
          coopWarningDisposition,
          sessionGateFailureKind,
          usersCurrentWorkspacePresent: gateEvidence.usersCurrentWorkspacePresent,
          targetWorkspaceFingerprint: gateEvidence.targetWorkspaceFingerprint,
        };
      });
    });
  }, [
    appSessionLoaded,
    isSystemOwner,
    phase,
    sessionGateFailureKind,
    status,
  ]);

  const runDryRun = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!dryRunAllowed) {
        setMessage(`Dry-run is blocked: ${sessionGateFailureKind}`);
        return;
      }
      const next = await runWorkspaceParentRecoveryPreflight({
        confirmedWorkspaceName,
        confirmedDisplayName,
      });
      setResult(next);
      setPayloadPreviewConfirmed(false);
      setReceipt(null);
      setMessage("Final preflight completed. No writes were executed.");
    } catch (dryRunError) {
      setMessage(safeMessage(dryRunError));
    } finally {
      setLoading(false);
    }
  };

  const runReadOnlyDryRun = async () => {
    setLoading(true);
    setMessage("");
    try {
      const next = await runWorkspaceParentRecoveryDryRun();
      setResult(next);
      setPayloadPreviewConfirmed(false);
      setReceipt(null);
      setMessage("Read-only dry-run completed. No writes were executed.");
    } catch (dryRunError) {
      setMessage(safeMessage(dryRunError));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRecoveryOnce = async () => {
    setExecutionInProgress(true);
    setMessage("");
    setExecuteRequestedCount((count) => count + 1);

    try {
      if (!executionAllowed) {
        setMessage(`Execution is blocked: ${executionGateFailureReasons.join(", ")}`);
        return;
      }
      const confirmed = window.confirm([
        "Create exactly one parent workspace document only.",
        "users, membership, child collections, and Rules will not be changed.",
      ].join("\n"));
      if (!confirmed) {
        setMessage("Execution cancelled.");
        return;
      }
      const nextReceipt = await executeWorkspaceParentRecoveryOnce({
        confirmedWorkspaceName,
        confirmedDisplayName,
        confirmationPhrase,
      });
      setReceipt(nextReceipt);
      setExecuteCompletedCount((count) => count + 1);
      const serverVerified = recoveryReceiptServerVerified(nextReceipt);
      if (serverVerified) {
        window.sessionStorage.setItem(RECOVERY_EXECUTION_SESSION_KEY, "true");
        setExecutionLocked(true);
      }
      await reloadSession();
      setMessage(serverVerified
        ? "Parent workspace recovery completed and server-confirmed. This session is now locked against re-execution."
        : "Parent workspace write finished, but server verification did not fully pass. Do not retry automatically.");
    } catch (executeError) {
      setMessage(safeMessage(executeError));
    } finally {
      setExecutionInProgress(false);
    }
  };

  const handleReloadSession = async () => {
    setLoading(true);
    setMessage("");
    setAuthDiagnostics((previous) => ({
      ...previous,
      reloadSessionRequestedCount: previous.reloadSessionRequestedCount + 1,
      authInitializationState: previous.authPersistenceRestoreCompleted
        ? previous.authInitializationState
        : "observer-waiting",
    }));

    try {
      await waitForRecoveryAuthInitialState();
      const authUserPresent = Boolean(auth.currentUser);
      if (!authUserPresent) {
        setMessage("Firebase Auth session was not restored. Use Google sign-in on this page.");
        setAuthDiagnostics((previous) => ({
          ...previous,
          authObserverInitialCallbackReceived: true,
          authCurrentUserPresent: false,
          authPersistenceRestoreCompleted: true,
          authInitializationState: "signed-out",
          sessionGateFailureKind: "signed-out",
        }));
        return;
      }

      await reloadSession();
      setAuthDiagnostics((previous) => ({
        ...previous,
        reloadSessionCompletedCount: previous.reloadSessionCompletedCount + 1,
        authCurrentUserPresent: Boolean(auth.currentUser),
        authPersistenceRestoreCompleted: true,
      }));
      setMessage("Session reloaded from the current Firebase Auth user.");
    } catch (reloadError) {
      setMessage(safeMessage(reloadError));
      setAuthDiagnostics((previous) => ({
        ...previous,
        sessionGateFailureKind: "session-load-failed",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");
    setAuthDiagnostics((previous) => ({
      ...previous,
      googlePopupResult: "pending",
    }));

    try {
      await signInWithGoogle();
      await waitForRecoveryAuthInitialState();
      await reloadSession();
      setAuthReady(true);
      setAuthDiagnostics((previous) => {
        const next = {
          ...previous,
          googlePopupResult: "success" as const,
          authObserverInitialCallbackReceived: true,
          authCurrentUserPresent: Boolean(auth.currentUser),
          authPersistenceRestoreCompleted: true,
          reloadSessionCompletedCount: previous.reloadSessionCompletedCount + 1,
        };

        return {
          ...next,
          coopWarningDisposition: recoveryCoopWarningDisposition({
            googlePopupResult: next.googlePopupResult,
            authUserPresentAfterPopup: next.authCurrentUserPresent,
            sessionResolvedAfterPopup: true,
          }),
        };
      });
      setMessage("Google sign-in completed. Session gate was refreshed.");
    } catch (loginError) {
      const code = typeof loginError === "object" && loginError && "code" in loginError
        ? String((loginError as { code?: unknown }).code || "")
        : "";
      const popupResult: RecoveryGooglePopupResult = code.includes("cancelled") || code.includes("popup-closed")
        ? "cancelled"
        : "failed";
      setAuthDiagnostics((previous) => ({
        ...previous,
        googlePopupResult: popupResult,
        coopWarningDisposition: "none",
      }));
      setMessage(popupResult === "cancelled"
        ? "Google sign-in was cancelled."
        : "Google sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setMessage("Dry-run JSON copied.");
  };

  if (!import.meta.env.DEV || !isDevHost) {
    return (
      <main className="recovery-shell">
        <section className="recovery-card recovery-error">
          <p>Development-only recovery dry-run</p>
          <h1>This page is disabled outside 127.0.0.1 development.</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="recovery-shell">
      <header className="recovery-header">
        <p>Development-only / read-only</p>
        <h1>Orphan Workspace Parent Recovery Dry Run</h1>
        <span className="recovery-badge">parent restore: {realRecoveryEnabled ? "enabled" : "disabled"}</span>
      </header>

      <section className="recovery-card">
        <h2>Session Gate</h2>
        <dl>
          <dt>phase</dt>
          <dd>{authReady ? phase : "loading"}</dd>
          <dt>status</dt>
          <dd>{status}</dd>
          <dt>isSystemOwner</dt>
          <dd>{String(isSystemOwner)}</dd>
          <dt>workspace failure</dt>
          <dd>{session?.workspaceResolution?.workspaceResolutionFailureKind ?? "-"}</dd>
          <dt>users.currentWorkspaceId present</dt>
          <dd>{String(usersCurrentWorkspacePresent)}</dd>
          <dt>auth error</dt>
          <dd>{error?.code ?? "-"}</dd>
          <dt>sessionGateFailureKind</dt>
          <dd>{sessionGateFailureKind}</dd>
        </dl>
        <div className="recovery-actions">
          <button type="button" onClick={runDryRun} disabled={loading || !dryRunAllowed}>
            {loading ? "Checking..." : "Run final preflight"}
          </button>
          <button type="button" className="secondary" onClick={runReadOnlyDryRun} disabled={loading}>
            Read-only dry-run
          </button>
          <button type="button" className="secondary" onClick={handleReloadSession} disabled={loading}>
            Reload session
          </button>
          <button type="button" className="secondary" onClick={handleGoogleLogin} disabled={loading}>
            Google sign-in
          </button>
          <button type="button" className="secondary" onClick={copyJson} disabled={!result || loading}>
            Copy dry-run JSON
          </button>
        </div>
        {!dryRunAllowed ? (
          <p className="recovery-muted">Dry-run blocked: {sessionGateFailureKind}</p>
        ) : null}
        {message ? <p className="recovery-message">{message}</p> : null}
      </section>

      <section className="recovery-card">
        <h2>Parent-only Preflight</h2>
        <p className="recovery-muted">
          This preflight prepares one parent workspace document only. It does not modify users, memberships, child collections, or Rules.
        </p>
        <div className="recovery-form-grid">
          <label>
            Workspace name
            <input
              value={confirmedWorkspaceName}
              onChange={(event) => setConfirmedWorkspaceName(event.target.value)}
              placeholder={DEFAULT_RECOVERY_WORKSPACE_NAME}
            />
          </label>
          <label>
            Display name
            <input
              value={confirmedDisplayName}
              onChange={(event) => setConfirmedDisplayName(event.target.value)}
              placeholder={DEFAULT_RECOVERY_WORKSPACE_NAME}
            />
          </label>
          <label className="recovery-form-wide">
            Confirmation phrase
            <input
              value={confirmationPhrase}
              onChange={(event) => setConfirmationPhrase(event.target.value)}
              placeholder={REAL_RECOVERY_CONFIRMATION_PHRASE}
            />
          </label>
        </div>
        <label className="recovery-check">
          <input
            type="checkbox"
            checked={payloadPreviewConfirmed}
            onChange={(event) => setPayloadPreviewConfirmed(event.target.checked)}
          />
          I confirmed the parent payload preview below.
        </label>
        <dl>
          <dt>ALLOW_REAL_RECOVERY</dt>
          <dd>{String(ALLOW_REAL_RECOVERY)}</dd>
          <dt>baseRealRecoveryEnabled</dt>
          <dd>{String(baseRealRecoveryEnabled)}</dd>
          <dt>realRecoveryEnabled</dt>
          <dd>{String(realRecoveryEnabled)}</dd>
          <dt>executionHost127Only</dt>
          <dd>{String(isExecutionHost)}</dd>
          <dt>executionLockedAfterSuccess</dt>
          <dd>{String(executionLocked)}</dd>
          <dt>executionInProgress</dt>
          <dd>{String(executionInProgress)}</dd>
          <dt>executeRequestedCount</dt>
          <dd>{executeRequestedCount}</dd>
          <dt>executeCompletedCount</dt>
          <dd>{executeCompletedCount}</dd>
          <dt>executionGateFailureReasons</dt>
          <dd>{executionGateFailureReasons.length ? executionGateFailureReasons.join(", ") : "none"}</dd>
          <dt>expected write count</dt>
          <dd>{result?.estimatedTotalWriteCount ?? 0}</dd>
        </dl>
        <div className="recovery-actions">
          <button
            type="button"
            className="danger"
            disabled={!executionAllowed || executionInProgress}
            onClick={handleExecuteRecoveryOnce}
          >
            {executionInProgress ? "Executing..." : "Execute parent restore once"}
          </button>
        </div>
      </section>

      <section className="recovery-card">
        <h2>Auth Diagnostics</h2>
        <dl>
          <dt>authInitializationState</dt>
          <dd>{authDiagnostics.authInitializationState}</dd>
          <dt>authObserverInitialCallbackReceived</dt>
          <dd>{String(authDiagnostics.authObserverInitialCallbackReceived)}</dd>
          <dt>authCurrentUserPresent</dt>
          <dd>{String(authDiagnostics.authCurrentUserPresent)}</dd>
          <dt>authPersistenceRestoreCompleted</dt>
          <dd>{String(authDiagnostics.authPersistenceRestoreCompleted)}</dd>
          <dt>firebaseAppName</dt>
          <dd>{authDiagnostics.firebaseAppName}</dd>
          <dt>firebaseAppCount</dt>
          <dd>{authDiagnostics.firebaseAppCount}</dd>
          <dt>firebaseProjectFingerprint</dt>
          <dd>{authDiagnostics.firebaseProjectFingerprint}</dd>
          <dt>authUserFingerprint</dt>
          <dd>{authDiagnostics.authUserFingerprint}</dd>
          <dt>appSessionLoaded</dt>
          <dd>{String(authDiagnostics.appSessionLoaded)}</dd>
          <dt>phase</dt>
          <dd>{authDiagnostics.phase}</dd>
          <dt>status</dt>
          <dd>{authDiagnostics.status}</dd>
          <dt>isSystemOwner</dt>
          <dd>{String(authDiagnostics.isSystemOwner)}</dd>
          <dt>reloadSessionRequestedCount</dt>
          <dd>{authDiagnostics.reloadSessionRequestedCount}</dd>
          <dt>reloadSessionCompletedCount</dt>
          <dd>{authDiagnostics.reloadSessionCompletedCount}</dd>
          <dt>googlePopupResult</dt>
          <dd>{authDiagnostics.googlePopupResult}</dd>
          <dt>coopWarningDisposition</dt>
          <dd>{authDiagnostics.coopWarningDisposition}</dd>
          <dt>sessionGateFailureKind</dt>
          <dd>{authDiagnostics.sessionGateFailureKind}</dd>
          <dt>usersCurrentWorkspacePresent</dt>
          <dd>{String(authDiagnostics.usersCurrentWorkspacePresent)}</dd>
          <dt>targetWorkspaceFingerprint</dt>
          <dd>{authDiagnostics.targetWorkspaceFingerprint}</dd>
        </dl>
      </section>

      {result ? (
        <>
          <section className="recovery-card">
            <h2>Dry-run Summary</h2>
            <dl>
              <dt>dryRun</dt>
              <dd>{String(result.dryRun)}</dd>
              <dt>writeExecuted</dt>
              <dd>{String(result.writeExecuted)}</dd>
              <dt>firebaseProjectFingerprint</dt>
              <dd>{result.firebaseProjectFingerprint}</dd>
              <dt>authUserFingerprint</dt>
              <dd>{result.authUserFingerprint}</dd>
              <dt>targetWorkspaceFingerprint</dt>
              <dd>{result.targetWorkspaceFingerprint}</dd>
              <dt>parentWorkspaceExists</dt>
              <dd>{String(result.parentWorkspaceExists)}</dd>
              <dt>parentRecoveryRequired</dt>
              <dd>{String(result.parentRecoveryRequired)}</dd>
              <dt>recoveryFirebaseProjectFingerprint</dt>
              <dd>{result.recoveryFirebaseProjectFingerprint}</dd>
              <dt>appNextFirebaseProjectFingerprint</dt>
              <dd>{result.appNextFirebaseProjectFingerprint}</dd>
              <dt>sameFirebaseProject</dt>
              <dd>{String(result.sameFirebaseProject)}</dd>
              <dt>firebaseAppName</dt>
              <dd>{result.firebaseAppName}</dd>
              <dt>firebaseAppCount</dt>
              <dd>{result.firebaseAppCount}</dd>
              <dt>databaseIdKind</dt>
              <dd>{result.databaseIdKind}</dd>
              <dt>canonicalMembershipExists</dt>
              <dd>{String(result.canonicalMembershipExists)}</dd>
              <dt>canonicalMembershipRole</dt>
              <dd>{result.canonicalMembershipRole}</dd>
              <dt>canonicalMembershipStatus</dt>
              <dd>{result.canonicalMembershipStatus}</dd>
              <dt>canonicalMembershipActive</dt>
              <dd>{String(result.canonicalMembershipActive)}</dd>
              <dt>canonicalMembershipWillChange</dt>
              <dd>{String(result.canonicalMembershipWillChange)}</dd>
              <dt>legacyMembershipExists</dt>
              <dd>{String(result.legacyMembershipExists)}</dd>
              <dt>legacyMembershipRole</dt>
              <dd>{result.legacyMembershipRole}</dd>
              <dt>legacyMembershipStatus</dt>
              <dd>{result.legacyMembershipStatus}</dd>
              <dt>membershipRecoveryRequired</dt>
              <dd>{String(result.membershipRecoveryRequired)}</dd>
              <dt>membershipWillBeModified</dt>
              <dd>{String(result.membershipWillBeModified)}</dd>
              <dt>estimatedParentWriteCount</dt>
              <dd>{result.estimatedParentWriteCount}</dd>
              <dt>estimatedMembershipWriteCount</dt>
              <dd>{result.estimatedMembershipWriteCount}</dd>
              <dt>estimatedTotalWriteCount</dt>
              <dd>{result.estimatedTotalWriteCount}</dd>
              <dt>estimatedWriteCount</dt>
              <dd>{result.estimatedWriteCount}</dd>
              <dt>readyForParentRecovery</dt>
              <dd>{String(result.readyForParentRecovery)}</dd>
              <dt>readyForRecovery</dt>
              <dd>{String(result.readyForRecovery)}</dd>
              <dt>confirmedWorkspaceName</dt>
              <dd>{result.confirmedWorkspaceName || "-"}</dd>
              <dt>confirmedDisplayName</dt>
              <dd>{result.confirmedDisplayName || "-"}</dd>
              <dt>nameSource</dt>
              <dd>{result.nameSource}</dd>
              <dt>createdAtEvidenceFound</dt>
              <dd>{String(result.createdAtEvidenceFound)}</dd>
              <dt>createdAtEvidenceKind</dt>
              <dd>{result.createdAtEvidenceKind}</dd>
              <dt>createdAtEvidenceSourceKind</dt>
              <dd>{result.createdAtEvidenceSourceKind}</dd>
              <dt>createdAtWillBeIncluded</dt>
              <dd>{String(result.createdAtWillBeIncluded)}</dd>
              <dt>createdAtPreview</dt>
              <dd>{result.createdAtPreview}</dd>
            </dl>
          </section>

          <section className="recovery-card">
            <h2>Final Parent Payload Preview</h2>
            {result.parentPayloadPreview ? (
              <dl>
                <dt>workspaceId</dt>
                <dd>{result.parentPayloadPreview.workspaceId}</dd>
                <dt>name</dt>
                <dd>{result.parentPayloadPreview.name}</dd>
                <dt>displayName</dt>
                <dd>{result.parentPayloadPreview.displayName}</dd>
                <dt>ownerUid</dt>
                <dd>{result.parentPayloadPreview.ownerUid}</dd>
                <dt>status</dt>
                <dd>{result.parentPayloadPreview.status}</dd>
                <dt>createdAt</dt>
                <dd>{result.parentPayloadPreview.createdAt}</dd>
                <dt>updatedAt</dt>
                <dd>{result.parentPayloadPreview.updatedAt}</dd>
                <dt>createdBy</dt>
                <dd>{result.parentPayloadPreview.createdBy}</dd>
              </dl>
            ) : (
              <p className="recovery-muted">
                Enter workspace name/display name and run final preflight to preview the parent payload.
              </p>
            )}
          </section>

          <section className="recovery-card">
            <h2>Child Collection Counts</h2>
            <div className="recovery-count-grid">
              {result.childCollectionCounts.map((item) => (
                <div className="recovery-count" key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="recovery-card">
            <h2>Proposed Parent Fields</h2>
            <FieldTable fields={result.proposedParentFields} />
          </section>

          <section className="recovery-card">
            <h2>Proposed Membership Fields</h2>
            <FieldTable fields={result.proposedMembershipFields} />
          </section>

          <section className="recovery-card">
            <h2>Blocking Issues</h2>
            {result.blockingIssues.length ? (
              <ul>
                {result.blockingIssues.map((issue) => (
                  <li key={issue.code}><strong>{issue.code}</strong>: {issue.message}</li>
                ))}
              </ul>
            ) : (
              <p className="recovery-ok">No blocking issues found in dry-run.</p>
            )}
          </section>

          <section className="recovery-card">
            <h2>Warnings</h2>
            {result.warnings.length ? (
              <ul>
                {result.warnings.map((warning) => (
                  <li key={warning.code}><strong>{warning.code}</strong>: {warning.message}</li>
                ))}
              </ul>
            ) : (
              <p className="recovery-ok">No warnings.</p>
            )}
          </section>

          <section className="recovery-card">
            <h2>Execution Receipt</h2>
            {receipt ? (
              <pre className="recovery-pre">{JSON.stringify(receipt, null, 2)}</pre>
            ) : (
              <p className="recovery-muted">No execution receipt. No Firebase write was executed in this session.</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
