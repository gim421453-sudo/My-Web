import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  type Firestore,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type {
  AuthRepository,
  OwnerWorkspaceMembershipResult,
  UserDocumentResult,
} from "../authRepository";
import type {
  LegacyMembershipDiagnostic,
  MembershipLookupResult,
  WorkspaceDocument,
  WorkspaceLookupResult,
} from "../../workspace/workspaceTypes";
import { isWorkspaceDeletedLike } from "../../workspace/workspaceTypes";

export type ShadowReadRepository = Pick<
  AuthRepository,
  | "getUserDocument"
  | "hasSystemOwnerDocument"
  | "findPrimaryOwnerWorkspaceMembership"
  | "getWorkspace"
  | "getNestedMembership"
  | "getLegacyMembershipDiagnostics"
>;

export function createShadowReadRepository(
  firestore: Firestore = db,
): ShadowReadRepository {
  async function getWorkspace(workspaceId: string): Promise<WorkspaceLookupResult> {
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
  }

  async function getNestedMembership(
    workspaceId: string,
    uid: string,
  ): Promise<MembershipLookupResult> {
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
  }

  return {
    async getUserDocument(uid): Promise<UserDocumentResult> {
      const snap = await getDoc(doc(firestore, "users", uid));
      if (!snap.exists()) {
        return { exists: false, data: null };
      }

      return {
        exists: true,
        data: {
          uid,
          ...snap.data(),
        },
      };
    },

    async hasSystemOwnerDocument(uid): Promise<boolean> {
      const snap = await getDoc(doc(firestore, "systemOwners", uid));
      return snap.exists();
    },

    async findPrimaryOwnerWorkspaceMembership(
      uid,
    ): Promise<OwnerWorkspaceMembershipResult> {
      const snapshot = await getDocs(query(
        collection(firestore, "workspaces"),
        where("ownerUid", "==", uid),
        limit(25),
      ));

      const candidates = snapshot.docs
        .map((snap) => ({
          id: snap.id,
          data: {
            id: snap.id,
            ...snap.data(),
          } as WorkspaceDocument,
        }))
        .filter((workspace) => !isWorkspaceDeletedLike(workspace.data))
        .sort((left, right) => {
          const leftOwnerPrefix = left.id.startsWith("owner_ws_") ? 0 : 1;
          const rightOwnerPrefix = right.id.startsWith("owner_ws_") ? 0 : 1;
          return leftOwnerPrefix - rightOwnerPrefix || left.id.localeCompare(right.id);
        });

      for (const candidate of candidates) {
        const membership = await getNestedMembership(candidate.id, uid);
        if (
          membership.exists &&
          membership.membership?.status &&
          ["active", "accepted"].includes(String(membership.membership.status)) &&
          membership.membership.role === "super_manager"
        ) {
          return {
            exists: true,
            workspaceId: candidate.id,
            role: "super_manager",
          };
        }
      }

      return {
        exists: false,
        workspaceId: null,
        role: null,
      };
    },

    getWorkspace,

    getNestedMembership,

    async getLegacyMembershipDiagnostics(workspaceId, uid): Promise<LegacyMembershipDiagnostic[]> {
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
  };
}
