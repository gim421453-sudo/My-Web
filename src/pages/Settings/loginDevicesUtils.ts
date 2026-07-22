import type {
  AccountStatus,
  AuthPhase,
} from "../../auth/authTypes";

export type LoginDeviceTone =
  | "muted"
  | "success"
  | "warning"
  | "error";

export interface LoginDevicesMessage {
  title: string;
  body: string;
  tone: LoginDeviceTone;
}

export interface ResolveLoginDevicesFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface RawLoginDeviceRecord {
  id?: unknown;
  deviceId?: unknown;
  uid?: unknown;
  workspaceId?: unknown;
  deviceName?: unknown;
  deviceType?: unknown;
  browser?: unknown;
  os?: unknown;
  lastLoginAt?: unknown;
  lastActiveAt?: unknown;
  isCurrentDevice?: unknown;
  revokedAt?: unknown;
}

export interface SafeLoginDeviceRecord {
  deviceId: string;
  uid: string;
  workspaceId: string | null;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  lastLoginAt: string;
  lastActiveAt: string;
  isCurrentDevice: boolean;
  revokedAt: string | null;
  statusLabel: string;
}

export interface NormalizeLoginDevicesOptions {
  uid: string;
  workspaceId?: string | null;
  currentDeviceId?: string | null;
}

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

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function resolveLoginDevicesNewAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveLoginDevicesFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "newAuthDevices"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function loginDevicesPhaseMessage(
  phase: AuthPhase,
): LoginDevicesMessage {
  if (phase === "initializing") {
    return {
      title: "인증 상태",
      body: "인증 상태를 확인하고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "signed_out") {
    return {
      title: "인증 상태",
      body: "로그인이 필요합니다.",
      tone: "warning",
    };
  }

  if (phase === "loading_session") {
    return {
      title: "인증 상태",
      body: "계정 정보를 불러오고 있습니다.",
      tone: "muted",
    };
  }

  if (phase === "authenticated") {
    return {
      title: "인증 상태",
      body: "기기 목록을 표시합니다.",
      tone: "success",
    };
  }

  if (phase === "account_action_required") {
    return {
      title: "인증 상태",
      body: "계정 상태에 따라 접근 제한 안내를 표시합니다.",
      tone: "warning",
    };
  }

  return {
    title: "인증 상태",
    body: "계정 정보를 불러오지 못했습니다.",
    tone: "error",
  };
}

export function loginDevicesAccountStatusMessage(
  status: AccountStatus | string | null | undefined,
): LoginDevicesMessage {
  if (status === "active") {
    return {
      title: "계정 상태",
      body: "계정이 활성화되어 기기 목록을 확인할 수 있습니다.",
      tone: "success",
    };
  }

  if (status === "pending") {
    return {
      title: "계정 상태",
      body: "계정 승인을 기다리고 있습니다.",
      tone: "warning",
    };
  }

  if (status === "rejected") {
    return {
      title: "계정 상태",
      body: "계정 승인이 거절되었습니다.",
      tone: "error",
    };
  }

  if (status === "disabled") {
    return {
      title: "계정 상태",
      body: "계정 사용이 제한되어 있습니다.",
      tone: "error",
    };
  }

  return {
    title: "계정 상태",
    body: "계정 상태를 확인할 수 없습니다.",
    tone: "warning",
  };
}

export function workspaceMissingMessage(): LoginDevicesMessage {
  return {
    title: "워크스페이스 상태",
    body: "현재 선택된 워크스페이스가 없어 기기 목록을 불러올 수 없습니다.\n로그인은 정상적으로 유지되고 있습니다.",
    tone: "warning",
  };
}

export function permissionDeniedMessage(): LoginDevicesMessage {
  return {
    title: "기기 목록",
    body: "현재 보안 설정으로는 로그인 기기 목록을 불러올 수 없습니다.\n로그인은 정상적으로 유지되고 있습니다.",
    tone: "warning",
  };
}

export function maskEmailForLoginDevices(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "-";

  const [name, domain] = email.split("@");
  if (!name || !domain) return "-";

  if (name.length <= 2) return `${name[0] ?? ""}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

export function normalizeTimestamp(value: unknown): string {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const maybeDate = (value as { toDate: () => unknown }).toDate();
    if (maybeDate instanceof Date) {
      date = maybeDate;
    } else if (
      maybeDate &&
      typeof maybeDate === "object" &&
      "getTime" in maybeDate &&
      typeof (maybeDate as { getTime: unknown }).getTime === "function"
    ) {
      const time = (maybeDate as { getTime: () => number }).getTime();
      date = Number.isNaN(time) ? null : new Date(time);
    }
  } else if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (!date || Number.isNaN(date.getTime())) return "확인할 수 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = normalizeTimestamp(value);
  return normalized === "확인할 수 없음" ? normalized : normalized;
}

export function summarizeBrowser(rawBrowser: unknown): string {
  const value = String(rawBrowser ?? "");
  if (!value) return "확인할 수 없음";
  if (/Edg\//i.test(value)) return "Microsoft Edge";
  if (/Chrome\//i.test(value) && !/Chromium/i.test(value)) return "Chrome";
  if (/Firefox\//i.test(value)) return "Firefox";
  if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) return "Safari";
  return "기타 브라우저";
}

export function summarizeOs(rawOs: unknown, rawBrowser?: unknown): string {
  const value = `${String(rawOs ?? "")} ${String(rawBrowser ?? "")}`;
  if (/Windows/i.test(value) || /Win32|Win64/i.test(value)) return "Windows";
  if (/Macintosh|MacIntel|Mac OS/i.test(value)) return "macOS";
  if (/Android/i.test(value)) return "Android";
  if (/iPhone|iPad|iPod/i.test(value)) return "iOS";
  if (/Linux/i.test(value)) return "Linux";
  return "확인할 수 없음";
}

export function loginDeviceStatusLabel(
  record: Pick<SafeLoginDeviceRecord, "revokedAt" | "isCurrentDevice" | "lastActiveAt">,
): string {
  if (record.revokedAt) return "해제된 기기";
  if (record.isCurrentDevice) return "현재 사용 중";
  if (record.lastActiveAt === "확인할 수 없음") return "최근 사용";
  return "최근 사용";
}

export function normalizeDeviceRecord(
  raw: RawLoginDeviceRecord,
  options: NormalizeLoginDevicesOptions,
): SafeLoginDeviceRecord | null {
  const uid = stringOrNull(raw.uid);
  if (!uid || uid !== options.uid) return null;

  const workspaceId = stringOrNull(raw.workspaceId);
  if (options.workspaceId && workspaceId !== options.workspaceId) return null;

  const deviceId =
    stringOrNull(raw.deviceId) ??
    stringOrNull(raw.id);

  if (!deviceId) return null;

  const lastLoginAt = normalizeTimestamp(raw.lastLoginAt);
  const lastActiveAt = normalizeTimestamp(raw.lastActiveAt);
  const revokedAt = normalizeNullableTimestamp(raw.revokedAt);
  const isCurrentDevice =
    raw.isCurrentDevice === true ||
    (Boolean(options.currentDeviceId) && deviceId === options.currentDeviceId);

  const record = {
    deviceId,
    uid,
    workspaceId,
    deviceName: stringOrNull(raw.deviceName) ?? "이름 없는 기기",
    deviceType: stringOrNull(raw.deviceType) ?? "unknown",
    browser: summarizeBrowser(raw.browser),
    os: summarizeOs(raw.os, raw.browser),
    lastLoginAt,
    lastActiveAt,
    isCurrentDevice,
    revokedAt,
    statusLabel: "최근 사용",
  };

  return {
    ...record,
    statusLabel: loginDeviceStatusLabel(record),
  };
}

export function dedupeDeviceRecords(
  records: SafeLoginDeviceRecord[],
): SafeLoginDeviceRecord[] {
  const seen = new Set<string>();
  const result: SafeLoginDeviceRecord[] = [];

  for (const record of records) {
    if (seen.has(record.deviceId)) continue;
    seen.add(record.deviceId);
    result.push(record);
  }

  return result;
}

export function normalizeDeviceRecords(
  rows: RawLoginDeviceRecord[],
  options: NormalizeLoginDevicesOptions,
): SafeLoginDeviceRecord[] {
  return dedupeDeviceRecords(
    rows
      .map((row) => normalizeDeviceRecord(row, options))
      .filter((row): row is SafeLoginDeviceRecord => Boolean(row)),
  );
}

export function currentDeviceWarning(
  records: SafeLoginDeviceRecord[],
): string | null {
  const currentCount = records.filter((record) => record.isCurrentDevice).length;
  if (currentCount > 1) {
    return "현재 기기 정보가 중복되어 정확히 판별할 수 없습니다.";
  }

  if (currentCount === 0 && records.length > 0) {
    return "현재 기기를 확인할 수 없습니다.";
  }

  return null;
}

export function parseLocalFallbackDevices(
  rawValue: string | null | undefined,
  options: NormalizeLoginDevicesOptions,
): SafeLoginDeviceRecord[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return normalizeDeviceRecords(parsed, options);
  } catch {
    return [];
  }
}

export function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "permission-denied" || /permission/i.test(message);
}
