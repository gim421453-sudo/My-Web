import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

import {
  isWorkspaceRole,
  type WorkspaceRole,
} from "../constants/roles";

interface UpdateWorkspaceMemberRoleParams {
  workspaceId: string;
  targetUid: string;
  newRole: WorkspaceRole;
}

export async function updateWorkspaceMemberRole({
  workspaceId,
  targetUid,
  newRole,
}: UpdateWorkspaceMemberRoleParams):
  Promise<void> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  const normalizedTargetUid =
    targetUid.trim();

  if (!normalizedWorkspaceId) {
    throw new Error(
      "워크스페이스 ID가 없습니다.",
    );
  }

  if (!normalizedTargetUid) {
    throw new Error(
      "역할을 변경할 사용자 UID가 없습니다.",
    );
  }

  if (!isWorkspaceRole(newRole)) {
    throw new Error(
      "올바르지 않은 역할입니다.",
    );
  }

  const memberRef = doc(
    db,
    "workspaces",
    normalizedWorkspaceId,
    "members",
    normalizedTargetUid,
  );

  const memberSnapshot =
    await getDoc(memberRef);

  if (!memberSnapshot.exists()) {
    throw new Error(
      "해당 사용자의 워크스페이스 멤버 문서가 없습니다.",
    );
  }

  await updateDoc(memberRef, {
    role: newRole,

    updatedAt: serverTimestamp(),

    updatedBy:
      auth.currentUser?.uid ?? null,
  });
}