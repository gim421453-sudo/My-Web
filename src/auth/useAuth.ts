import {
  createContext,
  useContext,
} from "react";
import type { AuthContextValue } from "./authTypes";

export const NewAuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(NewAuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside the new AuthProvider.");
  }

  return context;
}

