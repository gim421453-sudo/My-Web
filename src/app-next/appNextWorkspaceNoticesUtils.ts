import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export type AppNextWorkspaceNoticeSource =
  | "firestore"
  | "firestore-server"
  | "server-failed"
  | "permission-denied"
  | "quota-exceeded"
  | "index-required"
  | "network-error"
  | "error"
  | "none";

export type AppNextWorkspaceNoticeReadReason =
  | "loading"
  | "signed-out"
  | "pending"
  | "rejected"
  | "disabled"
  | "error"
  | "workspace-missing"
  | "active";

export interface AppNextWorkspaceNoticeReadPolicy {
  canRead: boolean;
  reason: AppNextWorkspaceNoticeReadReason;
  workspacePresent: boolean;
  workspaceRole: string;
}

export interface AppNextWorkspaceNoticePolicyInput {
  phase: AuthPhase;
  session: AppSession | null;
}

export interface RawAppNextWorkspaceNoticeRecord {
  id?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
  title?: unknown;
  name?: unknown;
  content?: unknown;
  message?: unknown;
  body?: unknown;
  description?: unknown;
  memo?: unknown;
  source?: unknown;
  category?: unknown;
  type?: unknown;
  noticeType?: unknown;
  subject?: unknown;
  status?: unknown;
  visibility?: unknown;
  importance?: unknown;
  priority?: unknown;
  scope?: unknown;
  createdFrom?: unknown;
  pinned?: unknown;
  isPinned?: unknown;
  isSystem?: unknown;
  system?: unknown;
  visible?: unknown;
  active?: unknown;
  noticeDate?: unknown;
  notice_date?: unknown;
  deadline?: unknown;
  deadline_required?: unknown;
  deadline_date?: unknown;
  date?: unknown;
  timestamp?: unknown;
  publishedAt?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  updatedAt?: unknown;
  expiresAt?: unknown;
  visibleUntil?: unknown;
  autoHideAt?: unknown;
  authorName?: unknown;
  authorUid?: unknown;
  authorEmail?: unknown;
  authorRole?: unknown;
  createdByName?: unknown;
  createdByEmail?: unknown;
  writerName?: unknown;
  displayName?: unknown;
  author?: unknown;
  created_by?: unknown;
  text?: unknown;
  summary?: unknown;
  attachments?: unknown;
  link?: unknown;
  url?: unknown;
}

export type AppNextWorkspaceNoticeSchemaKind =
  | "modern_workspace_notice"
  | "legacy_general_notice"
  | "legacy_school_notice"
  | "legacy_academy_notice"
  | "system_notice_reference"
  | "unknown_notice_schema";

export interface AppNextWorkspaceNoticeDetailItem {
  label: string;
  value: string;
}

export interface AppNextWorkspaceNoticeRecord {
  noticeKey: string;
  schemaKind: AppNextWorkspaceNoticeSchemaKind;
  title: string;
  summary: string;
  detailText: string;
  categoryLabel: string;
  scopeLabel: string;
  priorityLabel: string;
  pinnedLabel: string;
  isPinned: boolean;
  publishedAt: string;
  publishedAtSort: number;
  sourceOrder: number;
  authorLabel: string | null;
  hasAttachments: boolean;
  hasExternalLink: boolean;
  isExpired: boolean;
  detailItems: AppNextWorkspaceNoticeDetailItem[];
}

export interface AppNextWorkspaceNoticeSchemaSequenceItem {
  order: number;
  schemaKind: AppNextWorkspaceNoticeSchemaKind;
  sourceKind: string;
  categoryField: string;
  dateField: string;
  contentField: string;
  authorField: string;
  hasDate: boolean;
  hasSafeAuthor: boolean;
}

export interface NormalizeAppNextWorkspaceNoticeOptions {
  workspaceId: string;
  maxCount?: number;
  maxSummaryLength?: number;
}

