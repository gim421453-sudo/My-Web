import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextDeviceSource =
  | "firestore"
  | "local-fallback"
  | "none"
  | "permission-denied"
  | "error";

export interface RawAppNextDeviceRecord {
  id?: unknown;
  deviceId?: unknown;
  sessionId?: unknown;
  uid?: unknown;
  workspaceId?: unknown;
  deviceName?: unknown;
  deviceType?: unknown;
  browser?: unknown;
  os?: unknown;
  userAgent?: unknown;
  ipAddress?: unknown;
  lastLoginAt?: unknown;
  lastActiveAt?: unknown;
  lastSeenAt?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  isCurrentDevice?: unknown;
  revokedAt?: unknown;
}

export type AppNextDeviceCurrentMatchReason =
  | "exact-id"
  | "no-exact-id"
  | "duplicate-exact-id-resolved";

export interface AppNextDeviceRecord {
  recordKey: string;
  maskedId: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastLoginAt: string;
  lastActiveAt: string;
  isCurrentDevice: boolean;
  currentMatchReason: AppNextDeviceCurrentMatchReason;
  statusLabel: string;
  sortTime: number;
}

export interface NormalizeAppNextDeviceOptions {
  uid: string;
  currentDeviceId?: string | null;
  currentSessionId?: string | null;
}

export interface AppNextDeviceReadPolicyInput {
  phase: AuthPhase;
  session: AppSession | null;
}

export interface AppNextDeviceReadPolicy {
  canRead: boolean;
  reason:
    | "loading"
    | "signed-out"
    | "active"
    | "account-action-required"
    | "error";
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function timestampToMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const maybeDate = (value as { toDate: () => unknown }).toDate();
    if (maybeDate instanceof Date) return maybeDate.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  return 0;
}

function deviceSortTime(raw: RawAppNextDeviceRecord): number {
  return (
    timestampToMillis(raw.lastActiveAt ?? raw.lastSeenAt) ||
    timestampToMillis(raw.updatedAt) ||
    timestampToMillis(raw.createdAt) ||
    timestampToMillis(raw.lastLoginAt)
  );
}

function recordKeyForRaw(row: RawAppNextDeviceRecord, index: number): string {
  const key =
    stringOrNull(row.id) ??
    stringOrNull(row.deviceId) ??
    stringOrNull(row.sessionId);

  return key ? `${key}:${index}` : `device-row:${index}`;
}

function deviceMatchesExactCurrentIdentifier(
  row: RawAppNextDeviceRecord,
  options: NormalizeAppNextDeviceOptions,
): boolean {
  const currentDeviceId = stringOrNull(options.currentDeviceId);
  const currentSessionId = stringOrNull(options.currentSessionId);
  if (!currentDeviceId && !currentSessionId) return false;

  const rowDeviceId = stringOrNull(row.deviceId);
  const rowDocumentId = stringOrNull(row.id);
  const rowSessionId = stringOrNull(row.sessionId);

  return Boolean(
    (currentDeviceId && (rowDeviceId === currentDeviceId || rowDocumentId === currentDeviceId)) ||
    (currentSessionId && rowSessionId === currentSessionId),
  );
}

export function formatAppNextDeviceTime(value: unknown): string {
  const millis = timestampToMillis(value);
  if (!millis) return "확인할 수 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
}

export function maskAppNextDeviceIdentifier(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const suffix = raw.slice(-4);
  return `...${suffix}`;
}

export function maskAppNextIpAddress(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const ipv4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    return `${ipv4[1]}.${ipv4[2]}.xxx.xxx`;
  }

  if (raw.includes(":")) {
    return `${raw.slice(0, 4)}:xxxx`;
  }

  return "마스킹됨";
}

