import type {
  AppSession,
  AuthPhase,
} from "../auth/authTypes";

export const APP_NEXT_NOTICE_WRITE_ROLES = [
  "super_manager",
  "manager",
  "teacher",
  "normal",
] as const;

export interface AppNextWorkspaceNoticeWritePolicy {
  canCreate: boolean;
  canManageAll: boolean;
  canWriteAsWorkspaceRole: boolean;
  uid: string;
  workspaceId: string;
}

export interface AppNextWorkspaceNoticeManagementRecord {
  id: string;
  title: string;
  content: string;
  authorUid: string;
}

export interface AppNextWorkspaceNoticeDraft {
  title: string;
  content: string;
}

export function appNextWorkspaceNoticeWritePolicy(input: {
  phase: AuthPhase;
  session: AppSession | null;
}): AppNextWorkspaceNoticeWritePolicy {
  const { phase, session } = input;
  const activeWorkspaceSession = Boolean(
    phase === "authenticated"
    && session?.status === "active"
    && session.uid
    && session.currentWorkspaceId,
  );
  const isSystemOwner = Boolean(
    activeWorkspaceSession
    && session?.isSystemOwner
    && session.globalRole === "system_owner",
  );
  const role = session?.currentWorkspaceRole ?? null;
  const canWriteAsWorkspaceRole = Boolean(
    activeWorkspaceSession
    && role
    && APP_NEXT_NOTICE_WRITE_ROLES.includes(role as (typeof APP_NEXT_NOTICE_WRITE_ROLES)[number]),
  );

  return {
    canCreate: activeWorkspaceSession && (isSystemOwner || canWriteAsWorkspaceRole),
    canManageAll: activeWorkspaceSession && (
      isSystemOwner || role === "super_manager" || role === "manager"
    ),
    canWriteAsWorkspaceRole,
    uid: activeWorkspaceSession ? session?.uid ?? "" : "",
    workspaceId: activeWorkspaceSession ? session?.currentWorkspaceId ?? "" : "",
  };
}

export function canManageAppNextWorkspaceNotice(
  policy: AppNextWorkspaceNoticeWritePolicy,
  authorUid: string,
): boolean {
  return policy.canManageAll || (
    policy.canWriteAsWorkspaceRole
    && Boolean(policy.uid)
    && authorUid === policy.uid
  );
}

export function validateAppNextWorkspaceNoticeDraft(
  draft: AppNextWorkspaceNoticeDraft,
): string | null {
  const title = draft.title.trim();
  const content = draft.content.trim();

  if (!title) return "제목을 입력해 주세요.";
  if (title.length > 120) return "제목은 120자 이내로 입력해 주세요.";
  if (!content) return "내용을 입력해 주세요.";
  if (content.length > 5000) return "내용은 5,000자 이내로 입력해 주세요.";
  return null;
}

export function appNextWorkspaceNoticeWriteErrorMessage(
  error: unknown,
  action: "create" | "update" | "delete",
): string {
  const code = String((error as { code?: unknown })?.code ?? "")
    .replace(/^firestore\//, "");
  const actionLabel = action === "create" ? "등록" : action === "update" ? "수정" : "삭제";

  if (code === "permission-denied") return `공지 ${actionLabel} 권한이 없습니다. 계정 권한을 다시 확인해 주세요.`;
  if (code === "unavailable" || code === "deadline-exceeded") return `네트워크 오류로 공지 ${actionLabel}를 확인하지 못했습니다. 연결을 확인하고 목록을 다시 조회해 주세요.`;
  if (code === "resource-exhausted") return `Firestore 요청 한도로 공지 ${actionLabel}를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.`;
  if (code === "invalid-argument") return `공지 ${actionLabel} 입력값을 확인해 주세요.`;
  return `공지 ${actionLabel} 결과를 서버에서 확인하지 못했습니다. 중복 작업 전에 목록을 먼저 새로고침해 주세요.`;
}
