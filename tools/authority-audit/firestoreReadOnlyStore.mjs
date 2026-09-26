import { FieldPath } from "firebase-admin/firestore";
import { AUTHORITY_SCOPES } from "./authorityInventory.mjs";

const SCOPE_COLLECTIONS = Object.freeze({
  systemOwners: "systemOwners",
  workspace_members: "workspace_members",
  workspaceMembers: "workspaceMembers",
});

function canonicalPath(document) {
  const segments = document.ref.path.split("/");
  if (segments.length !== 4 || segments[0] !== "workspaces" || segments[2] !== "members") {
    throw new Error("CANONICAL_MEMBERSHIP_SCOPE_VIOLATION");
  }
  return { pathWorkspaceId: segments[1], pathUid: segments[3] };
}

export function createFirestoreReadOnlyAuthorityStore(firestore) {
  if (!firestore) throw new Error("FIRESTORE_REQUIRED");
  return Object.freeze({
    async listPage(scope, { cursor = null, limit }) {
      if (!AUTHORITY_SCOPES.includes(scope)) throw new Error("UNAPPROVED_AUTHORITY_SCOPE");
      let query = scope === "canonicalMemberships"
        ? firestore.collectionGroup("members")
        : firestore.collection(SCOPE_COLLECTIONS[scope]);
      query = query.orderBy(FieldPath.documentId()).limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const documents = snapshot.docs.map((document) => {
        if (scope === "canonicalMemberships") {
          return { ...canonicalPath(document), data: document.data() };
        }
        return { pathUid: document.id, data: document.data() };
      });
      const nextCursor = snapshot.docs.at(-1) || null;
      return Object.freeze({
        documents,
        nextCursor,
        nextCursorToken: nextCursor?.ref.path || "",
      });
    },
  });
}
