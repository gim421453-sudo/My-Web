import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  LegacyMembershipDiagnostic,
  MembershipLookupResult,
  WorkspaceDocument,
  WorkspaceLookupResult,
} from "./workspaceTypes";

export interface WorkspaceRepository {
  getWorkspace(workspaceId: string): Promise<WorkspaceLookupResult>;
  getNestedMembership(workspaceId: string, uid: string): Promise<MembershipLookupResult>;
  getLegacyMembershipDiagnostics(
    workspaceId: string,
    uid: string,
  ): Promise<LegacyMembershipDiagnostic[]>;
  updateUserCurrentWorkspace(uid: string, workspaceId: string | null): Promise<void>;
}

export function createFirestoreWorkspaceRepository(
  firestore: Firestore = db,
): WorkspaceRepository {
  return {
    async getWorkspace(workspaceId) {
      const snap = await getDoc(doc(firestore, "workspaces", workspaceId));
      if (!snap.exists()) {
        return { exists: false, workspace: null };
      }

      return {
        exists: true,
        workspace: {
          id: snap.id,
          ...snap.data(),
        } as WorkspaceDocument,
      };
    },

    async getNestedMembership(workspaceId, uid) {
      const snap = await getDoc(doc(firestore, "workspaces", workspaceId, "members", uid));
      if (!snap.exists()) {
        return { exists: false, membership: null };
      }

      return {
        exists: true,
        membership: {
          uid,
          ...snap.data(),
        } as MembershipLookupResult["membership"],
      };
    },

    async getLegacyMembershipDiagnostics(workspaceId, uid) {
      const docId = `${workspaceId}_${uid}`;
      const [snake, camel] = await Promise.all([
        getDoc(doc(firestore, "workspace_members", docId)),
        getDoc(doc(firestore, "workspaceMembers", docId)),
      ]);

      return [
        {
          source: "workspace_members",
          exists: snake.exists(),
          role: snake.exists() ? snake.data().role : undefined,
          status: snake.exists() ? snake.data().status : undefined,
        },
        {
          source: "workspaceMembers",
          exists: camel.exists(),
          role: camel.exists() ? camel.data().role : undefined,
          status: camel.exists() ? camel.data().status : undefined,
        },
      ];
    },

    async updateUserCurrentWorkspace(uid, workspaceId) {
      await updateDoc(doc(firestore, "users", uid), {
        currentWorkspaceId: workspaceId,
        updatedAt: serverTimestamp(),
      });
    },
  };
}
