import type { User } from "firebase/auth";
import type {
  AccountStatus,
  AuthPhase,
} from "../authTypes";
import type {
  GlobalRole,
  WorkspaceRole,
} from "../../permissions/roles";

export interface LegacyAuthAdapterSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  globalRole: GlobalRole;
  status: AccountStatus;
  currentWorkspaceId: string | null;
  currentRole: WorkspaceRole | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  isAuthenticated: boolean;
  isSystemOwner: boolean;
  warningCodes: string[];
}

export interface LegacyAuthAdapterValue {
  user: User | null;
  session: LegacyAuthAdapterSession | null;
  phase: AuthPhase;
  loading: boolean;
  currentRole: WorkspaceRole | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  status: AccountStatus | null;
  isAuthenticated: boolean;
  isSystemOwner: boolean;
  error: string | null;
  authError: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  reloadSession(): Promise<void>;
}

export interface ResolveLegacyAuthAdapterFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface LegacyAuthAdapterMessage {
  title: string;
  body: string;
  tone: "muted" | "success" | "warning" | "error";
}
