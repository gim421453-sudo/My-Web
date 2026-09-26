import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { createFirestoreAuthRepository } from "./authRepository";
import {
  getSessionLoaderDiagnostics,
  invalidateSessionLoads,
  loadSessionReadOnlySafely,
} from "./sessionService";
import {
  AuthSessionError,
  toAuthSessionError,
} from "./authErrors";
import type {
  AppSession,
  AuthContextValue,
  AuthPhase,
} from "./authTypes";
import { NewAuthContext } from "./useAuth";
import {
  createFirestoreWorkspaceRepository,
} from "../workspace/workspaceRepository";
import {
  switchWorkspaceForUser,
} from "../workspace/workspaceService";
import {
  recordAppNextAuthStateChange,
  recordAppNextAuthCallback,
  recordAppNextAuthObserverAttached,
  recordAppNextCrossTabSignOut,
  recordAppNextExplicitSignOut,
  recordAppNextAuthUser,
} from "../app-next/appNextDiagnostics";
import {
  recordAuthSecurityState,
  resolveAuthSecurityState,
} from "./authSecurityState";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthProviderDiagnosticsSnapshot {
  authProviderMountCount: number;
  authStateListenerCount: number;
  sessionLoadCount: number;
  sessionReadCount: number;
  sessionWriteCount: number;
  bootstrapAttemptCount: number;
  bootstrapBlockedCount: number;
  resourceExhausted: boolean;
}

let authProviderMountCount = 0;
let activeAuthStateListenerCount = 0;

export function getAuthProviderDiagnosticsSnapshot(): AuthProviderDiagnosticsSnapshot {
  const sessionDiagnostics = getSessionLoaderDiagnostics();
  return {
    authProviderMountCount,
    authStateListenerCount: activeAuthStateListenerCount,
    sessionLoadCount: sessionDiagnostics.sessionLoadCount,
    sessionReadCount: sessionDiagnostics.sessionReadCount,
    sessionWriteCount: sessionDiagnostics.sessionWriteCount,
    bootstrapAttemptCount: sessionDiagnostics.bootstrapAttemptCount,
    bootstrapBlockedCount: sessionDiagnostics.bootstrapBlockedCount,
    resourceExhausted: sessionDiagnostics.lastErrorCode === "SESSION_READ_QUOTA_EXCEEDED",
  };
}

