import { isValidDocumentId } from "../authz/resolverUtils.js";
import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

export interface StudentEnrollmentRepository {
  listForStudent(
    workspaceId: string,
    studentId: string,
  ): Promise<readonly AuthorityDocumentSnapshot[]>;
}

// This is a local, injected canonical repository. It creates no singleton and
// never falls back to client roster data or legacy display-name fields.
export function createStudentEnrollmentRepository(
  transaction: TrustedTransaction,
): StudentEnrollmentRepository {
  return Object.freeze({
    listForStudent(workspaceId: string, studentId: string) {
      if (!isValidDocumentId(workspaceId) || !isValidDocumentId(studentId)) {
        return Promise.resolve(Object.freeze([]));
      }
      return transaction.queryEqual(
        ["workspaces", workspaceId, "studentEnrollments"],
        "studentId",
        studentId,
      );
    },
  });
}
