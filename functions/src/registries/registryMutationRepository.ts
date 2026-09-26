import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

export interface RegistryMutationRepository {
  createStudent(workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>): void;
  updateStudent(workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>): void;
  createClass(workspaceId: string, classId: string, data: Readonly<Record<string, unknown>>): void;
  updateClass(workspaceId: string, classId: string, data: Readonly<Record<string, unknown>>): void;
  createSubject(workspaceId: string, subjectId: string, data: Readonly<Record<string, unknown>>): void;
  updateSubject(workspaceId: string, subjectId: string, data: Readonly<Record<string, unknown>>): void;
}

// Deliberately narrow: mutation services cannot write arbitrary registry paths.
export function createRegistryMutationRepository(transaction: TrustedTransaction): RegistryMutationRepository {
  return Object.freeze({
    createStudent: (workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>) => transaction.create(["workspaces", workspaceId, "studentRegistry", studentId], data),
    updateStudent: (workspaceId: string, studentId: string, data: Readonly<Record<string, unknown>>) => transaction.update(["workspaces", workspaceId, "studentRegistry", studentId], data),
    createClass: (workspaceId: string, classId: string, data: Readonly<Record<string, unknown>>) => transaction.create(["workspaces", workspaceId, "classRegistry", classId], data),
    updateClass: (workspaceId: string, classId: string, data: Readonly<Record<string, unknown>>) => transaction.update(["workspaces", workspaceId, "classRegistry", classId], data),
    createSubject: (workspaceId: string, subjectId: string, data: Readonly<Record<string, unknown>>) => transaction.create(["workspaces", workspaceId, "subjectRegistry", subjectId], data),
    updateSubject: (workspaceId: string, subjectId: string, data: Readonly<Record<string, unknown>>) => transaction.update(["workspaces", workspaceId, "subjectRegistry", subjectId], data),
  });
}
