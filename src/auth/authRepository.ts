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
import { db } from "../lib/firebase";
import type { UserDocumentData } from "./authTypes";
import type {
  LegacyMembershipDiagnostic,
  MembershipLookupResult,
  WorkspaceLookupResult,
  WorkspaceDocument,
} from "../workspace/workspaceTypes";
import { isWorkspaceDeletedLike } from "../workspace/workspaceTypes";
import {
  createFirestoreWorkspaceRepository,
  type WorkspaceRepository,
} from "../workspace/workspaceRepository";

export interface UserDocumentResult {
  exists: boolean;
  data: UserDocumentData | null;
}

export interface OwnerWorkspaceMembershipResult {
  exists: boolean;
  workspaceId: string | null;
  role: import("../permissions/roles").WorkspaceRole | null;
}

export interface AuthRepository {
  getUserDocument(uid: string): Promise<UserDocumentResult>;
  hasSystemOwnerDocument(uid: string): Promise<boolean>;
  findPrimaryOwnerWorkspaceMembership(uid: string): Promise<OwnerWorkspaceMembershipResult>;
  getWorkspace(workspaceId: string): Promise<WorkspaceLookupResult>;
  getNestedMembership(workspaceId: string, uid: string): Promise<MembershipLookupResult>;
  getLegacyMembershipDiagnostics(
    workspaceId: string,
    uid: string,
  ): Promise<LegacyMembershipDiagnostic[]>;
}

export function createFirestoreAuthRepository(
  firestore: Firestore = db,
  workspaceRepository: WorkspaceRepository = createFirestoreWorkspaceRepository(firestore),
): AuthRepository {
  return {
    async getUserDocument(uid) {
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

    async hasSystemOwnerDocument(uid) {
      const snap = await getDoc(doc(firestore, "systemOwners", uid));
      return snap.exists();
    },

    async findPrimaryOwnerWorkspaceMembership(uid) {
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
        const membership = await workspaceRepository.getNestedMembership(candidate.id, uid);
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

    getWorkspace(workspaceId) {
      return workspaceRepository.getWorkspace(workspaceId);
    },

    getNestedMembership(workspaceId, uid) {
      return workspaceRepository.getNestedMembership(workspaceId, uid);
    },

    getLegacyMembershipDiagnostics(workspaceId, uid) {
      return workspaceRepository.getLegacyMembershipDiagnostics(workspaceId, uid);
    },
  };
}
