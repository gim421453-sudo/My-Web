import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";

import {
  loginWithEmail,
  logoutUser,
} from "../services/authService";

import {
  loadAppSession,
} from "../services/authAccess";

import type {
  AppSession,
} from "../types/auth";

interface AuthContextValue {
  session: AppSession | null;
  loading: boolean;
  authError: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<void>;

  logout: () => Promise<void>;

  reloadSession:
    () => Promise<void>;
}

const AuthContext =
  createContext<
    AuthContextValue | null
  >(null);

interface AuthProviderProps {
  children: ReactNode;
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    session,
    setSession,
  ] = useState<
    AppSession | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authError,
    setAuthError,
  ] = useState<
    string | null
  >(null);

  const reloadSession =
    useCallback(async () => {
      const firebaseUser =
        auth.currentUser;

      setLoading(true);
      setAuthError(null);

      if (!firebaseUser) {
        setSession(null);
        setLoading(false);
        return;
      }

      try {
        const nextSession =
          await loadAppSession(
            firebaseUser,
          );

        setSession(nextSession);
      } catch (error) {
        console.error(
          "세션 새로고침 실패:",
          error,
        );

        setAuthError(
          getErrorMessage(
            error,
            "사용자 정보를 새로고침하지 못했습니다.",
          ),
        );

        setSession(null);

        await signOut(auth);

        throw error;
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setLoading(true);
          setAuthError(null);

          if (!firebaseUser) {
            setSession(null);
            setLoading(false);
            return;
          }

          try {
            const nextSession =
              await loadAppSession(
                firebaseUser,
              );

            setSession(nextSession);
          } catch (error) {
            console.error(
              "자동 로그인 사용자 검사 실패:",
              error,
            );

            setAuthError(
              getErrorMessage(
                error,
                "사용자 정보를 확인하지 못했습니다.",
              ),
            );

            setSession(null);

            await signOut(auth);
          } finally {
            setLoading(false);
          }
        },
      );

    return unsubscribe;
  }, []);

  const login =
    useCallback(
      async (
        email: string,
        password: string,
      ) => {
        setLoading(true);
        setAuthError(null);

        try {
          const nextSession =
            await loginWithEmail(
              email,
              password,
            );

          setSession(nextSession);
        } catch (error) {
          console.error(
            "로그인 실패:",
            error,
          );

          setAuthError(
            getErrorMessage(
              error,
              "로그인하지 못했습니다.",
            ),
          );

          setSession(null);

          throw error;
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  const logout =
    useCallback(async () => {
      try {
        await logoutUser();
      } finally {
        setSession(null);
        setAuthError(null);
      }
    }, []);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        loading,
        authError,
        login,
        logout,
        reloadSession,
      }),
      [
        session,
        loading,
        authError,
        login,
        logout,
        reloadSession,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth():
  AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth는 AuthProvider 내부에서 사용해야 합니다.",
    );
  }

  return context;
}