function phaseForSession(session: AppSession): AuthPhase {
  return session.status === "active"
    ? "authenticated"
    : "account_action_required";
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [phase, setPhase] = useState<AuthPhase>("initializing");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [error, setError] = useState<AuthSessionError | null>(null);
  const mountedRef = useRef(true);
  const currentUidRef = useRef<string | null>(null);

  const loadCurrentSession = useCallback(async (user: User) => {
    setPhase("loading_session");
    setError(null);

    const repository = createFirestoreAuthRepository();
    const nextSession = await loadSessionReadOnlySafely(user, repository);

    if (!mountedRef.current) return;

    setSession(nextSession);
    setPhase(phaseForSession(nextSession));
  }, []);

  useEffect(() => {
    authProviderMountCount += 1;
    activeAuthStateListenerCount += 1;
    mountedRef.current = true;
    recordAppNextAuthObserverAttached();

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!mountedRef.current) return;

      const nextUid = nextUser?.uid ?? null;
      recordAppNextAuthCallback(Boolean(nextUser));
      recordAppNextAuthStateChange(nextUid ? "auth-user-present" : "signed-out");
      recordAppNextAuthUser(nextUid);
      if (currentUidRef.current !== null && nextUid === null) {
        recordAppNextCrossTabSignOut("auth-state-signed-out-without-provider-click");
      }
      if (
        currentUidRef.current !== null &&
        currentUidRef.current !== nextUid
      ) {
        invalidateSessionLoads();
      }
      currentUidRef.current = nextUid;

      setFirebaseUser(nextUser);
      setError(null);

      if (!nextUser) {
        setSession(null);
        setPhase("signed_out");
        return;
      }

      void loadCurrentSession(nextUser).catch((loadError) => {
        const sessionError = toAuthSessionError(loadError);

        if (
          sessionError.code === "SESSION_SUPERSEDED" ||
          !mountedRef.current
        ) {
          return;
        }

        setSession(null);
        setError(sessionError);
        setPhase("error");
      });
    });

    return () => {
      mountedRef.current = false;
      activeAuthStateListenerCount = Math.max(0, activeAuthStateListenerCount - 1);
      unsubscribe();
    };
  }, [loadCurrentSession]);

  const signInWithEmail = useCallback(async (
    email: string,
    password: string,
  ) => {
    setError(null);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    invalidateSessionLoads();
    recordAppNextExplicitSignOut("provider-sign-out");
    await firebaseSignOut(auth);

    if (!mountedRef.current) return;

    setFirebaseUser(null);
    setSession(null);
    setError(null);
    setPhase("signed_out");
  }, []);

  const reloadSession = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      invalidateSessionLoads();
      setFirebaseUser(null);
      setSession(null);
      setPhase("signed_out");
      return;
    }

    try {
      await loadCurrentSession(currentUser);
    } catch (loadError) {
      const sessionError = toAuthSessionError(loadError);

      if (
        sessionError.code === "SESSION_SUPERSEDED" ||
        !mountedRef.current
      ) {
        return;
      }

      setSession(null);
      setError(sessionError);
      setPhase("error");
      throw sessionError;
    }
  }, [loadCurrentSession]);

  const switchWorkspace = useCallback(async (workspaceId: string | null) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new AuthSessionError("AUTH_REQUIRED", "로그인된 사용자가 없습니다.");
    }

    const previousSession = session;

    try {
      await switchWorkspaceForUser({
        uid: currentUser.uid,
        workspaceId,
        repository: createFirestoreWorkspaceRepository(),
      });

      await reloadSession();
    } catch (switchError) {
      if (previousSession && mountedRef.current) {
        setSession(previousSession);
        setPhase(phaseForSession(previousSession));
      }

      throw toAuthSessionError(switchError);
    }
  }, [reloadSession, session]);

  const securityState = useMemo(() => {
    const profileStatus = phase === "initializing" || phase === "loading_session"
      ? "loading"
      : session
        ? "ready"
        : error?.code === "PERMISSION_DENIED"
          ? "permission_denied"
          : error?.code === "USER_DOCUMENT_MISSING"
            ? "missing"
            : error
              ? "error"
              : "loading";
    const membershipStatus = session?.currentWorkspaceRole
      ? "active"
      : session?.isSystemOwner
        ? "not_applicable"
        : session?.workspaceResolution?.workspaceResolutionFailureKind === "membership-inactive"
          ? "disabled"
          : session?.workspaceResolution?.workspaceResolutionFailureKind === "canonical-membership-missing"
            ? "missing"
            : session?.currentWorkspaceId
              ? "missing"
              : "not_applicable";

    return resolveAuthSecurityState({
      firebaseUser,
      userProfile: session,
      profileStatus,
      systemOwnerRecord: session?.isSystemOwner
        ? { exists: true, status: "active" }
        : null,
      membership: session?.currentWorkspaceRole
        ? { status: "active" }
        : null,
      membershipStatus,
      workspaceRequired: false,
      roleStatus: session ? "ready" : "loading",
      assignmentStatus: "not_applicable",
      securitySource: "firebase",
      policy: {
        phase: "observe",
        emailPolicy: "observe",
        identityPolicy: "observe",
        mfaPolicy: "observe",
      },
    });
  }, [error, firebaseUser, phase, session]);

  useEffect(() => {
    recordAuthSecurityState(securityState);
  }, [securityState]);

  const value = useMemo<AuthContextValue>(() => ({
    phase,
    firebaseUser,
    session,
    firebaseAuthenticated: securityState.firebaseAuthenticated,
    securityReady: securityState.securityReady,
    workspaceReady: securityState.workspaceReady,
    securityState,
    error,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    reloadSession,
    switchWorkspace,
  }), [
    error,
    firebaseUser,
    phase,
    reloadSession,
    securityState,
    session,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    switchWorkspace,
  ]);

  return (
    <NewAuthContext.Provider value={value}>
      {children}
    </NewAuthContext.Provider>
  );
}
