import type {
  AccountStatus,
  AuthPhase,
} from "../../auth/authTypes";

export type NotificationsTone =
  | "muted"
  | "success"
  | "warning"
  | "error";

export interface NotificationsMessage {
  title: string;
  body: string;
  tone: NotificationsTone;
}

export interface ResolveNotificationsFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}

export interface RawNotificationRecord {
  id?: unknown;
  notificationId?: unknown;
  workspaceId?: unknown;
  uid?: unknown;
  type?: unknown;
  title?: unknown;
  message?: unknown;
  read?: unknown;
  createdAt?: unknown;
  relatedId?: unknown;
}

export interface SafeNotificationRecord {
  notificationId: string;
  workspaceId: string | null;
  uid: string;
  type: string;
  title: string;
  messageSummary: string;
  readLabel: "읽음" | "읽지 않음";
  isRead: boolean;
  createdAt: string;
  createdAtSort: number;
  serviceLabel: string;
}

export interface NormalizeNotificationsOptions {
  uid: string;
  workspaceId?: string | null;
  maxMessageLength?: number;
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

function coerceDate(value: unknown): Date | null {
  if (value instanceof Date) return value;

  if (
    value &&
    typeof value === "object" &&
    "getTime" in value &&
    typeof (value as { getTime: unknown }).getTime === "function"
  ) {
    const time = (value as { getTime: () => number }).getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const maybeDate = (value as { toDate: () => unknown }).toDate();
    if (maybeDate instanceof Date) return maybeDate;

    if (
      maybeDate &&
      typeof maybeDate === "object" &&
      "getTime" in maybeDate &&
      typeof (maybeDate as { getTime: unknown }).getTime === "function"
    ) {
      const time = (maybeDate as { getTime: () => number }).getTime();
      return Number.isNaN(time) ? null : new Date(time);
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function resolveNotificationsNewAuthFlag({
  search = "",
  envValue,
  isDev = false,
}: ResolveNotificationsFlagInput = {}): boolean {
  if (!isDev) return false;

  const querySwitch = parseBooleanSwitch(queryValue(search, "newAuthNotifications"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function notificationsPhaseMessage(
  phase: AuthPhase,
): NotificationsMessage {
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
      body: "알림 목록을 표시합니다.",
      tone: "success",
    };
  }

  if (phase === "account_action_required") {
    return {
      title: "인증 상태",
      body: "계정 상태에 따른 안내를 표시합니다.",
      tone: "warning",
    };
  }

  return {
    title: "인증 상태",
    body: "계정 정보를 불러오지 못했습니다.",
    tone: "error",
  };
}

export function notificationsAccountStatusMessage(
  status: AccountStatus | string | null | undefined,
): NotificationsMessage {
  if (status === "active") {
    return {
      title: "계정 상태",
      body: "계정이 활성화되어 알림 목록을 확인할 수 있습니다.",
      tone: "success",
    };
  }

  if (status === "pending") {
    return {
      title: "계정 상태",
      body: "계정 승인을 기다리고 있습니다. 승인 전에는 알림 목록을 불러오지 않습니다.",
      tone: "warning",
    };
  }

  if (status === "rejected") {
    return {
      title: "계정 상태",
      body: "계정 승인이 거절되었습니다. 알림 목록을 불러오지 않습니다.",
      tone: "error",
    };
  }

  if (status === "disabled") {
    return {
      title: "계정 상태",
      body: "계정 사용이 제한되어 있습니다. 알림 목록을 불러오지 않습니다.",
      tone: "error",
    };
  }

  return {
    title: "계정 상태",
    body: "계정 상태를 확인할 수 없습니다.",
    tone: "warning",
  };
}

export function notificationsWorkspaceMissingMessage(): NotificationsMessage {
  return {
    title: "워크스페이스 상태",
    body: "현재 선택된 워크스페이스가 없어 워크스페이스 알림을 불러올 수 없습니다.\n로그인은 정상적으로 유지되고 있습니다.",
    tone: "warning",
  };
}

export function notificationsPermissionDeniedMessage(): NotificationsMessage {
  return {
    title: "알림 목록",
    body: "현재 보안 설정으로는 알림 목록을 불러올 수 없습니다.\n로그인은 정상적으로 유지되고 있습니다.",
    tone: "warning",
  };
}

export function notificationTimeLabel(value: unknown): string {
  const date = coerceDate(value);
  if (!date || Number.isNaN(date.getTime())) return "시간을 확인할 수 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function notificationTimeSortValue(value: unknown): number {
  const date = coerceDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export function sanitizeNotificationText(value: unknown, maxLength = 160): string {
  const normalized = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "내용 없음";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function notificationServiceLabel(type: unknown): string {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (normalized === "system") return "시스템";
  if (normalized === "app") return "서비스";
  if (normalized === "workspace") return "워크스페이스";
  return "일반 알림";
}

export function normalizeNotificationRecord(
  raw: RawNotificationRecord,
  options: NormalizeNotificationsOptions,
): SafeNotificationRecord | null {
  const uid = stringOrNull(raw.uid);
  if (!uid || uid !== options.uid) return null;

  const workspaceId = stringOrNull(raw.workspaceId);
  if (options.workspaceId && workspaceId !== options.workspaceId) return null;

  const notificationId =
    stringOrNull(raw.notificationId) ??
    stringOrNull(raw.id);

  if (!notificationId) return null;

  const type = sanitizeNotificationText(stringOrNull(raw.type) ?? "app", 40);
  const isRead = raw.read === true;

  return {
    notificationId,
    workspaceId,
    uid,
    type,
    title: sanitizeNotificationText(raw.title, 80),
    messageSummary: sanitizeNotificationText(raw.message, options.maxMessageLength ?? 160),
    readLabel: isRead ? "읽음" : "읽지 않음",
    isRead,
    createdAt: notificationTimeLabel(raw.createdAt),
    createdAtSort: notificationTimeSortValue(raw.createdAt),
    serviceLabel: notificationServiceLabel(type),
  };
}

export function dedupeNotificationRecords(
  records: SafeNotificationRecord[],
): SafeNotificationRecord[] {
  const seen = new Set<string>();
  const result: SafeNotificationRecord[] = [];

  for (const record of records) {
    if (seen.has(record.notificationId)) continue;
    seen.add(record.notificationId);
    result.push(record);
  }

  return result;
}

export function sortNotificationsNewestFirst(
  records: SafeNotificationRecord[],
): SafeNotificationRecord[] {
  return [...records].sort((a, b) => b.createdAtSort - a.createdAtSort);
}

export function normalizeNotificationRecords(
  rows: RawNotificationRecord[],
  options: NormalizeNotificationsOptions,
): SafeNotificationRecord[] {
  return sortNotificationsNewestFirst(dedupeNotificationRecords(
    rows
      .map((row) => normalizeNotificationRecord(row, options))
      .filter((row): row is SafeNotificationRecord => Boolean(row)),
  ));
}

export function parseLocalFallbackNotifications(
  rawValue: string | null | undefined,
  options: NormalizeNotificationsOptions,
): SafeNotificationRecord[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return normalizeNotificationRecords(parsed, options);
  } catch {
    return [];
  }
}

export function isNotificationsPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "permission-denied" || /permission/i.test(message);
}