export function summarizeAppNextBrowser(rawBrowser: unknown, rawUserAgent?: unknown): string {
  const value = `${String(rawBrowser ?? "")} ${String(rawUserAgent ?? "")}`;
  if (!value.trim()) return "확인할 수 없음";
  if (/Edg\//i.test(value)) return "Microsoft Edge";
  if (/Chrome\//i.test(value) && !/Chromium/i.test(value)) return "Chrome";
  if (/Firefox\//i.test(value)) return "Firefox";
  if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) return "Safari";
  return "기타 브라우저";
}

export function summarizeAppNextOs(rawOs: unknown, rawBrowser?: unknown, rawUserAgent?: unknown): string {
  const value = `${String(rawOs ?? "")} ${String(rawBrowser ?? "")} ${String(rawUserAgent ?? "")}`;
  if (/Windows|Win32|Win64/i.test(value)) return "Windows";
  if (/Macintosh|MacIntel|Mac OS/i.test(value)) return "macOS";
  if (/Android/i.test(value)) return "Android";
  if (/iPhone|iPad|iPod/i.test(value)) return "iOS";
  if (/Linux/i.test(value)) return "Linux";
  return "확인할 수 없음";
}

export function appNextDeviceReadPolicy({
  phase,
  session,
}: AppNextDeviceReadPolicyInput): AppNextDeviceReadPolicy {
  if (phase === "initializing" || phase === "loading_session") {
    return { canRead: false, reason: "loading" };
  }

  if (phase === "signed_out") {
    return { canRead: false, reason: "signed-out" };
  }

  if (phase === "error") {
    return { canRead: false, reason: "error" };
  }

  if (!session || session.status !== "active") {
    return { canRead: false, reason: "account-action-required" };
  }

  return { canRead: true, reason: "active" };
}

export function normalizeAppNextDeviceRecord(
  raw: RawAppNextDeviceRecord,
  options: NormalizeAppNextDeviceOptions,
  currentMatchReason: AppNextDeviceCurrentMatchReason = "no-exact-id",
  recordKey = "device-row",
): AppNextDeviceRecord | null {
  const uid = stringOrNull(raw.uid);
  if (!uid || uid !== options.uid) return null;

  const deviceId = stringOrNull(raw.deviceId) ?? stringOrNull(raw.id);
  const sessionId = stringOrNull(raw.sessionId);
  if (!deviceId && !sessionId) return null;

  const lastLoginMillis = timestampToMillis(raw.lastLoginAt);
  const lastActiveValue = raw.lastActiveAt ?? raw.lastSeenAt;
  const revokedAtMillis = timestampToMillis(raw.revokedAt);
  const sortTime = deviceSortTime(raw);
  const isCurrentDevice = currentMatchReason === "exact-id";

  return {
    recordKey,
    maskedId: maskAppNextDeviceIdentifier(deviceId ?? sessionId),
    deviceName: stringOrNull(raw.deviceName) ?? "이름 없는 기기",
    deviceType: stringOrNull(raw.deviceType) ?? "unknown",
    browser: summarizeAppNextBrowser(raw.browser, raw.userAgent),
    os: summarizeAppNextOs(raw.os, raw.browser, raw.userAgent),
    ipAddress: maskAppNextIpAddress(raw.ipAddress),
    lastLoginAt: formatAppNextDeviceTime(raw.lastLoginAt),
    lastActiveAt: formatAppNextDeviceTime(lastActiveValue),
    isCurrentDevice,
    currentMatchReason,
    statusLabel: revokedAtMillis
      ? "해제된 기기"
      : isCurrentDevice
        ? "현재 기기"
        : "최근 사용",
    sortTime: sortTime || lastLoginMillis,
  };
}

export function normalizeAppNextDeviceRecords(
  rows: RawAppNextDeviceRecord[],
  options: NormalizeAppNextDeviceOptions,
): AppNextDeviceRecord[] {
  const exactMatches = rows
    .map((row, index) => ({
      row,
      index,
      sortTime: deviceSortTime(row),
    }))
    .filter(({ row }) => {
      const uid = stringOrNull(row.uid);
      return uid === options.uid && deviceMatchesExactCurrentIdentifier(row, options);
    })
    .sort((a, b) => b.sortTime - a.sortTime);

  const currentWinnerIndex = exactMatches.length > 0 ? exactMatches[0].index : -1;
  const hasDuplicateExactMatches = exactMatches.length > 1;
  const result: AppNextDeviceRecord[] = [];

  rows.forEach((row, index) => {
    let currentMatchReason: AppNextDeviceCurrentMatchReason = "no-exact-id";

    if (index === currentWinnerIndex) {
      currentMatchReason = "exact-id";
    } else if (hasDuplicateExactMatches && deviceMatchesExactCurrentIdentifier(row, options)) {
      currentMatchReason = "duplicate-exact-id-resolved";
    }

    const normalized = normalizeAppNextDeviceRecord(
      row,
      options,
      currentMatchReason,
      recordKeyForRaw(row, index),
    );
    if (normalized) result.push(normalized);
  });

  return result.sort((a, b) => b.sortTime - a.sortTime);
}

export function parseAppNextLocalFallbackDevices(
  rawValue: string | null | undefined,
  options: NormalizeAppNextDeviceOptions,
): AppNextDeviceRecord[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return normalizeAppNextDeviceRecords(parsed, options);
  } catch {
    return [];
  }
}

export function isAppNextDevicePermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "permission-denied" || /permission|insufficient/i.test(message);
}
