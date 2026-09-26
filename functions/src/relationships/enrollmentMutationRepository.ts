import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

export interface EnrollmentMutationRepository {
  createEnrollment(workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>): void;
  updateEnrollment(workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>): void;
}

// The canonical enrollment document identity is its studentId; no generic path writer is exposed.
export function createEnrollmentMutationRepository(transaction: TrustedTransaction): EnrollmentMutationRepository {
  return Object.freeze({
    createEnrollment: (workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>) => transaction.create(["workspaces", workspaceId, "studentEnrollments", studentId], data),
    updateEnrollment: (workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>) => transaction.update(["workspaces", workspaceId, "studentEnrollments", studentId], data),
  });
}
