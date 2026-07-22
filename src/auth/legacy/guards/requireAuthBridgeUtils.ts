import type {
  AuthPhase,
} from "../../authTypes";
import type {
  GuardDecision,
  GuardExpectedDestination,
  ResolveLegacyAuthGuardPreviewFlagInput,
} from "./legacyGuardTypes";

export type RequireAuthBridgeMode =
  | "legacy"
  | "new";

export interface RequireAuthBridgeSnapshot {
  mode: RequireAuthBridgeMode;
  phase: AuthPhase | "legacy";
  loading: boolean;
  isAuthenticated: boolean;
  status: string | null;
  globalRole: string | null;
  isSystemOwner: boolean;
  hasCurrentWorkspaceId: boolean;
  decision: GuardDecision;
  childrenRendered: boolean;
  expectedDestination: GuardExpectedDestination;
  redirectAttempted: boolean;
  automaticSignOutOccurred: false;
  authListenerCount: number;
}

export interface RequireAuthDiagnosticsSnapshot {
  providerMode: RequireAuthBridgeMode | "unknown";
  sessionPhase: AuthPhase | "legacy" | null;
  isAuthenticated: boolean;
  accountStatus: string | null;
  decision: string | null;
  redirectCount: number;
  renderAllowedCount: number;
  blockedCount: number;
  lastBlockReason: string | null;
  authListenerCount: number;
  restoreConflictDetected: boolean;
}

let latestRequireAuthSnapshot: RequireAuthBridgeSnapshot | null = null;
let redirectCount = 0;
let renderAllowedCount = 0;
let blockedCount = 0;
let lastRedirectKey: string | null = null;
let lastRenderAllowedKey: string | null = null;
let lastBlockedKey: string | null = null;

function snapshotDecisionKey(snapshot: RequireAuthBridgeSnapshot): string {
  return JSON.stringify({
    mode: snapshot.mode,
    phase: snapshot.phase,
    status: snapshot.status,
    state: snapshot.decision.state,
    reason: snapshot.decision.reason,
    destination: snapshot.expectedDestination,
    redirectAttempted: snapshot.redirectAttempted,
    childrenRendered: snapshot.childrenRendered,
  });
}

export function recordRequireAuthBridgeSnapshot(
  snapshot: RequireAuthBridgeSnapshot,
): void {
  latestRequireAuthSnapshot = snapshot;
  const key = snapshotDecisionKey(snapshot);

  if (snapshot.redirectAttempted && key !== lastRedirectKey) {
    redirectCount += 1;
    lastRedirectKey = key;
  }

  if (snapshot.childrenRendered && key !== lastRenderAllowedKey) {
    renderAllowedCount += 1;
    lastRenderAllowedKey = key;
  }

  if (
    !snapshot.loading &&
    !snapshot.childrenRendered &&
    snapshot.decision.state !== "loading" &&
    key !== lastBlockedKey
  ) {
    blockedCount += 1;
    lastBlockedKey = key;
  }
}

export function getRequireAuthDiagnosticsSnapshot(): RequireAuthDiagnosticsSnapshot {
  return {
    providerMode: latestRequireAuthSnapshot?.mode ?? "unknown",
    sessionPhase: latestRequireAuthSnapshot?.phase ?? null,
    isAuthenticated: latestRequireAuthSnapshot?.isAuthenticated ?? false,
    accountStatus: latestRequireAuthSnapshot?.status ?? null,
    decision: latestRequireAuthSnapshot?.decision.reason ?? null,
    redirectCount,
    renderAllowedCount,
    blockedCount,
    lastBlockReason: latestRequireAuthSnapshot && !latestRequireAuthSnapshot.childrenRendered
      ? latestRequireAuthSnapshot.decision.reason
      : null,
    authListenerCount: latestRequireAuthSnapshot?.authListenerCount ?? 0,
    restoreConflictDetected: false,
  };
}

function installRequireAuthDiagnostics(): void {
  if (typeof window === "undefined") return;

  (window as typeof window & {
    PMRequireAuthDiagnostics?: {
      snapshot(): RequireAuthDiagnosticsSnapshot;
    };
  }).PMRequireAuthDiagnostics = {
    snapshot: getRequireAuthDiagnosticsSnapshot,
  };
}

installRequireAuthDiagnostics();

function parseBooleanSwitch(value: unknown): boolean | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function queryValue(search: string, key: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;

  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    if (decodeURIComponent(rawKey || "") === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, " "));
    }
  }

  return null;
}

export function resolveDevAuthFeatureFlag({
  search = "",
  envValue,
  isDev = false,
  queryKey,
}: ResolveLegacyAuthGuardPreviewFlagInput & {
  queryKey: string;
}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, queryKey));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function resolveNewAuthRequireAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveLegacyAuthGuardPreviewFlagInput = {}): boolean {
  if (isDev) {
    const querySwitch = parseBooleanSwitch(queryValue(search, "newAuthRequireAuth"));
    if (querySwitch !== null) return querySwitch;
  }

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return true;
}

export function requireAuthModeForFlag(
  enabled: boolean,
): RequireAuthBridgeMode {
  return enabled ? "new" : "legacy";
}

export function currentSearchFromDocument(): string {
  if (typeof document === "undefined") return "";
  return new URL(document.URL).search;
}

export function shouldRenderRequireAuthChildren(
  decision: GuardDecision,
): boolean {
  return decision.allow;
}

export function isRequireAuthRedirectLoop(
  currentPath: string,
  destination: GuardExpectedDestination,
): boolean {
  if (!destination) return false;
  const normalizedPath = currentPath.endsWith("/") && currentPath !== "/"
    ? currentPath.slice(0, -1)
    : currentPath;
  return normalizedPath === destination;
}

export function redirectDestinationForRequireAuthDecision({
  decision,
  currentPath,
}: {
  decision: GuardDecision;
  currentPath: string;
}): GuardExpectedDestination {
  if (decision.state === "loading" || decision.allow) return null;
  if (isRequireAuthRedirectLoop(currentPath, decision.expectedDestination)) {
    return null;
  }
  return decision.expectedDestination;
}

export function requireAuthBridgeMessage(
  decision: GuardDecision,
): string {
  switch (decision.reason) {
    case "AUTH_INITIALIZING":
    case "SESSION_LOADING":
      return "로그인 정보를 확인 중입니다.";
    case "SIGNED_OUT":
      return "로그인이 필요합니다.";
    case "ACCOUNT_PENDING":
      return "계정 승인을 기다리고 있습니다.";
    case "ACCOUNT_REJECTED":
      return "계정 승인이 거절되었습니다.";
    case "ACCOUNT_DISABLED":
      return "계정 사용이 제한되어 있습니다.";
    case "SESSION_ERROR":
      return "계정 상태를 확인하지 못했습니다. 다시 시도해 주세요.";
    case "AUTHENTICATED_WITHOUT_WORKSPACE":
    case "AUTHENTICATED_ACTIVE":
    case "SYSTEM_OWNER":
    case "WORKSPACE_ROLE_ALLOWED":
      return "접근이 허용되었습니다.";
    case "WORKSPACE_REQUIRED":
      return "현재 선택된 워크스페이스가 없습니다.";
    case "WORKSPACE_ROLE_MISSING":
    case "WORKSPACE_ROLE_NOT_ALLOWED":
      return "이 화면을 볼 권한이 없습니다.";
  }
}
