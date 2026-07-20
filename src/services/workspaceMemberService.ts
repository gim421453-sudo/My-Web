import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  isWorkspaceRole,
  type WorkspaceRole,
} from "../constants/roles";

export interface WorkspaceMemberRow {
  uid: string;
  role: WorkspaceRole;

  status:
    | "active"
    | "invited"
    | "disabled";

  displayName: string;
  email: string | null;
}

export type WorkspaceMemberCursor =
  QueryDocumentSnapshot<
    DocumentData
  > | null;

export interface WorkspaceMemberPage {
  rows: WorkspaceMemberRow[];
  nextCursor:
    WorkspaceMemberCursor;
  hasMore: boolean;
}

interface GetWorkspaceMemberPageParams {
  workspaceId: string;

  pageSize?: number;

  cursor?:
    WorkspaceMemberCursor;
}

export async function getWorkspaceMemberPage({
  workspaceId,
  pageSize = 50,
  cursor = null,
}: GetWorkspaceMemberPageParams):
  Promise<WorkspaceMemberPage> {
  const normalizedWorkspaceId =
    workspaceId.trim();

  if (!normalizedWorkspaceId) {
    return {
      rows: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const safePageSize =
    Math.min(
      Math.max(
        Math.floor(pageSize),
        1,
      ),
      100,
    );

  const membersRef = collection(
    db,
    "workspaces",
    normalizedWorkspaceId,
    "members",
  );

  const membersQuery = cursor
    ? query(
        membersRef,
        orderBy(documentId()),
        startAfter(cursor),
        limit(safePageSize),
      )
    : query(
        membersRef,
        orderBy(documentId()),
        limit(safePageSize),
      );

  const snapshot =
    await getDocs(
      membersQuery,
    );

  const rows =
    snapshot.docs
      .map((memberDocument) => {
        const data =
          memberDocument.data();

        if (
          !isWorkspaceRole(
            data.role,
          )
        ) {
          console.warn(
            "잘못된 멤버 역할:",
            memberDocument.id,
            data.role,
          );

          return null;
        }

        const status =
          data.status === "active" ||
          data.status === "invited" ||
          data.status === "disabled"
            ? data.status
            : "disabled";

        return {
          uid: memberDocument.id,

          role: data.role,

          status,

          displayName:
            typeof data.displayName ===
              "string"
              ? data.displayName
              : "이름 없음",

          email:
            typeof data.email ===
              "string"
              ? data.email
              : null,
        };
      })
      .filter(
        (
          member,
        ): member is WorkspaceMemberRow =>
          member !== null,
      );

  const nextCursor =
    snapshot.docs.length > 0
      ? snapshot.docs[
          snapshot.docs.length - 1
        ]
      : null;

  return {
    rows,
    nextCursor,

    hasMore:
      snapshot.size ===
      safePageSize,
  };
}