export interface NormalizeAppNextWorkspaceNoticeResult {
  records: AppNextWorkspaceNoticeRecord[];
  rawReadCount: number;
  filteredCount: number;
  displayedCount: number;
  excludedCount: number;
  excludedReasons: Record<string, number>;
  sortFieldUsed: "legacy-workspace-notice-order";
  sortPolicy: string;
  pinnedFieldUsed: "legacy-display-only";
  authorFieldUsed: string;
  contentFieldUsed: string;
  schemaKindCounts: Record<AppNextWorkspaceNoticeSchemaKind, number>;
  unknownSchemaCount: number;
  sourceCounts: Record<string, number>;
  contentMappingBySchema: Record<string, string>;
  authorMappingBySchema: Record<string, string>;
  dateMappingBySchema: Record<string, string>;
  categoryMappingBySchema: Record<string, string>;
  schemaSequence: AppNextWorkspaceNoticeSchemaSequenceItem[];
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function boolValue(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
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

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

function noticeDateValue(raw: RawAppNextWorkspaceNoticeRecord): unknown {
  const schemaKind = classifyAppNextWorkspaceNoticeSchema(raw);
  if (schemaKind === "legacy_general_notice" || schemaKind === "legacy_school_notice" || schemaKind === "legacy_academy_notice") {
    return firstPresent(
      raw.noticeDate,
      raw.notice_date,
      raw.date,
      raw.publishedAt,
      raw.createdAt,
      raw.created_at,
      raw.updatedAt,
      raw.timestamp,
    );
  }

  return firstPresent(
    raw.publishedAt,
    raw.createdAt,
    raw.created_at,
    raw.updatedAt,
    raw.noticeDate,
    raw.notice_date,
    raw.date,
    raw.timestamp,
  );
}

function noticeSortValue(raw: RawAppNextWorkspaceNoticeRecord): number {
  const date = coerceDate(noticeDateValue(raw));
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function noticeBelongsToWorkspace(
  raw: RawAppNextWorkspaceNoticeRecord,
  workspaceId: string,
): boolean {
  const rowWorkspaceId = stringOrNull(raw.workspaceId) ?? stringOrNull(raw.workspace_id);
  return !rowWorkspaceId || rowWorkspaceId === workspaceId;
}

function isExpired(raw: RawAppNextWorkspaceNoticeRecord): boolean {
  const expiresAt = coerceDate(firstPresent(
    raw.expiresAt,
    raw.visibleUntil,
    raw.autoHideAt,
  ));
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

const SYSTEM_NOTICE_VALUES = new Set([
  "시스템",
  "system",
  "시스템공지",
  "시스템 공지",
]);

function normalizedLowerText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedSourceText(raw: RawAppNextWorkspaceNoticeRecord): string {
  return String(firstPresent(
    raw.source,
    raw.category,
    raw.type,
    raw.noticeType,
    raw.subject,
    raw.scope,
    raw.visibility,
  ) ?? "").trim();
}

function isSystemNotice(raw: RawAppNextWorkspaceNoticeRecord): boolean {
  const source = normalizedSourceText(raw);
  return boolValue(raw.isSystem)
    || boolValue(raw.system)
    || SYSTEM_NOTICE_VALUES.has(source)
    || SYSTEM_NOTICE_VALUES.has(source.toLowerCase());
}

function hasLegacyNoticeFields(raw: RawAppNextWorkspaceNoticeRecord): boolean {
  return firstPresent(
    raw.noticeDate,
    raw.notice_date,
    raw.importance,
    raw.deadline,
    raw.deadline_required,
    raw.deadline_date,
    raw.memo,
  ) !== undefined;
}

function hasModernWorkspaceFields(raw: RawAppNextWorkspaceNoticeRecord): boolean {
  return firstPresent(
    raw.createdFrom,
    raw.scope,
    raw.authorRole,
    raw.priority,
    raw.authorUid,
    raw.authorEmail,
  ) !== undefined
    || normalizedLowerText(raw.visibility) === "workspace";
}

export function classifyAppNextWorkspaceNoticeSchema(
  raw: RawAppNextWorkspaceNoticeRecord,
): AppNextWorkspaceNoticeSchemaKind {
  if (isSystemNotice(raw)) return "system_notice_reference";

  const source = normalizedSourceText(raw);
  const legacy = hasLegacyNoticeFields(raw);

  if (legacy) {
    if (source.includes("학교") || source.toLowerCase() === "school") return "legacy_school_notice";
    if (source.includes("학원") || source.toLowerCase() === "academy") return "legacy_academy_notice";
    return "legacy_general_notice";
  }

  if (hasModernWorkspaceFields(raw)) return "modern_workspace_notice";
  return "unknown_notice_schema";
}

function exclusionReason(
  raw: RawAppNextWorkspaceNoticeRecord,
  workspaceId: string,
): string | null {
  if (!noticeBelongsToWorkspace(raw, workspaceId)) return "workspace-mismatch";

  const status = String(raw.status ?? "active").trim().toLowerCase();
  if (["deleted", "archived", "hidden"].includes(status)) {
    return `status-${status}`;
  }

  if (isExpired(raw)) return "expired";
  if (!stringOrNull(raw.id)) return "missing-document-id";
  return null;
}

function safeNoticeText(value: unknown, maxLength: number): string {
  const normalized = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "내용 없음";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function legacyMetaLabel(raw: RawAppNextWorkspaceNoticeRecord): string | null {
  const source = stringOrNull(firstPresent(raw.source, raw.category));
  const subject = stringOrNull(raw.subject);
  const date = stringOrNull(raw.date);
  const label = [date, subject, source].filter(Boolean).join(" · ");
  return label || null;
}

function categoryLabel(raw: RawAppNextWorkspaceNoticeRecord, schemaKind: AppNextWorkspaceNoticeSchemaKind): string {
  const legacyLabel = legacyMetaLabel(raw);
  if (legacyLabel) return safeNoticeText(legacyLabel, 80);
  if (schemaKind === "system_notice_reference") return "시스템";
  if (schemaKind === "modern_workspace_notice") return "워크스페이스";
  return safeNoticeText(
    firstPresent(raw.source, raw.category, raw.subject, raw.type, raw.noticeType, "워크스페이스"),
    80,
  );
}

function scopeLabel(raw: RawAppNextWorkspaceNoticeRecord, schemaKind: AppNextWorkspaceNoticeSchemaKind): string {
  const scope = normalizedLowerText(firstPresent(raw.scope, raw.visibility));
  if (schemaKind === "system_notice_reference") return "시스템";
  if (scope === "workspace" || scope.includes("workspace")) return "워크스페이스";
  if (scope === "public" || scope.includes("공개")) return "공개";
  if (scope === "private" || scope.includes("비공개")) return "비공개";
  if (schemaKind === "modern_workspace_notice") return "워크스페이스";
  return "-";
}

function priorityLabel(value: unknown): string {
  const normalized = String(value ?? "normal").trim().toLowerCase();
  if (normalized === "critical" || normalized === "urgent" || normalized === "very_high" || normalized === "매우 높음") return "매우 높음";
  if (normalized === "high" || normalized === "높음") return "높음";
  if (normalized === "low" || normalized === "낮음") return "낮음";
  return "보통";
}

function safeAuthorLabel(raw: RawAppNextWorkspaceNoticeRecord): string | null {
  const author =
    stringOrNull(raw.authorName) ??
    stringOrNull(raw.createdByName) ??
    stringOrNull(raw.writerName) ??
    stringOrNull(raw.displayName) ??
    stringOrNull(raw.author) ??
    stringOrNull(raw.created_by);

  if (!author) return null;
  if (author.includes("@")) return null;
  if (/^[A-Za-z0-9_-]{20,}$/.test(author)) return null;
  return safeNoticeText(author, 30);
}

function noticeContentValue(raw: RawAppNextWorkspaceNoticeRecord): unknown {
  return firstPresent(
    raw.content,
    raw.memo,
    raw.description,
    raw.message,
    raw.body,
    raw.text,
    raw.summary,
  );
}

function noticeContentFieldName(raw: RawAppNextWorkspaceNoticeRecord): string {
  if (stringOrNull(raw.content)) return "content";
  if (stringOrNull(raw.memo)) return "memo";
  if (stringOrNull(raw.description)) return "description";
  if (stringOrNull(raw.message)) return "message";
  if (stringOrNull(raw.body)) return "body";
  if (stringOrNull(raw.text)) return "text";
  if (stringOrNull(raw.summary)) return "summary";
  return "none";
}

function noticeAuthorFieldName(raw: RawAppNextWorkspaceNoticeRecord): string {
  if (stringOrNull(raw.authorName)) return "authorName";
  if (stringOrNull(raw.createdByName)) return "createdByName";
  if (stringOrNull(raw.writerName)) return "writerName";
  if (stringOrNull(raw.displayName)) return "displayName";
  if (stringOrNull(raw.author)) return "author";
  if (stringOrNull(raw.created_by)) return "created_by";
  return "none";
}

function noticeDateFieldName(raw: RawAppNextWorkspaceNoticeRecord): string {
  const schemaKind = classifyAppNextWorkspaceNoticeSchema(raw);
  const fields: Array<[string, unknown]> =
    schemaKind === "legacy_general_notice" || schemaKind === "legacy_school_notice" || schemaKind === "legacy_academy_notice"
      ? [
        ["noticeDate", raw.noticeDate],
        ["notice_date", raw.notice_date],
        ["date", raw.date],
        ["publishedAt", raw.publishedAt],
        ["createdAt", raw.createdAt],
        ["created_at", raw.created_at],
        ["updatedAt", raw.updatedAt],
        ["timestamp", raw.timestamp],
      ]
      : [
        ["publishedAt", raw.publishedAt],
        ["createdAt", raw.createdAt],
        ["created_at", raw.created_at],
        ["updatedAt", raw.updatedAt],
        ["noticeDate", raw.noticeDate],
        ["notice_date", raw.notice_date],
        ["date", raw.date],
        ["timestamp", raw.timestamp],
      ];

  return fields.find(([, value]) => firstPresent(value) !== undefined)?.[0] ?? "none";
}

function noticeCategoryFieldName(raw: RawAppNextWorkspaceNoticeRecord): string {
  if (legacyMetaLabel(raw)) return "date + subject + source/category";
  if (classifyAppNextWorkspaceNoticeSchema(raw) === "modern_workspace_notice") return "scope/visibility";
  if (stringOrNull(raw.source)) return "source";
  if (stringOrNull(raw.category)) return "category";
  if (stringOrNull(raw.subject)) return "subject";
  if (stringOrNull(raw.type)) return "type";
  if (stringOrNull(raw.noticeType)) return "noticeType";
  return "default-workspace";
}

function addCount<T extends string>(target: Record<T, number>, key: T) {
  target[key] = (target[key] ?? 0) + 1;
}

function addStringCount(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function hasArrayItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasExternalLink(raw: RawAppNextWorkspaceNoticeRecord): boolean {
  return Boolean(stringOrNull(raw.link) || stringOrNull(raw.url));
}

export function appNextWorkspaceNoticeReadPolicy({
  phase,
  session,
}: AppNextWorkspaceNoticePolicyInput): AppNextWorkspaceNoticeReadPolicy {
  if (phase === "initializing" || phase === "loading_session") {
    return {
      canRead: false,
      reason: "loading",
      workspacePresent: false,
      workspaceRole: "-",
    };
  }

  if (phase === "signed_out" || !session) {
    return {
      canRead: false,
      reason: "signed-out",
      workspacePresent: false,
      workspaceRole: "-",
    };
  }

  if (phase === "error") {
    return {
      canRead: false,
      reason: "error",
      workspacePresent: Boolean(session.currentWorkspaceId),
      workspaceRole: session.currentWorkspaceRole ?? "-",
    };
  }

  if (session.status !== "active" || phase === "account_action_required") {
    return {
      canRead: false,
      reason: session.status === "active" ? "error" : session.status,
      workspacePresent: Boolean(session.currentWorkspaceId),
      workspaceRole: session.currentWorkspaceRole ?? "-",
    };
  }

  if (!session.currentWorkspaceId) {
    return {
      canRead: false,
      reason: "workspace-missing",
      workspacePresent: false,
      workspaceRole: session.currentWorkspaceRole ?? "-",
    };
  }

  return {
    canRead: true,
    reason: "active",
    workspacePresent: true,
    workspaceRole: session.currentWorkspaceRole ?? (session.isSystemOwner ? "system_owner(global)" : "-"),
  };
}

export function formatAppNextWorkspaceNoticeTime(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date = coerceDate(value);
  if (!date || Number.isNaN(date.getTime())) return "시간 확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function detailItemsForRecord(
  raw: RawAppNextWorkspaceNoticeRecord,
  record: Omit<AppNextWorkspaceNoticeRecord, "detailItems">,
): AppNextWorkspaceNoticeDetailItem[] {
  const items: AppNextWorkspaceNoticeDetailItem[] = [
    { label: "제목", value: record.title },
    { label: "전체 본문", value: record.detailText },
    { label: "분류", value: record.categoryLabel },
    { label: "범위", value: record.scopeLabel },
    { label: "게시 시각", value: record.publishedAt },
    { label: "중요도", value: record.priorityLabel },
    { label: "고정 여부", value: record.pinnedLabel },
    { label: "첨부", value: record.hasAttachments ? "있음" : "없음" },
    { label: "외부 링크", value: record.hasExternalLink ? "있음" : "없음" },
  ];
  if (record.authorLabel) items.splice(6, 0, { label: "작성자", value: record.authorLabel });
  if (stringOrNull(raw.deadline) || stringOrNull(raw.deadline_required) || stringOrNull(raw.deadline_date)) {
    items.push({
      label: "마감",
      value: safeNoticeText(firstPresent(raw.deadline, raw.deadline_required, raw.deadline_date), 80),
    });
  }
  return items.filter((item) => item.value.trim() && item.value !== "내용 없음");
}

function sortWorkspaceNoticeRecords(
  records: AppNextWorkspaceNoticeRecord[],
): AppNextWorkspaceNoticeRecord[] {
  return [...records].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
    if (a.publishedAtSort !== b.publishedAtSort) return b.publishedAtSort - a.publishedAtSort;
    if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
    return a.noticeKey.localeCompare(b.noticeKey);
  });
}

export function normalizeAppNextWorkspaceNoticeRecord(
  raw: RawAppNextWorkspaceNoticeRecord,
  options: NormalizeAppNextWorkspaceNoticeOptions,
  sourceOrder = 0,
): AppNextWorkspaceNoticeRecord | null {
  if (exclusionReason(raw, options.workspaceId)) return null;

  const noticeKey = stringOrNull(raw.id);
  if (!noticeKey) return null;

  const schemaKind = classifyAppNextWorkspaceNoticeSchema(raw);
  const dateValue = noticeDateValue(raw);
  const isPinned = boolValue(raw.pinned) || boolValue(raw.isPinned);
  const recordBase: Omit<AppNextWorkspaceNoticeRecord, "detailItems"> = {
    noticeKey,
    schemaKind,
    title: safeNoticeText(firstPresent(raw.title, raw.name, "제목 없음"), 80),
    summary: safeNoticeText(
      noticeContentValue(raw),
      options.maxSummaryLength ?? 140,
    ),
    detailText: safeNoticeText(
      noticeContentValue(raw),
      2000,
    ),
    categoryLabel: categoryLabel(raw, schemaKind),
    scopeLabel: scopeLabel(raw, schemaKind),
    priorityLabel: priorityLabel(firstPresent(raw.importance, raw.priority)),
    pinnedLabel: isPinned ? "고정" : "-",
    isPinned,
    publishedAt: formatAppNextWorkspaceNoticeTime(dateValue),
    publishedAtSort: noticeSortValue(raw),
    sourceOrder,
    authorLabel: safeAuthorLabel(raw),
    hasAttachments: hasArrayItems(raw.attachments),
    hasExternalLink: hasExternalLink(raw),
    isExpired: false,
  };

  return {
    ...recordBase,
    detailItems: detailItemsForRecord(raw, recordBase),
  };
}

export function normalizeAppNextWorkspaceNoticeRecords(
  rows: RawAppNextWorkspaceNoticeRecord[],
  options: NormalizeAppNextWorkspaceNoticeOptions,
): NormalizeAppNextWorkspaceNoticeResult {
  const maxCount = options.maxCount ?? Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  const normalized: AppNextWorkspaceNoticeRecord[] = [];
  const excludedReasons: Record<string, number> = {};
  const schemaKindCounts: Record<AppNextWorkspaceNoticeSchemaKind, number> = {
    modern_workspace_notice: 0,
    legacy_general_notice: 0,
    legacy_school_notice: 0,
    legacy_academy_notice: 0,
    system_notice_reference: 0,
    unknown_notice_schema: 0,
  };
  const sourceCounts: Record<string, number> = {};
  const contentMappingBySchema: Record<string, string> = {};
  const authorMappingBySchema: Record<string, string> = {};
  const dateMappingBySchema: Record<string, string> = {};
  const categoryMappingBySchema: Record<string, string> = {};
  const schemaSequence: AppNextWorkspaceNoticeSchemaSequenceItem[] = [];

  const addExcludedReason = (reason: string) => {
    excludedReasons[reason] = (excludedReasons[reason] ?? 0) + 1;
  };

  rows.forEach((row, index) => {
    const schemaKind = classifyAppNextWorkspaceNoticeSchema(row);
    const sourceKind = safeNoticeText(firstPresent(row.source, row.category, row.scope, row.visibility, "none"), 60);
    const categoryField = noticeCategoryFieldName(row);
    const dateField = noticeDateFieldName(row);
    const contentField = noticeContentFieldName(row);
    const authorField = noticeAuthorFieldName(row);
    addCount(schemaKindCounts, schemaKind);
    addStringCount(sourceCounts, sourceKind);
    contentMappingBySchema[schemaKind] ||= contentField;
    authorMappingBySchema[schemaKind] ||= authorField;
    dateMappingBySchema[schemaKind] ||= dateField;
    categoryMappingBySchema[schemaKind] ||= categoryField;

    const reason = exclusionReason(row, options.workspaceId);
    if (reason) {
      addExcludedReason(reason);
      return;
    }

    const record = normalizeAppNextWorkspaceNoticeRecord(row, options, index);
    if (!record) {
      addExcludedReason("normalize-failed");
      return;
    }

    if (seen.has(record.noticeKey)) {
      addExcludedReason("duplicate-document-id");
      return;
    }

    seen.add(record.noticeKey);
    schemaSequence.push({
      order: index + 1,
      schemaKind,
      sourceKind,
      categoryField,
      dateField,
      contentField,
      authorField,
      hasDate: dateField !== "none",
      hasSafeAuthor: Boolean(safeAuthorLabel(row)),
    });
    normalized.push(record);
  });

  const sorted = sortWorkspaceNoticeRecords(normalized);
  const records = Number.isFinite(maxCount)
    ? sorted.slice(0, maxCount)
    : sorted;
  const trimmedCount = Math.max(0, normalized.length - records.length);
  if (trimmedCount) excludedReasons["display-limit"] = trimmedCount;

  return {
    records,
    rawReadCount: rows.length,
    filteredCount: normalized.length,
    displayedCount: records.length,
    excludedCount: rows.length - records.length,
    excludedReasons,
    sortFieldUsed: "legacy-workspace-notice-order",
    sortPolicy: "pinned desc -> published/created/notice date desc -> legacy snapshot order -> document id asc",
    pinnedFieldUsed: "legacy-display-only",
    authorFieldUsed: "authorName -> createdByName -> writerName -> displayName -> author -> created_by",
    contentFieldUsed: "content -> memo -> description -> message -> body -> text -> summary",
    schemaKindCounts,
    unknownSchemaCount: schemaKindCounts.unknown_notice_schema,
    sourceCounts,
    contentMappingBySchema,
    authorMappingBySchema,
    dateMappingBySchema,
    categoryMappingBySchema,
    schemaSequence,
  };
}

export function isAppNextWorkspaceNoticePermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "permission-denied" || /permission|insufficient/i.test(message);
}

export function isAppNextWorkspaceNoticeQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "resource-exhausted" || /quota|resource.exhausted/i.test(message);
}

export function isAppNextWorkspaceNoticeIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "failed-precondition" || /index/i.test(message);
}

export function isAppNextWorkspaceNoticeNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "unavailable" || /network|offline|failed to get document/i.test(message);
}
