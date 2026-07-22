import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextNotificationSource =
  | "firestore"
  | "local-fallback"
  | "permission-denied"
  | "index-required"
  | "error"
  | "none";

export type AppNextNotificationReadReason =
  | "loading"
  | "signed-out"
  | "account-action-required"
  | "error"
  | "active";

export interface AppNextNotificationReadPolicy {
  canRead: boolean;
  reason: AppNextNotificationReadReason;
  queryScope: "none" | "uid-only" | "uid-workspace-filtered";
}

export interface AppNextNotificationPolicyInput {
  phase: AuthPhase;
  session: AppSession | null;
}

export interface RawAppNextNotificationRecord {
  id?: unknown;
  notificationId?: unknown;
  workspaceId?: unknown;
  uid?: unknown;
  recipientUid?: unknown;
  targetUid?: unknown;
  userId?: unknown;
  recipientUids?: unknown;
  type?: unknown;
  title?: unknown;
  message?: unknown;
  body?: unknown;
  content?: unknown;
  read?: unknown;
  isRead?: unknown;
  readAt?: unknown;
  createdAt?: unknown;
  expiresAt?: unknown;
  source?: unknown;
  scope?: unknown;
}

export interface AppNextNotificationRecord {
  notificationKey: string;
  scopeLabel: string;
  typeLabel: string;
  title: string;
  messageSummary: string;
  createdAt: string;
  createdAtSort: number;
  readLabel: "읽음" | "읽지 않음";
  isRead: boolean;
}

export interface NormalizeAppNextNotificationsOptions {
  uid: string;
  currentWorkspaceId?: string | null;
  maxCount?: number;
  maxMessageLength?: number;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function boolOrFalse(value: unknown): boolean {
  return value === true;
}

function coerceDate(value: unknown): Date | null {
  if (value instanceof Date) return value;

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => unknown }).toDate();
    return date instanceof Date ? date : null;
  }

  if (
    value &&
    typeof value === "object" &&
    "getTime" in value &&
    typeof (value as { getTime: unknown }).getTime === "function"
  ) {
    const time = (value as { getTime: () => number }).getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeRecipientUids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => stringOrNull(item))
    .filter((item): item is string => Boolean(item));
}

function notificationBelongsToUser(
  raw: RawAppNextNotificationRecord,
  uid: string,
): boolean {
  const directFields = [
    raw.uid,
    raw.recipientUid,
    raw.targetUid,
    raw.userId,
  ];

  if (directFields.some((value) => stringOrNull(value) === uid)) return true;
  return normalizeRecipientUids(raw.recipientUids).includes(uid);
}

function notificationMatchesWorkspace(
  raw: RawAppNextNotificationRecord,
  currentWorkspaceId: string | null | undefined,
): boolean {
  const workspaceId = stringOrNull(raw.workspaceId);
  if (!workspaceId) return true;
  if (!currentWorkspaceId) return false;
  return workspaceId === currentWorkspaceId;
}

function isExpired(raw: RawAppNextNotificationRecord): boolean {
  const expiresAt = coerceDate(raw.expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function appNextNotificationReadPolicy({
  phase,
  session,
}: AppNextNotificationPolicyInput): AppNextNotificationReadPolicy {
  if (phase === "initializing" || phase === "loading_session") {
    return {
      canRead: false,
      reason: "loading",
      queryScope: "none",
    };
  }

  if (phase === "signed_out" || !session) {
    return {
      canRead: false,
      reason: "signed-out",
      queryScope: "none",
    };
  }

  if (phase === "account_action_required" || session.status !== "active") {
    return {
      canRead: false,
      reason: "account-action-required",
      queryScope: "none",
    };
  }

  if (phase === "error") {
    return {
      canRead: false,
      reason: "error",
      queryScope: "none",
    };
  }

  return {
    canRead: true,
    reason: "active",
    queryScope: session.currentWorkspaceId ? "uid-workspace-filtered" : "uid-only",
  };
}

export function formatAppNextNotificationTime(value: unknown): string {
  const date = coerceDate(value);
  if (!date || Number.isNaN(date.getTime())) return "시간 확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function notificationSortValue(value: unknown): number {
  const date = coerceDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export function sanitizeAppNextNotificationText(
  value: unknown,
  maxLength = 140,
): string {
  const normalized = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "내용 없음";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function appNextNotificationTypeLabel(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "system") return "시스템";
  if (normalized === "workspace") return "워크스페이스";
  if (normalized === "schedule") return "일정";
  if (normalized === "assignment") return "과제";
  if (normalized === "attendance") return "출결";
  if (normalized === "exam") return "시험";
  if (normalized === "security") return "보안";
  if (normalized === "app") return "서비스";
  return "일반";
}

export function appNextNotificationScopeLabel(
  raw: RawAppNextNotificationRecord,
): string {
  const workspaceId = stringOrNull(raw.workspaceId);
  if (workspaceId) return "workspace";

  const source = String(raw.source ?? raw.scope ?? raw.type ?? "").trim().toLowerCase();
  if (source === "system") return "system";
  return "personal";
}

export function normalizeAppNextNotificationRecord(
  raw: RawAppNextNotificationRecord,
  options: NormalizeAppNextNotificationsOptions,
): AppNextNotificationRecord | null {
  if (!notificationBelongsToUser(raw, options.uid)) return null;
  if (!notificationMatchesWorkspace(raw, options.currentWorkspaceId)) return null;
  if (isExpired(raw)) return null;

  const notificationKey =
    stringOrNull(raw.notificationId) ??
    stringOrNull(raw.id);

  if (!notificationKey) return null;

  const isRead =
    boolOrFalse(raw.read) ||
    boolOrFalse(raw.isRead) ||
    Boolean(raw.readAt);

  return {
    notificationKey,
    scopeLabel: appNextNotificationScopeLabel(raw),
    typeLabel: appNextNotificationTypeLabel(raw.type),
    title: sanitizeAppNextNotificationText(raw.title, 80),
    messageSummary: sanitizeAppNextNotificationText(
      raw.message ?? raw.body ?? raw.content,
      options.maxMessageLength ?? 140,
    ),
    createdAt: formatAppNextNotificationTime(raw.createdAt),
    createdAtSort: notificationSortValue(raw.createdAt),
    readLabel: isRead ? "읽음" : "읽지 않음",
    isRead,
  };
}

export function normalizeAppNextNotificationRecords(
  rows: RawAppNextNotificationRecord[],
  options: NormalizeAppNextNotificationsOptions,
): AppNextNotificationRecord[] {
  const maxCount = options.maxCount ?? 50;
  const seen = new Set<string>();
  const normalized: AppNextNotificationRecord[] = [];

  for (const row of rows) {
    const record = normalizeAppNextNotificationRecord(row, options);
    if (!record || seen.has(record.notificationKey)) continue;

    seen.add(record.notificationKey);
    normalized.push(record);
  }

  return normalized
    .sort((a, b) => b.createdAtSort - a.createdAtSort)
    .slice(0, maxCount);
}

export function parseAppNextLocalFallbackNotifications(
  rawValue: string | null | undefined,
  options: NormalizeAppNextNotificationsOptions,
): AppNextNotificationRecord[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return normalizeAppNextNotificationRecords(parsed, options);
  } catch {
    return [];
  }
}

export function isAppNextNotificationPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "permission-denied" || /permission/i.test(message);
}

export function isAppNextNotificationIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "failed-precondition" || /index/i.test(message);
}

