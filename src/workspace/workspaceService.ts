import { AuthSessionError } from "../auth/authErrors";
import { normalizeWorkspaceMembership } from "./membershipService";
import {
  createFirestoreWorkspaceRepository,
  type WorkspaceRepository,
} from "./workspaceRepository";
import { isWorkspaceDeletedLike } from "./workspaceTypes";

export interface SwitchWorkspaceParams {
  uid: string;
  workspaceId: string | null;
  repository?: WorkspaceRepository;
}

export async function switchWorkspaceForUser({
  uid,
  workspaceId,
  repository = createFirestoreWorkspaceRepository(),
}: SwitchWorkspaceParams): Promise<void> {
  if (!uid) {
    throw new AuthSessionError("AUTH_REQUIRED", "로그인된 사용자가 없습니다.");
  }

  if (workspaceId === null) {
    await repository.updateUserCurrentWorkspace(uid, null);
    return;
  }

  const workspace = await repository.getWorkspace(workspaceId);
  if (!workspace.exists || !workspace.workspace || isWorkspaceDeletedLike(workspace.workspace)) {
    throw new AuthSessionError("WORKSPACE_NOT_FOUND", "워크스페이스를 찾을 수 없습니다.");
  }

  const membership = await repository.getNestedMembership(workspaceId, uid);
  if (!membership.exists) {
    throw new AuthSessionError("MEMBERSHIP_NOT_FOUND", "워크스페이스 멤버십이 없습니다.");
  }

  const normalized = normalizeWorkspaceMembership(membership.membership);
  if (!normalized.isUsable) {
    const invalidRole = normalized.warnings.some((warning) => warning.code === "INVALID_WORKSPACE_ROLE");
    throw new AuthSessionError(
      invalidRole ? "INVALID_WORKSPACE_ROLE" : "MEMBERSHIP_DISABLED",
      invalidRole ? "워크스페이스 역할이 올바르지 않습니다." : "워크스페이스 멤버십이 활성 상태가 아닙니다.",
    );
  }

  await repository.updateUserCurrentWorkspace(uid, workspaceId);
}
