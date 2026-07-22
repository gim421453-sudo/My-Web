import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useAuth,
} from "../useAuth";
import {
  createLegacyAuthAdapterValue,
} from "./legacyAuthAdapterUtils";
import type {
  LegacyAuthAdapterValue,
} from "./legacyAuthAdapterTypes";

const LegacyAuthAdapterContext =
  createContext<LegacyAuthAdapterValue | null>(null);

interface LegacyAuthAdapterProviderProps {
  children: ReactNode;
}

export function LegacyAuthAdapterProvider({
  children,
}: LegacyAuthAdapterProviderProps) {
  const {
    phase,
    firebaseUser,
    session,
    error,
    signInWithEmail,
    signOut,
    reloadSession,
  } = useAuth();

  const value = useMemo(
    () => createLegacyAuthAdapterValue({
      phase,
      firebaseUser,
      session,
      error,
      signInWithEmail,
      signOut,
      reloadSession,
    }),
    [
      error,
      firebaseUser,
      phase,
      reloadSession,
      session,
      signInWithEmail,
      signOut,
    ],
  );

  return (
    <LegacyAuthAdapterContext.Provider value={value}>
      {children}
    </LegacyAuthAdapterContext.Provider>
  );
}

export function useLegacyAuthAdapter(): LegacyAuthAdapterValue {
  const context = useContext(LegacyAuthAdapterContext);

  if (!context) {
    throw new Error("useLegacyAuthAdapter must be used inside LegacyAuthAdapterProvider.");
  }

  return context;
}
