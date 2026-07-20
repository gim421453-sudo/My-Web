import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth } from "../lib/firebase";
import { db } from "../lib/firebase";

export async function switchWorkspace(
  workspaceId: string,
): Promise<void> {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    throw new Error(
      "로그인된 사용자가 없습니다.",
    );
  }

  const memberRef = doc(
    db,
    "workspaces",
    workspaceId,
    "members",
    firebaseUser.uid,
  );

  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    throw new Error(
      "해당 워크스페이스에 가입되어 있지 않습니다.",
    );
  }

  const memberData = memberSnap.data();

  if (memberData.status !== "active") {
    throw new Error(
      "해당 워크스페이스에서 비활성 상태입니다.",
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      firebaseUser.uid,
    ),
    {
      currentWorkspaceId: workspaceId,
      updatedAt: serverTimestamp(),
    },
  );
}