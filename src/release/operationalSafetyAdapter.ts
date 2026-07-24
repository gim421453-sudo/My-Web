export type OperationalSafetyMode = "normal" | "maintenance" | "partial-outage" | "emergency";

export interface OperationalSafetyStatus {
  mode: OperationalSafetyMode;
  title: string;
  description: string;
  estimatedRecoveryAt: string;
  readAllowed: boolean;
  writeBlocked: boolean;
  blocksGeneralUsers: boolean;
}

export interface OperationalSafetySnapshot {
  releaseChannel: string;
  buildMode: string;
  globalErrorCount: number;
  unhandledRejectionCount: number;
  firebaseInitState: string;
  authInitState: string;
  workspaceInitState: string;
  manifestLoadState: string;
  lastErrorCategory: string;
  lastErrorCode: string;
  lastErrorAt: string;
  recoveryAttemptCount: number;
  recoverySuccessCount: number;
  maintenanceMode: OperationalSafetyMode;
  sensitiveValueDetected: boolean;
}

interface OperationalSafetyGlobal {
  status?: () => OperationalSafetyStatus;
  snapshot?: () => OperationalSafetySnapshot;
  recordError?: (error: unknown, fallbackCategory?: string) => { category: string; code: string };
  recordState?: (key: string, value: string) => void;
  retry?: () => void;
  isSystemOwner?: (user: unknown) => boolean;
  releaseInfo?: () => {
    releaseChannel: string;
    manifestVersion: string;
    buildDate: string;
    appVersion: string;
    gitCommit: string;
    stableCount: number;
    betaCount: number;
    hiddenCount: number;
    plannedCount: number;
  };
  isWriteBlocked?: () => boolean;
}

declare global {
  interface Window {
    PMOperationalSafety?: OperationalSafetyGlobal;
    PMOperationalSafetyDiagnostics?: {
      snapshot?: () => OperationalSafetySnapshot;
    };
  }
}

const DEFAULT_STATUS: OperationalSafetyStatus = {
  mode: "normal",
  title: "Normal operation",
  description: "The service is available.",
  estimatedRecoveryAt: "unavailable",
  readAllowed: true,
  writeBlocked: false,
  blocksGeneralUsers: false,
};

const DEFAULT_SNAPSHOT: OperationalSafetySnapshot = {
  releaseChannel: "owner-preview",
  buildMode: "unknown",
  globalErrorCount: 0,
  unhandledRejectionCount: 0,
  firebaseInitState: "not-started",
  authInitState: "not-started",
  workspaceInitState: "not-started",
  manifestLoadState: "pending",
  lastErrorCategory: "",
  lastErrorCode: "",
  lastErrorAt: "",
  recoveryAttemptCount: 0,
  recoverySuccessCount: 0,
  maintenanceMode: "normal",
  sensitiveValueDetected: false,
};

export function getOperationalSafetyStatus(): OperationalSafetyStatus {
  return window.PMOperationalSafety?.status?.() ?? DEFAULT_STATUS;
}

export function getOperationalSafetySnapshot(): OperationalSafetySnapshot {
  return window.PMOperationalSafetyDiagnostics?.snapshot?.()
    ?? window.PMOperationalSafety?.snapshot?.()
    ?? DEFAULT_SNAPSHOT;
}

export function recordOperationalSafetyError(error: unknown, fallbackCategory: string): void {
  window.PMOperationalSafety?.recordError?.(error, fallbackCategory);
}

export function recordOperationalSafetyState(key: string, value: string): void {
  window.PMOperationalSafety?.recordState?.(key, value);
}

export function retryOperationalSafety(): void {
  window.PMOperationalSafety?.retry?.();
}

export function isOperationalSafetyOwner(user: unknown): boolean {
  return Boolean(window.PMOperationalSafety?.isSystemOwner?.(user));
}
