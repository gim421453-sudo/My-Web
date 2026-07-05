import { createContext, useContext } from "react";
import type { User } from "firebase/auth";
import type { WorkspaceRole } from "../services/permissionService";

export type AuthContextValue = {
  user: User | null;
  profile: unknown | null;
  workspaceId: string | null;
  role: WorkspaceRole | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  workspaceId: null,
  role: null,
  loading: true
});

export function useAuth() {
  return useContext(AuthContext);
}
