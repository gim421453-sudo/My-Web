import { isValidDocumentId } from "../authz/resolverUtils.js";
import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

export interface TeacherAssignmentRepository {
  listForTeacher(
    workspaceId: string,
    teacherUid: string,
  ): Promise<readonly AuthorityDocumentSnapshot[]>;
}

// The transaction is injected by a caller. This factory performs no Firebase
// initialization and has no production default; it only targets the canonical
// nested collection when a trusted local transaction is supplied.
export function createTeacherAssignmentRepository(
  transaction: TrustedTransaction,
): TeacherAssignmentRepository {
  return Object.freeze({
    listForTeacher(workspaceId: string, teacherUid: string) {
      if (!isValidDocumentId(workspaceId) || !isValidDocumentId(teacherUid)) {
        return Promise.resolve(Object.freeze([]));
      }
      return transaction.queryEqual(
        ["workspaces", workspaceId, "teacherAssignments"],
        "teacherUid",
        teacherUid,
      );
    },
  });
}
